import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { InventarioTienda, ItemInventario } from '../types';

/** Exhibidor y bodega de una visita (o el último inventario de una tienda), para el panel. */
export default function InventarioResumen({ inventario, pie }: { inventario: InventarioTienda; pie?: string }) {
  return (
    <View style={styles.card}>
      <Lista titulo="Exhibidor" items={inventario.exhibidor} vacio="Vacío" />
      <View style={styles.separador} />
      {inventario.bodegaRevisada ? (
        <Lista titulo="Bodega" items={inventario.bodega} vacio="Vacía" />
      ) : (
        <>
          <Text style={styles.titulo}>Bodega</Text>
          <Text style={styles.nota}>No se pudo revisar</Text>
        </>
      )}
      {pie ? <Text style={styles.pie}>{pie}</Text> : null}
    </View>
  );
}

function Lista({ titulo, items, vacio }: { titulo: string; items: ItemInventario[]; vacio: string }) {
  return (
    <>
      <Text style={styles.titulo}>
        {titulo} ({items.length})
      </Text>
      {items.length ? (
        items.map((i) => (
          <Text key={i.productoId} style={styles.item}>
            • {i.nombre}
          </Text>
        ))
      ) : (
        <Text style={styles.nota}>{vacio}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  titulo: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  item: { fontSize: 12.5, color: colors.ink, lineHeight: 19 },
  nota: { fontSize: 12.5, color: colors.inkSoft, fontStyle: 'italic' },
  separador: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  pie: { fontSize: 11.5, color: colors.inkFaint, marginTop: spacing.md },
});
