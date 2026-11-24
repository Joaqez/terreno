import { useRoute } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { esPasoVisita, pasosVisita } from '../lib/pasosVisita';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

/**
 * Título de la barra de arriba en los pasos de una visita (2026-11-23):
 * nombre de la tienda + "Paso X de N" con una barra de segmentos. Así el
 * vendedor siempre sabe en qué tienda está y cuánto le falta.
 */
export default function ProgresoVisita() {
  const route = useRoute();
  const { borrador, tiendas, preguntasMantencion } = useTerrenoStore();
  const nombre = route.name as keyof RootStackParamList;
  const tiendaId = (route.params as { tiendaId?: string } | undefined)?.tiendaId ?? borrador?.tiendaId;
  const tienda = tiendas.find((t) => t.id === tiendaId);

  const pasos = pasosVisita(borrador?.tipo, preguntasMantencion.some((p) => p.activa));
  const actual = esPasoVisita(nombre) ? pasos.indexOf(nombre) : -1;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.tienda} numberOfLines={1}>
        {tienda?.nombre ?? 'Visita'}
      </Text>
      {actual >= 0 ? (
        <View style={styles.fila}>
          <View style={styles.segmentos}>
            {pasos.map((p, i) => (
              <View key={p} style={[styles.segmento, i <= actual && styles.segmentoHecho]} />
            ))}
          </View>
          <Text style={styles.texto}>
            Paso {actual + 1} de {pasos.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', maxWidth: 230 },
  tienda: { fontSize: 15, fontWeight: '700', color: colors.ink },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  segmentos: { flexDirection: 'row', gap: 3 },
  segmento: { width: 12, height: 5, borderRadius: 3, backgroundColor: colors.border },
  segmentoHecho: { backgroundColor: colors.accent },
  texto: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '600' },
});
