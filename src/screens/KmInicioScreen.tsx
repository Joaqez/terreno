import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { idJornadaDeHoy, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'KmInicio'>;

export default function KmInicioScreen({ navigation }: Props) {
  const iniciarJornada = useTerrenoStore((s) => s.iniciarJornada);
  const vendedorId = useTerrenoStore((s) => s.vendedor.id);
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida();
  const [km, setKm] = useState('');

  const puedeConfirmar = !!fotoUrl && !subiendo && km.length > 0;

  return (
    <Screen>
      <Title>Kilometraje inicial</Title>
      <Subtitle>Registra el odómetro de tu vehículo antes de salir a terreno.</Subtitle>

      <Pressable
        style={styles.capture}
        onPress={() => capturar(`jornadas/${idJornadaDeHoy(vendedorId)}/km-inicio-${Date.now()}.jpg`)}
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.captureText}>Toca para tomar la fotografía{'\n'}del odómetro</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
        loading={subiendo}
        onPress={() => {
          iniciarJornada(parseInt(km, 10), fotoUrl!);
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
  errorText: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
});
