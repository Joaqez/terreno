import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CierreDia'>;

export default function CierreDiaScreen({ navigation }: Props) {
  const { jornada, finalizarJornada } = useTerrenoStore();
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida();
  const [km, setKm] = useState('');

  const kmInicio = jornada?.kmInicio?.km ?? 0;
  const kmFinalNum = parseInt(km, 10);
  const recorridos = !isNaN(kmFinalNum) ? Math.max(kmFinalNum - kmInicio, 0) : null;
  const puedeFinalizar = !!fotoUrl && !subiendo && recorridos !== null && !isNaN(kmFinalNum);

  return (
    <Screen>
      <Title>Cierre de día</Title>
      <Subtitle>Registra el kilometraje final de tu vehículo.</Subtitle>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.k}>Kilometraje inicial</Text>
          <Text style={styles.v}>{kmInicio} km</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Km recorridos hoy</Text>
          <Text style={styles.v}>{recorridos != null ? `${recorridos} km` : '—'}</Text>
        </View>
      </View>

      <Pressable
        style={styles.capture}
        onPress={() => capturar(`jornadas/${jornada?.id}/km-final-${Date.now()}.jpg`)}
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.captureText}>Toca para tomar la fotografía{'\n'}del odómetro final</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Field label="Kilometraje final (km)" placeholder="Ej: 48261" keyboardType="numeric" value={km} onChangeText={setKm} />

      <PrimaryButton
        title="Finalizar día"
        disabled={!puedeFinalizar}
        loading={subiendo}
        onPress={() => {
          finalizarJornada(kmFinalNum, fotoUrl!);
          navigation.reset({ index: 0, routes: [{ name: 'ResumenDia' }] });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { color: colors.inkSoft, fontSize: 13.5 },
  v: { fontWeight: '600', fontSize: 13.5, color: colors.ink },
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
