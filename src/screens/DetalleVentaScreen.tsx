import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { TipoVenta } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleVenta'>;

export default function DetalleVentaScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [tipoVenta, setTipoVenta] = useState<TipoVenta | null>(null);
  const [factura, setFactura] = useState('');

  const puedeContinuar = !!tipoVenta && factura.length > 0;

  return (
    <Screen>
      <Title>Detalle de la venta</Title>
      <Subtitle>{tienda?.nombre}</Subtitle>

      <Text style={styles.label}>Tipo de venta</Text>
      <View style={styles.pillRow}>
        <Pressable
          style={[styles.pill, tipoVenta === 'nueva' && styles.pillSelected]}
          onPress={() => setTipoVenta('nueva')}
        >
          <Text style={[styles.pillText, tipoVenta === 'nueva' && styles.pillTextSelected]}>Venta nueva</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, tipoVenta === 'acordada' && styles.pillSelected]}
          onPress={() => setTipoVenta('acordada')}
        >
          <Text style={[styles.pillText, tipoVenta === 'acordada' && styles.pillTextSelected]}>Acordada previamente</Text>
        </Pressable>
      </View>

      <Field label="N° de factura" placeholder="Ej: 004821" keyboardType="numeric" value={factura} onChangeText={setFactura} />

      <PrimaryButton
        title="Continuar"
        disabled={!puedeContinuar}
        onPress={() => {
          actualizarBorrador({ tipoVenta: tipoVenta!, numeroFactura: factura });
          navigation.navigate('FotoDespues', { tiendaId, tipo: 'venta' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft, marginBottom: spacing.sm, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pill: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  pillSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillText: { fontWeight: '600', fontSize: 13, color: colors.inkSoft },
  pillTextSelected: { color: colors.accent },
});
