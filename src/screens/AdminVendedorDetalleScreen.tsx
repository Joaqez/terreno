import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVendedorDetalle'>;

export default function AdminVendedorDetalleScreen({ navigation, route }: Props) {
  const { vendedorId } = route.params;
  const { vendedoresDisponibles, tiendas, actualizarVendedor } = useTerrenoStore();
  const vendedor = vendedoresDisponibles.find((v) => v.id === vendedorId);
  const tiendasAsignadas = tiendas.filter((t) => t.vendedorAsignadoId === vendedorId).length;
  const [minimoTexto, setMinimoTexto] = useState(String(vendedor?.minimoDiario ?? 0));

  if (!vendedor) {
    return (
      <Screen>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
        <Title>Vendedor no encontrado</Title>
      </Screen>
    );
  }

  function guardarMinimo() {
    const numero = parseInt(minimoTexto, 10);
    actualizarVendedor(vendedorId, { minimoDiario: isNaN(numero) ? 0 : Math.max(numero, 0) });
  }

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>{vendedor.nombre}</Title>
      <Subtitle>{vendedor.email}</Subtitle>

      <Text style={styles.etiqueta}>Rol</Text>
      <View style={styles.filaBotones}>
        <Pressable
          style={[styles.pill, vendedor.rol === 'vendedor' && styles.pillActiva]}
          onPress={() => actualizarVendedor(vendedorId, { rol: 'vendedor' })}
        >
          <Text style={[styles.pillTexto, vendedor.rol === 'vendedor' && styles.pillTextoActivo]}>Vendedor</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, vendedor.rol === 'supervisor' && styles.pillActiva]}
          onPress={() => actualizarVendedor(vendedorId, { rol: 'supervisor' })}
        >
          <Text style={[styles.pillTexto, vendedor.rol === 'supervisor' && styles.pillTextoActivo]}>Supervisor</Text>
        </Pressable>
      </View>

      <Text style={styles.etiqueta}>Tiendas asignadas</Text>
      <Text style={styles.info}>{tiendasAsignadas} (se asignan desde "Administración de tiendas")</Text>

      <Text style={styles.etiqueta}>Meta de tiendas mínimas por día</Text>
      <Field
        label="Meta diaria"
        placeholder="0 = sin fijar (usa el total asignado)"
        keyboardType="numeric"
        value={minimoTexto}
        onChangeText={setMinimoTexto}
        onBlur={guardarMinimo}
        hint="0 significa que la meta será el total de tiendas asignadas."
      />
      <PrimaryButton title="Guardar meta" onPress={guardarMinimo} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  filaBotones: { flexDirection: 'row', gap: spacing.sm },
  pill: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  pillActiva: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillTexto: { fontSize: 13.5, fontWeight: '600', color: colors.inkSoft },
  pillTextoActivo: { color: colors.accentInk },
  info: { fontSize: 13, color: colors.ink },
});
