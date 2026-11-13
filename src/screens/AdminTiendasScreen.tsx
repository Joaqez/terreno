import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Field, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { Tienda } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminTiendas'>;

type Filtro = 'todas' | 'santiago' | 'region';

export default function AdminTiendasScreen({ navigation }: Props) {
  const { tiendas, vendedoresDisponibles, cargarVendedores } = useTerrenoStore();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  useEffect(() => {
    cargarVendedores();
  }, [cargarVendedores]);

  const nombreVendedor = (id?: string) => vendedoresDisponibles.find((v) => v.id === id)?.nombre;

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tiendas
      .filter((t) => (filtro === 'todas' ? true : filtro === 'santiago' ? t.esMinima : !t.esMinima))
      .filter((t) => !q || t.nombre.toLowerCase().includes(q) || t.comuna.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tiendas, filtro, busqueda]);

  function renderTienda(t: Tienda) {
    const asignado = nombreVendedor(t.vendedorAsignadoId);
    return (
      <Pressable style={styles.fila} onPress={() => navigation.navigate('AdminTiendaDetalle', { tiendaId: t.id })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{t.nombre}</Text>
          <Text style={styles.comuna}>{t.comuna}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge tone={t.esMinima ? 'accent' : 'neutral'}>{t.esMinima ? 'Santiago' : 'Región'}</Badge>
          <Text style={styles.asignado}>{asignado ?? 'Sin asignar'}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>Administración de tiendas</Title>
      <Subtitle>{filtradas.length} de {tiendas.length} tiendas</Subtitle>

      <View style={{ marginBottom: spacing.md }}>
        <TextLink title="Ver vendedores →" onPress={() => navigation.navigate('AdminVendedores')} />
      </View>

      <Field placeholder="Buscar por nombre o comuna" value={busqueda} onChangeText={setBusqueda} label="Buscar" />

      <View style={styles.filtros}>
        {(['todas', 'santiago', 'region'] as Filtro[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.chip, filtro === f && styles.chipActivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.chipTexto, filtro === f && styles.chipTextoActivo]}>
              {f === 'todas' ? 'Todas' : f === 'santiago' ? 'Santiago' : 'Región'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => renderTienda(item)}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  chipTextoActivo: { color: colors.accentInk },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  nombre: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  comuna: { fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  asignado: { fontSize: 11, color: colors.inkFaint },
});
