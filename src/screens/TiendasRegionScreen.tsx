import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Field, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { Tienda } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TiendasRegion'>;

/**
 * Tiendas de región: no se visitan en persona, se les hace seguimiento por
 * teléfono/WhatsApp/correo. Distintas de las que un vendedor agrega sobre la
 * marcha ("Nueva visita") aunque ambas compartan `esMinima: false` — por eso
 * se filtra también por `!agregadaPorVendedor`.
 */
export default function TiendasRegionScreen({ navigation }: Props) {
  const { tiendas, visitas, jornada } = useTerrenoStore();
  const [busqueda, setBusqueda] = useState('');

  const gestionadasIds = useMemo(
    () => new Set(visitas.filter((v) => v.modo === 'rapida').map((v) => v.tiendaId)),
    [visitas]
  );

  const tiendasRegion = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tiendas
      .filter((t) => !t.esMinima && !t.agregadaPorVendedor)
      .filter((t) => !q || t.nombre.toLowerCase().includes(q) || t.comuna.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tiendas, busqueda]);

  function renderTienda(t: Tienda) {
    const gestionada = gestionadasIds.has(t.id);
    const visita = visitas.find((v) => v.tiendaId === t.id && v.modo === 'rapida');
    return (
      <View style={styles.fila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{t.nombre}</Text>
          <Text style={styles.comuna}>{t.comuna}</Text>
          {gestionada ? <Text style={styles.motivo}>“{visita?.motivoGestionRapida}”</Text> : null}
        </View>
        {gestionada ? (
          <Badge tone="done">Gestionada</Badge>
        ) : (
          <Pressable
            style={styles.btnListo}
            onPress={() => navigation.navigate('ObservacionRegion', { tiendaId: t.id })}
          >
            <Text style={styles.btnListoText}>Listo</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>Tiendas de región</Title>
      <Subtitle>
        Seguimiento remoto (teléfono, WhatsApp, correo) — no requieren visita presencial.{' '}
        {gestionadasIds.size} de {tiendasRegion.length} gestionadas hoy.
      </Subtitle>

      <Field placeholder="Buscar por nombre o comuna" value={busqueda} onChangeText={setBusqueda} label="Buscar" />

      <FlatList
        data={tiendasRegion}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => renderTienda(item)}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  motivo: { fontSize: 12, color: colors.inkFaint, fontStyle: 'italic', marginTop: 4 },
  btnListo: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 16 },
  btnListoText: { color: colors.accentInk, fontWeight: '700', fontSize: 13 },
});
