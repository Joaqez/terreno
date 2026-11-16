import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './ui';
import { colors, radius, spacing } from '../theme';
import { Visita } from '../types';

/** YYYY-MM-DD en hora local (horaInicio se guarda en UTC). */
export function claveFechaLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function etiquetaVisita(v: Visita): { texto: string; tono: 'done' | 'accent' | 'pending' } {
  if (v.modo === 'rapida') return { texto: 'Gestionada', tono: 'pending' };
  if (v.tipo === 'venta') return { texto: 'Venta', tono: 'accent' };
  return { texto: 'Mantención', tono: 'done' };
}

export default function VisitaFila({
  visita,
  titulo,
  detalle,
  onPress,
}: {
  visita: Visita;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  const etiqueta = etiquetaVisita(visita);
  const nota = visita.modo === 'rapida' ? visita.motivoGestionRapida : visita.observaciones;
  const miniatura = visita.fotoDespuesUrl ?? visita.fotoAntesUrl;
  return (
    <Pressable style={styles.fila} onPress={onPress}>
      {miniatura ? (
        <Image source={{ uri: miniatura }} style={styles.miniatura} />
      ) : (
        <View style={[styles.miniatura, styles.sinFoto]}>
          <Text style={styles.sinFotoTexto}>Sin foto</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={styles.detalle} numberOfLines={1}>
          {detalle}
        </Text>
        {nota ? (
          <Text style={styles.nota} numberOfLines={2}>
            {nota}
          </Text>
        ) : null}
      </View>
      <Badge tone={etiqueta.tono}>{etiqueta.texto}</Badge>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  miniatura: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.border },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  sinFotoTexto: { fontSize: 10, color: colors.inkFaint },
  titulo: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  detalle: { fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  nota: { fontSize: 12, color: colors.inkFaint, marginTop: 3 },
});
