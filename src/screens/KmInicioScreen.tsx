import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { takePhoto } from '../lib/camera';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'KmInicio'>;

export default function KmInicioScreen({ navigation }: Props) {
  const iniciarJornada = useTerrenoStore((s) => s.iniciarJornada);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [km, setKm] = useState('');

  const puedeConfirmar = !!fotoUri && km.length > 0;

  return (
    <Screen>
      <Title>Kilometraje inicial</Title>
      <Subtitle>Registra el odómetro de tu vehículo antes de salir a terreno.</Subtitle>

      <Pressable
        style={styles.capture}
        onPress={async () => {
          const uri = await takePhoto();
          if (uri) setFotoUri(uri);
        }}
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.captureText}>Toca para tomar la fotografía{'\n'}del odómetro</Text>
        )}
      </Pressable>

      <Field
        label="Kilometraje actual (km)"
        placeholder="Ej: 48213"
        keyboardType="numeric"
        value={km}
        onChangeText={setKm}
      />

      <PrimaryButton
        title="Confirmar y comenzar ruta"
        disabled={!puedeConfirmar}
        onPress={() => {
          iniciarJornada(parseInt(km, 10), fotoUri!);
          navigation.reset({ index: 0, routes: [{ name: 'Ruta' }] });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  capture: {
    aspectRatio: 4 / 3,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  captureText: { textAlign: 'center', color: colors.inkSoft, fontWeight: '600' },
  preview: { width: '100%', height: '100%' },
});
