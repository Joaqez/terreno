import { signOut } from 'firebase/auth';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, GhostButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, spacing } from '../theme';
import { auth } from '../lib/firebase';
import { useTerrenoStore } from '../lib/store';

export default function ResumenDiaScreen() {
  const { tiendas, visitas, vendedor } = useTerrenoStore();

  const minimas = tiendas.filter((t) => t.esMinima);
  const visitadasIds = new Set(visitas.map((v) => v.tiendaId));
  const visitadas = minimas.filter((t) => visitadasIds.has(t.id)).length;
  const metaDelDia = vendedor.minimoDiario > 0 ? vendedor.minimoDiario : minimas.length;
  const ventas = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'venta').length;
  const mantenciones = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'mantencion').length;
  const gestiones = visitas.filter((v) => v.modo === 'rapida').length;
  const pendientes = minimas.filter((t) => !visitadasIds.has(t.id));

  return (
    <Screen>
      {/* Todo el contenido va dentro de este único FlatList (con header/footer)
          en vez de tener texto suelto después de la lista — así toda la
          pantalla tiene scroll, no solo las filas de "Visitas del día". Con
          131 tiendas reales, el bloque de "Sin visitar" puede ser larguísimo
          y sin esto el botón de "Cerrar sesión" quedaba inalcanzable. */}
      <FlatList
        data={visitas}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => {
          const tienda = tiendas.find((t) => t.id === item.tiendaId);
          return (
            <View style={styles.visitRow}>
              <Text style={styles.visitTxt}>{tienda?.nombre}</Text>
              {item.modo === 'rapida' ? (
                <Badge tone="neutral">Gestión rápida</Badge>
              ) : item.tipo === 'venta' ? (
                <Badge tone="accent">{`Venta${item.numeroFactura ? ' · N° ' + item.numeroFactura : ''}`}</Badge>
              ) : (
                <Badge tone="neutral">Mantención</Badge>
              )}
            </View>
          );
        }}
        ListHeaderComponent={
          <>
            <Title>Resumen del día</Title>
            <Subtitle>
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Subtitle>

            <View style={styles.statGrid}>
              <Stat num={`${visitadas}/${metaDelDia}`} lbl="Tiendas mínimas" />
              <Stat num={String(ventas)} lbl="Ventas" />
              <Stat num={String(mantenciones)} lbl="Mantenciones" />
              <Stat num={String(gestiones)} lbl="Gestiones rápidas" />
            </View>

            <Text style={styles.sectionLabel}>Visitas del día</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aún no registras visitas hoy.</Text>}
        ListFooterComponent={
          <>
            {pendientes.length > 0 && (
              <Text style={styles.pendientes}>Sin visitar: {pendientes.map((t) => t.nombre).join(', ')}</Text>
            )}
            <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
              <GhostButton title="Cerrar sesión" onPress={() => signOut(auth)} />
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </Screen>
  );
}

function Stat({ num, lbl }: { num: string; lbl: string }) {
  return (
    <Card style={{ width: '48%', marginBottom: spacing.sm }}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLbl}>{lbl}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statNum: { fontSize: 21, fontWeight: '700', color: colors.ink },
  statLbl: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.lg, marginBottom: spacing.sm },
  visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  visitTxt: { fontSize: 13.5, color: colors.ink },
  empty: { fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', paddingVertical: spacing.lg },
  pendientes: { marginTop: spacing.md, fontSize: 12.5, color: colors.amber, borderWidth: 1, borderColor: colors.amber, borderRadius: 12, padding: spacing.md },
});
