import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { avisar } from '../lib/avisos';
import { nombreVisible, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVendedorDetalle'>;

export default function AdminVendedorDetalleScreen({ navigation, route }: Props) {
  const { vendedorId } = route.params;
  const { vendedoresDisponibles, tiendas, actualizarVendedor } = useTerrenoStore();
  const vendedor = vendedoresDisponibles.find((v) => v.id === vendedorId);
  const tiendasAsignadas = tiendas.filter((t) => t.vendedorAsignadoId === vendedorId).length;
  const [minimoTexto, setMinimoTexto] = useState(String(vendedor?.minimoDiario ?? 0));
  const [nombreTexto, setNombreTexto] = useState(vendedor?.nombre.includes('@') ? '' : (vendedor?.nombre ?? ''));

  if (!vendedor) {
    return (
      <Screen>
        <Title>Vendedor no encontrado</Title>
      </Screen>
    );
  }

  function guardarMinimo() {
    const numero = parseInt(minimoTexto, 10);
    const minimo = isNaN(numero) ? 0 : Math.max(numero, 0);
    if (minimo === vendedor!.minimoDiario) return;
    actualizarVendedor(vendedorId, { minimoDiario: minimo });
    avisar('Meta guardada');
  }

  function guardarNombre() {
    const nombre = nombreTexto.trim();
    if (!nombre || nombre === vendedor!.nombre) return;
    actualizarVendedor(vendedorId, { nombre });
    avisar('Nombre guardado');
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Title>{nombreVisible(vendedor)}</Title>
      <Subtitle>{vendedor.email}</Subtitle>

      {/* Algunas cuentas tienen el correo como nombre; aquí se corrige. */}
      <Field
        label="Nombre"
        placeholder="Ej: Benjamín"
        value={nombreTexto}
        onChangeText={setNombreTexto}
        onBlur={guardarNombre}
        onSubmitEditing={guardarNombre}
        hint={vendedor.nombre.includes('@') ? 'Esta cuenta todavía no tiene nombre: se muestra la parte del correo.' : undefined}
      />

      <Text style={styles.etiqueta}>Rol</Text>
      <View style={styles.filaBotones}>
        <Pressable
          style={[styles.pill, vendedor.rol === 'vendedor' && styles.pillActiva]}
          onPress={() => {
            actualizarVendedor(vendedorId, { rol: 'vendedor' });
            avisar('Rol: vendedor');
          }}
        >
          <Text style={[styles.pillTexto, vendedor.rol === 'vendedor' && styles.pillTextoActivo]}>Vendedor</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, vendedor.rol === 'supervisor' && styles.pillActiva]}
          onPress={() => {
            actualizarVendedor(vendedorId, { rol: 'supervisor' });
            avisar('Rol: supervisor');
          }}
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontSize: 13.5,
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
  pillTexto: { fontSize: 15, fontWeight: '600', color: colors.inkSoft },
  pillTextoActivo: { color: colors.accentInk },
  info: { fontSize: 14.5, color: colors.ink },
});
