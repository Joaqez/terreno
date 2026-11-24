import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Observaciones'>;

/**
 * Último paso: notas opcionales y un resumen de la visita antes de guardarla
 * (2026-11-23). El resumen existe sobre todo por el pedido sugerido: viene
 * precargado y sin esto se podía finalizar un pedido grande sin revisarlo.
 */
export default function ObservacionesScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, borrador, finalizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [obs, setObs] = useState('');
  const [verProductos, setVerProductos] = useState(false);

  const b = borrador?.tiendaId === tiendaId ? borrador : null;
  const pedido = b?.tipo === 'venta' ? (b.pedido ?? []) : [];
  const unidades = pedido.reduce((n, i) => n + i.cantidad, 0);
  const conNo = (b?.checklist ?? []).filter((i) => i.respuesta === 'no');

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Title>Revisa y finaliza</Title>
        <Subtitle>Revisa que todo esté bien antes de guardar la visita.</Subtitle>

        {b ? (
          <View style={styles.resumen}>
            <Fila k="Hablaste con" v={b.jefeTiendaNombre ?? 'No indicado'} />
            {b.inventario ? (
              <Fila
                k="En tienda"
                v={`Exhibidor ${b.inventario.exhibidor.length} · Bodega ${
                  b.inventario.bodegaRevisada ? b.inventario.bodega.length : 'no revisada'
                }`}
              />
            ) : null}
            <Fila
              k="Pedido"
              v={b.tipo === 'venta' ? `${pedido.length} productos · ${unidades} unidades` : 'Sin pedido'}
              destacado={b.tipo === 'venta'}
            />
            {pedido.length ? (
              <Pressable onPress={() => setVerProductos((v) => !v)} style={styles.verProductos}>
                <Text style={styles.verProductosTexto}>{verProductos ? 'Ocultar productos' : 'Ver productos del pedido'}</Text>
              </Pressable>
            ) : null}
            {verProductos
              ? pedido.map((i) => (
                  <View key={i.productoId} style={styles.itemPedido}>
                    <Text style={styles.itemNombre}>{i.nombre}</Text>
                    <Text style={styles.itemCantidad}>{i.cantidad}</Text>
                  </View>
                ))
              : null}
            {b.checklist?.length ? (
              <Fila
                k="Checklist"
                v={conNo.length ? `${conNo.length} con problema` : 'Todo bien'}
                tono={conNo.length ? 'danger' : undefined}
              />
            ) : null}
            <View style={styles.fotos}>
              {b.fotoAntesUrl ? <Image source={{ uri: b.fotoAntesUrl }} style={styles.foto} /> : null}
              {b.fotoDespuesUrl ? <Image source={{ uri: b.fotoDespuesUrl }} style={styles.foto} /> : null}
            </View>
            <Text style={styles.ayuda}>Si algo está mal, vuelve atrás para corregirlo.</Text>
          </View>
        ) : null}

        <Field
          label="Observaciones (opcional)"
          placeholder="Ej: El encargado pidió más stock para la próxima semana."
          value={obs}
          onChangeText={setObs}
          multiline
          style={{ minHeight: 110 }}
        />
      </ScrollView>

      <View style={styles.pie}>
        <PrimaryButton
          title="Finalizar visita"
          onPress={() => {
            finalizarBorrador(obs.trim() || undefined);
            navigation.navigate('VisitaRegistrada', { tiendaId });
          }}
        />
      </View>
    </Screen>
  );
}

function Fila({ k, v, destacado, tono }: { k: string; v: string; destacado?: boolean; tono?: 'danger' }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaK}>{k}</Text>
      <Text style={[styles.filaV, destacado && styles.filaVDestacado, tono === 'danger' && { color: colors.danger }]}>
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaK: { fontSize: 15, color: colors.inkSoft },
  filaV: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
  filaVDestacado: { color: colors.accent, fontWeight: '700' },
  verProductos: { minHeight: 44, justifyContent: 'center' },
  verProductosTexto: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  itemPedido: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 4 },
  itemNombre: { fontSize: 14, color: colors.ink, flex: 1 },
  itemCantidad: { fontSize: 14, fontWeight: '700', color: colors.ink },
  fotos: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  foto: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.sm, backgroundColor: colors.border },
  ayuda: { fontSize: 13.5, color: colors.inkSoft, marginTop: spacing.md },
  pie: { paddingTop: spacing.md },
});
