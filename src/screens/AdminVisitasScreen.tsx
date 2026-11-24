import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { Field, Screen, Subtitle, TextLink, Title } from '../components/ui';
import VisitaFila, { claveFechaLocal, formatearFecha, formatearHora } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { nombreVisible, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { Visita } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVisitas'>;

export default function AdminVisitasScreen({ navigation }: Props) {
  const { tiendas, visitasAdmin, cargandoVisitasAdmin, cargarVisitasAdmin, vendedoresDisponibles, cargarVendedores } =
    useTerrenoStore();
  const [vendedorFiltro, setVendedorFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarVisitasAdmin();
    cargarVendedores();
  }, [cargarVisitasAdmin, cargarVendedores]);

  const nombreTienda = (id: string) => tiendas.find((t) => t.id === id)?.nombre ?? 'Tienda eliminada';
  const nombreVendedor = (id: string) => nombreVisible(vendedoresDisponibles.find((v) => v.id === id));

  const vendedoresConVisitas = useMemo(
    () =>
      vendedoresDisponibles.filter((v) =>
        visitasAdmin.some((vi) => vi.vendedorId === v.id && !vi.tiendaId.endsWith('-prueba'))
      ),
    [vendedoresDisponibles, visitasAdmin]
  );

  const secciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = visitasAdmin
      // Las tiendas de prueba (copec-prueba, shell-prueba, aramco-prueba) no
      // ensucian el listado; sus visitas se ven igual desde el detalle de la tienda.
      .filter((v) => !v.tiendaId.endsWith('-prueba'))
      .filter((v) => !vendedorFiltro || v.vendedorId === vendedorFiltro)
      .filter((v) => !q || nombreTienda(v.tiendaId).toLowerCase().includes(q));
    const porFecha = new Map<string, Visita[]>();
    for (const v of filtradas) {
      const clave = claveFechaLocal(v.horaInicio);
      porFecha.set(clave, [...(porFecha.get(clave) ?? []), v]);
    }
    return [...porFecha.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, data]) => ({ titulo: formatearFecha(data[0].horaInicio), data }));
  }, [visitasAdmin, vendedorFiltro, busqueda, tiendas]);

  const total = secciones.reduce((n, s) => n + s.data.length, 0);

  return (
    <Screen>
      <Title>Visitas registradas</Title>
      <Subtitle>
        {cargandoVisitasAdmin ? 'Cargando…' : `${total} visitas`}
      </Subtitle>

      <Field placeholder="Buscar por tienda" value={busqueda} onChangeText={setBusqueda} label="Buscar" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
        <View style={styles.filtros}>
          <Chip texto="Todos" activo={!vendedorFiltro} onPress={() => setVendedorFiltro(null)} />
          {vendedoresConVisitas.map((v) => (
            <Chip key={v.id} texto={nombreVisible(v)} activo={vendedorFiltro === v.id} onPress={() => setVendedorFiltro(v.id)} />
          ))}
        </View>
      </ScrollView>

      {cargandoVisitasAdmin && !visitasAdmin.length ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(v) => v.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.seccion}>
              {section.titulo} · {section.data.length}
            </Text>
          )}
          renderItem={({ item }) => (
            <VisitaFila
              visita={item}
              titulo={nombreTienda(item.tiendaId)}
              // "por": sin eso "· Santiago" se confundía con la ciudad.
              detalle={`${formatearHora(item.horaInicio)} · por ${nombreVendedor(item.vendedorId)}`}
              onPress={() => navigation.navigate('AdminVisitaDetalle', { visitaId: item.id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.vacio}>No hay visitas registradas.</Text>}
          stickySectionHeadersEnabled
          refreshing={cargandoVisitasAdmin}
          onRefresh={cargarVisitasAdmin}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Screen>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // flexShrink 0: en web el ScrollView se encogía hasta dejar los filtros
  // cortados (solo se veía el borde de arriba).
  filtrosScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.md },
  filtros: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  chipTextoActivo: { color: colors.accentInk },
  seccion: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  vacio: { color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
});
