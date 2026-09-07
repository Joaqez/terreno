import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { takePhoto } from '../lib/camera';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FotoDespues'>;

export default function FotoDespuesScreen({ navigation, route }: Props) {
  const { tiendaId, tipo } = route.params;
  const { tiendas, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  return (
    <Screen>
      <Title>{tienda?.nombre ?? 'Tienda'}</Title>
      <Subtitle>Foto después de la visita — mismo ángulo, mostrando el resultado final.</Subtitle>

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
          <Text style={styles.captureText}>Fotografía — DESPUÉS</Text>
        )}
      </Pressable>

      <PrimaryButton
        title="Continuar"
        disabled={!fotoUri}
        onPress={() => {
          actualizarBorrador({ fotoDespuesUrl: fotoUri! });
          navigation.navigate('Observaciones', { tiendaId, tipo });
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
