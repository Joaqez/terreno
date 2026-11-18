import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, Field, PrimaryButton, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { calcularDistanciaKm } from '../lib/distancia';
import { useTerrenoStore } from '../lib/store';
import { useUbicacionActual } from '../lib/useUbicacionActual';
import { RootStackParamList } from '../navigation/types';
import { Tienda } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ruta'>;

export default function RutaScreen({ navigation }: Props) {
  const { tiendas, visitas, jornada, marcarGestionRapida } = useTerrenoStore();
  const { ubicacion: miUbicacion, actualizando, sinPermiso, actualizar } = useUbicacionActual();
  // Re-render cada 30 s para que "hace X min" no quede congelado.
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const [tiendaComoLlegar, setTiendaComoLlegar] = useState<Tienda | null>(null);
  const [errorComoLlegar, setErrorComoLlegar] = useState<string | null>(null);
  const [tiendaRapida, setTiendaRapida] = useState<Tienda | null>(null);
  const [motivoRapida, setMotivoRapida] = useState('');

  const visitadasIds = useMemo(() => new Set(visitas.map((v) => v.tiendaId)), [visitas]);

  // Distancia real en línea recta desde la ubicación actual, si la tienda
  // tiene coordenadas y el navegador dio el permiso; si no, cae de vuelta al
  // `distanciaKm` fijo que tenga guardado (o null si tampoco hay eso).
  function distanciaDe(t: Tienda): number | null {
    if (miUbicacion && t.lat != null && t.lng != null) {
      return calcularDistanciaKm(miUbicacion.lat, miUbicacion.lng, t.lat, t.lng);
    }
    return t.distanciaKm;
  }

  const rutaTiendas = (jornada?.tiendaIds ?? [])
    .map((id) => tiendas.find((t) => t.id === id))
    .filter((t): t is Tienda => !!t);

  const asignadas = rutaTiendas.filter((t) => t.esMinima);
  const creadas = rutaTiendas.filter((t) => !t.esMinima);

  // Orden sugerido simple: pendientes ordenadas por distancia ascendente.
  const pendientesOrdenadas = [...asignadas]
    .filter((t) => !visitadasIds.has(t.id))
    .sort((a, b) => (distanciaDe(a) ?? 0) - (distanciaDe(b) ?? 0));
  const ordenPorTienda = new Map(pendientesOrdenadas.map((t, i) => [t.id, i + 1]));

  // La lista que se muestra debe seguir ese mismo orden — antes se mostraba
  // `asignadas` sin ordenar (el orden en que Firestore las devuelve), así
  // que el número "1, 2, 3..." de cada tarjeta no coincidía con su posición
  // real en la lista. Las ya visitadas van al final, en cualquier orden.
  const asignadasOrdenadas = [...pendientesOrdenadas, ...asignadas.filter((t) => visitadasIds.has(t.id))];

  function textoUbicacion() {
    if (sinPermiso) return '📍 Sin permiso de ubicación: las distancias no son reales.';
    if (!miUbicacion) return '📍 Buscando tu ubicación…';
    const minutos = Math.max(0, Math.floor((ahora - miUbicacion.tomadaEn) / 60000));
    const hace = minutos === 0 ? 'recién' : `hace ${minutos} min`;
    const precision = miUbicacion.precisionM != null ? ` · ±${Math.round(miUbicacion.precisionM)} m` : '';
    return `📍 Ubicación actualizada ${hace}${precision}`;
  }

  async function abrirComoLlegar(app: 'waze' | 'maps') {
    if (!tiendaComoLlegar) return;
    setErrorComoLlegar(null);
    const destino = encodeURIComponent(`${tiendaComoLlegar.direccion}, ${tiendaComoLlegar.comuna}`);
    const url =
      app === 'waze' ? `https://waze.com/ul?q=${destino}&navigate=yes` : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
    try {
      await Linking.openURL(url);
      setTiendaComoLlegar(null);
    } catch {
      // Alert.alert no muestra nada en web (react-native-web lo deja como
      // no-op) — el error se muestra como texto dentro del mismo modal.
      setErrorComoLlegar('No se pudo abrir la app de mapas.');
    }
  }

  function confirmarRapida() {
    if (!tiendaRapida || motivoRapida.trim().length === 0) return;
    marcarGestionRapida(tiendaRapida.id, motivoRapida.trim());
    setTiendaRapida(null);
    setMotivoRapida('');
  }

  function renderTienda(t: Tienda) {
    const visitada = visitadasIds.has(t.id);
    const visita = visitas.find((v) => v.tiendaId === t.id);
    const gestionRapida = visita?.modo === 'rapida';
    const orden = ordenPorTienda.get(t.id);

    return (
      <Card key={t.id} style={[styles.storeCard, orden === 1 && styles.storeCardNext]}>
        <View style={styles.storeTop}>
          <View style={[styles.storeIcon, orden ? { backgroundColor: colors.accent } : null]}>
            <Text style={orden ? styles.storeIconOrderText : styles.storeIconText}>{orden ?? '🏬'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{t.nombre}</Text>
            <Text style={styles.storeAddr}>
              {t.direccion}, {t.comuna}
            </Text>
            <View style={styles.metaRow}>
              {gestionRapida ? (
                <Badge tone="neutral">Gestionada</Badge>
              ) : visitada ? (
                <Badge tone="done">Visitada</Badge>
              ) : (
                <Badge tone="pending">Pendiente</Badge>
              )}
              {orden === 1 && !visitada ? <Badge tone="accent">Siguiente parada</Badge> : null}
              {distanciaDe(t) != null ? <Text style={styles.dist}>{distanciaDe(t)!.toFixed(1)} km</Text> : null}
            </View>
            {gestionRapida ? <Text style={styles.motivo}>“{visita?.motivoGestionRapida}”</Text> : null}
          </View>
        </View>

        {!visitada && (
          <>
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.btnGhostSm}
                onPress={() => {
                  setErrorComoLlegar(null);
                  setTiendaComoLlegar(t);
                }}
              >
                <Text style={styles.btnGhostSmText}>Cómo llegar</Text>
              </Pressable>
              <Pressable
                style={styles.btnPrimarySm}
                onPress={() => navigation.navigate('FotoAntes', { tiendaId: t.id })}
              >
                <Text style={styles.btnPrimarySmText}>Iniciar visita</Text>
              </Pressable>
            </View>
            <TextLink title="Marcar como gestionada sin visita presencial" onPress={() => setTiendaRapida(t)} />
          </>
        )}
      </Card>
    );
  }

  return (
    <Screen>
      <Title>Ruta del día</Title>
      <Subtitle>
        {pendientesOrdenadas.length
          ? `Ruta sugerida desde ${pendientesOrdenadas[0].nombre}${
              distanciaDe(pendientesOrdenadas[0]) != null ? ` (${distanciaDe(pendientesOrdenadas[0])!.toFixed(1)} km)` : ''
            }`
          : '¡Ruta mínima completa!'}
      </Subtitle>

      <View style={styles.ubicacionFila}>
        <Text style={styles.ubicacionTexto}>{textoUbicacion()}</Text>
        {!sinPermiso ? <TextLink title={actualizando ? 'Actualizando…' : 'Actualizar'} onPress={actualizar} /> : null}
      </View>

      <FlatList
        data={[...asignadasOrdenadas, ...creadas]}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => renderTienda(item)}
        ListHeaderComponent={<Text style={styles.sectionLabel}>Tiendas asignadas</Text>}
        ListFooterComponent={
          <>
            <Text style={styles.sectionLabel}>Visitas agregadas por ti</Text>
            {creadas.length === 0 && <Text style={styles.emptyHint}>Aún no agregas visitas fuera de tu ruta asignada.</Text>}
          </>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('NuevaVisita')}>
        <Text style={styles.fabText}>+ Nueva visita</Text>
      </Pressable>

      {/* Modal: cómo llegar */}
      <Modal
        visible={!!tiendaComoLlegar}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setTiendaComoLlegar(null);
          setErrorComoLlegar(null);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Cómo llegar a {tiendaComoLlegar?.nombre}</Text>
            {errorComoLlegar ? <Text style={styles.errorText}>{errorComoLlegar}</Text> : null}
            <Pressable style={styles.sheetOption} onPress={() => abrirComoLlegar('waze')}>
              <Text style={styles.sheetOptionText}>Abrir en Waze</Text>
            </Pressable>
            <Pressable style={styles.sheetOption} onPress={() => abrirComoLlegar('maps')}>
              <Text style={styles.sheetOptionText}>Abrir en Google Maps</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTiendaComoLlegar(null);
                setErrorComoLlegar(null);
              }}
              style={{ marginTop: spacing.sm, alignItems: 'center' }}
            >
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: visita rápida */}
      <Modal visible={!!tiendaRapida} transparent animationType="slide" onRequestClose={() => setTiendaRapida(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Gestionar {tiendaRapida?.nombre} sin visita</Text>
            <Field
              label="Motivo"
              placeholder="Ej: Hablé por teléfono con el encargado, todo en orden."
              value={motivoRapida}
              onChangeText={setMotivoRapida}
              multiline
            />
            <PrimaryButton title="Confirmar" disabled={motivoRapida.trim().length === 0} onPress={confirmarRapida} />
            <Pressable onPress={() => setTiendaRapida(null)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ubicacionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
  },
  ubicacionTexto: { fontSize: 12, color: colors.inkSoft, flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyHint: { fontSize: 12.5, color: colors.inkFaint, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.lg, textAlign: 'center' },
  storeCard: { marginBottom: spacing.sm },
  storeCardNext: { borderColor: colors.accent },
  storeTop: { flexDirection: 'row', gap: spacing.md },
  storeIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { fontSize: 16 },
  storeIconOrderText: { fontSize: 14, fontWeight: '700', color: colors.accentInk },
  storeName: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  storeAddr: { fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  dist: { fontSize: 11.5, color: colors.inkSoft },
  motivo: { fontSize: 12, color: colors.inkFaint, fontStyle: 'italic', marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btnGhostSm: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  btnGhostSmText: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
  btnPrimarySm: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  btnPrimarySmText: { color: colors.accentInk, fontWeight: '700', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  fabText: { color: colors.accentInk, fontWeight: '700' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,25,22,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  sheetTitle: { fontWeight: '700', fontSize: 15.5, marginBottom: spacing.md, color: colors.ink },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
  sheetOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionText: { fontWeight: '600', fontSize: 14, color: colors.ink },
});
