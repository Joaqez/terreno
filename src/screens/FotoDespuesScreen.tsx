import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import CuadroFoto from '../components/CuadroFoto';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FotoDespues'>;

export default function FotoDespuesScreen({ navigation, route }: Props) {
  const { tiendaId, tipo } = route.params;
  const { jornada, borrador, actualizarBorrador } = useTerrenoStore();
  const b = borrador?.tiendaId === tiendaId ? borrador : null;
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida(b?.fotoDespuesUrl);

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Title>Foto de después</Title>
        <Subtitle>Con el resultado final, desde el mismo ángulo que la de antes.</Subtitle>

        {/* La de antes como referencia, para repetir el ángulo (2026-11-23). */}
        {b?.fotoAntesUrl ? (
          <View style={styles.referencia}>
            <Image source={{ uri: b.fotoAntesUrl }} style={styles.referenciaFoto} />
            <Text style={styles.referenciaTexto}>Así estaba antes. Toma la de después desde el mismo lugar.</Text>
          </View>
        ) : null}

        <CuadroFoto
          fotoUri={fotoUri}
          subiendo={subiendo}
          ayuda="El exhibidor ya ordenado y repuesto."
          onPress={() => capturar(`jornadas/${jornada?.id}/visitas/${tiendaId}/despues-${Date.now()}.jpg`)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingTop: spacing.md }}>
        <PrimaryButton
          title="Continuar"
          disabled={!fotoUrl || subiendo}
          loading={subiendo}
          onPress={() => {
            actualizarBorrador({ fotoDespuesUrl: fotoUrl! });
            navigation.navigate('Observaciones', { tiendaId, tipo });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  referencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  referenciaFoto: { width: 96, height: 72, borderRadius: radius.sm, backgroundColor: colors.border },
  referenciaTexto: { flex: 1, fontSize: 14, color: colors.inkSoft, lineHeight: 19 },
  errorText: { color: colors.danger, fontSize: 14.5, marginBottom: spacing.md },
});
