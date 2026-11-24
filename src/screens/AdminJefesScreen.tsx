import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Field, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { cadenaDeTienda } from '../lib/catalogo';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminJefes'>;

type FiltroCadena = 'todas' | 'copec' | 'shell' | 'aramco' | 'otra';
const CADENAS: { valor: FiltroCadena; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'copec', texto: 'Copec' },
  { valor: 'shell', texto: 'Shell' },
  { valor: 'aramco', texto: 'Aramco' },
  { valor: 'otra', texto: 'Otras' },
];

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Todos los jefes de tienda, para encontrar rápido su contacto. */
export default function AdminJefesScreen({ navigation }: Props) {
  const { jefesTienda, tiendas } = useTerrenoStore();
  const [busqueda, setBusqueda] = useState('');
  const [cadena, setCadena] = useState<FiltroCadena>('todas');
  const [verBajas, setVerBajas] = useState(false);

  const tiendaPorId = useMemo(() => new Map(tiendas.map((t) => [t.id, t])), [tiendas]);

  const filtrados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    return jefesTienda
      .filter((j) => j.activo !== verBajas)
      .filter((j) => {
        if (cadena === 'todas') return true;
        const t = tiendaPorId.get(j.tiendaId);
        return t ? cadenaDeTienda(t) === cadena : cadena === 'otra';
      })
      .filter((j) => {
        const t = tiendaPorId.get(j.tiendaId);
        const texto = normalizar(`${j.nombre} ${j.telefono ?? ''} ${j.email ?? ''} ${t?.nombre ?? ''} ${t?.comuna ?? ''}`);
        // El teléfono también se busca solo por dígitos ("92074" encuentra "9 2074 1668").
        const digitos = (j.telefono ?? '').replace(/\D/g, '');
        return palabras.every((w) => texto.includes(w) || (/^\d+$/.test(w) && digitos.includes(w)));
      });
  }, [jefesTienda, tiendaPorId, busqueda, cadena, verBajas]);

  return (
    <Screen>
      <Title>Jefes de tienda</Title>
      <Subtitle>
        {filtrados.length} {verBajas ? 'que ya no trabajan en su tienda' : 'activos'}
      </Subtitle>

      <Field
        label="Buscar"
        placeholder="Nombre, tienda, comuna, teléfono o correo"
        value={busqueda}
        onChangeText={setBusqueda}
        autoCapitalize="none"
      />

      <View style={styles.filtros}>
        {CADENAS.map((c) => (
          <Pressable key={c.valor} style={[styles.chip, cadena === c.valor && styles.chipActivo]} onPress={() => setCadena(c.valor)}>
            <Text style={[styles.chipTexto, cadena === c.valor && styles.chipTextoActivo]}>{c.texto}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.filtros, { marginTop: -spacing.xs }]}>
        <Pressable style={[styles.chip, !verBajas && styles.chipActivo]} onPress={() => setVerBajas(false)}>
          <Text style={[styles.chipTexto, !verBajas && styles.chipTextoActivo]}>Activos</Text>
        </Pressable>
        <Pressable style={[styles.chip, verBajas && styles.chipActivo]} onPress={() => setVerBajas(true)}>
          <Text style={[styles.chipTexto, verBajas && styles.chipTextoActivo]}>Ya no trabajan aquí</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(j) => j.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.vacio}>No hay jefes de tienda que coincidan.</Text>}
        renderItem={({ item: j }) => {
          const t = tiendaPorId.get(j.tiendaId);
          return (
            <Pressable style={styles.fila} onPress={() => navigation.navigate('AdminJefeDetalle', { jefeId: j.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{j.nombre}</Text>
                <Text style={styles.tienda} numberOfLines={1}>
                  {t ? `${t.nombre} · ${t.comuna}` : 'Tienda eliminada'}
                </Text>
                <Text style={styles.contacto} numberOfLines={1}>
                  {[j.telefono, j.email].filter(Boolean).join(' · ') || 'Sin teléfono ni correo'}
                </Text>
              </View>
              {j.origen === 'vendedor' ? <Badge tone="accent">Nuevo</Badge> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  chipTextoActivo: { color: colors.accentInk },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nombre: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  tienda: { fontSize: 14, color: colors.inkSoft, marginTop: 1 },
  contacto: { fontSize: 13.5, color: colors.inkFaint, marginTop: 2 },
  vacio: { color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
});
