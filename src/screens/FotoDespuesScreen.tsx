import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FotoDespues'>;

export default function FotoDespuesScreen({ navigation, route }: Props) {
  const { tiendaId, tipo } = route.params;
  const { tiendas, jornada, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida();

  return (
    <Screen>
      <Title>{tienda?.nombre ?? 'Tienda'}</Title>
      <Subtitle>Foto después de la visita — mismo ángulo, mostrando el resultado final.</Subtitle>

      <Pressable
        style={styles.capture}
        onPress={() => capturar(`jornadas/${jornada?.id}/visitas/${tiendaId}/despues-${Date.now()}.jpg`)}
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.captureText}>Fotografía — DESPUÉS</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton
        title="Continuar"
        disabled={!fotoUrl || subiendo}
        loading={subiendo}
        onPress={() => {
          actualizarBorrador({ fotoDespuesUrl: fotoUrl! });
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
  errorText: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
});
