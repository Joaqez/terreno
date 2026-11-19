import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, Field, PrimaryButton, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { calcularDistanciaKm } from '../lib/distancia';
import { RADIO_VISITA_M, ResultadoRango, formatearMetros, tiendaSeVerifica, verificarRango } from '../lib/rangoVisita';
import { useTerrenoStore } from '../lib/store';
import { useUbicacionActual } from '../lib/useUbicacionActual';
import { RootStackParamList } from '../navigation/types';
import { FueraDeRango, Tienda, UbicacionVisita } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ruta'>;

export default function RutaScreen({ navigation }: Props) {
  const { tiendas, visitas, jornada, marcarGestionRapida, iniciarBorrador, actualizarBorrador } = useTerrenoStore();
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
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [fuera, setFuera] = useState<{ tienda: Tienda; resultado: Extract<ResultadoRango, { ok: false }> } | null>(null);
  const [justificacion, setJustificacion] = useState('');

  // Bloqueo de visitas fuera de rango (2026-11-19, ver CLAUDE.md): antes de
  // empezar se pide una ubicación precisa; si está a más de 200 m (menos el
  // error del GPS), si el GPS es muy impreciso o si no hay ubicación, hay que
  // justificar para "Iniciar igual" y la visita queda marcada en el panel.
  async function iniciarVisita(t: Tienda) {
    if (verificandoId) return;
    if (!tiendaSeVerifica(t)) return empezarVisita(t, undefined, undefined);
    setVerificandoId(t.id);
    const resultado = await verificarRango(t);
    setVerificandoId(null);
    if (resultado.ok) return empezarVisita(t, resultado.ubicacion ?? undefined, undefined);
    setJustificacion('');
    setFuera({ tienda: t, resultado });
  }

  function empezarVisita(t: Tienda, ubicacion: UbicacionVisita | undefined, fueraDeRango: FueraDeRango | undefined) {
    // Si vuelve a una visita a medias de la misma tienda, se retoma el borrador.
    if (useTerrenoStore.getState().borrador?.tiendaId !== t.id) iniciarBorrador(t.id);
    // Sin ubicación verificada, FotoAntesScreen toma una en segundo plano.
    actualizarBorrador({ fueraDeRango, ubicacionVendedor: ubicacion });
    navigation.navigate('FotoAntes', { tiendaId: t.id });
  }

  function iniciarIgual() {
    if (!fuera || !justificacion.trim()) return;
    const { tienda, resultado } = fuera;
    setFuera(null);
    empezarVisita(tienda, resultado.ubicacion ?? undefined, { ...resultado.fuera, justificacion: justificacion.trim() });
  }

  function reintentar() {
    if (!fuera) return;
    const t = fuera.tienda;
    setFuera(null);
    iniciarVisita(t);
  }

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
                style={[styles.btnPrimarySm, verificandoId && verificandoId !== t.id ? { opacity: 0.5 } : null]}
                onPress={() => iniciarVisita(t)}
                disabled={!!verificandoId}
              >
                <Text style={styles.btnPrimarySmText}>
                  {verificandoId === t.id ? 'Verificando ubicación…' : 'Iniciar visita'}
                </Text>
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

      {/* Modal: fuera de rango */}
      <Modal visible={!!fuera} transparent animationType="slide" onRequestClose={() => setFuera(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {fuera?.resultado.fuera.motivo === 'lejos'
                ? `Estás a ${formatearMetros(fuera.resultado.fuera.distanciaM ?? 0)} de ${fuera.tienda.nombre}`
                : 'No se pudo verificar tu ubicación'}
            </Text>
            <Text style={styles.fueraTexto}>
              {fuera?.resultado.fuera.motivo === 'lejos'
                ? `Para iniciar la visita tienes que estar a menos de ${RADIO_VISITA_M} m de la tienda (GPS ±${
                    fuera.resultado.fuera.precisionM ?? '?'
                  } m).`
                : fuera?.resultado.fuera.motivo === 'imprecisa'
                  ? `El GPS está dando una ubicación poco precisa (±${
                      fuera.resultado.fuera.precisionM ?? '?'
                    } m). Sal a un lugar abierto y reintenta.`
                  : 'Revisa que el GPS esté activo y que el navegador tenga permiso de ubicación, y reintenta.'}
            </Text>
            <Pressable style={styles.sheetOption} onPress={reintentar}>
              <Text style={[styles.sheetOptionText, { color: colors.accent }]}>Reintentar</Text>
            </Pressable>
            <View style={{ marginTop: spacing.md }}>
              <Field
                label="Si igual necesitas iniciarla, explica por qué"
                placeholder="Ej: La tienda se cambió de local, está en la vereda del frente."
                value={justificacion}
                onChangeText={setJustificacion}
                multiline
              />
            </View>
            <PrimaryButton title="Iniciar igual" disabled={!justificacion.trim()} onPress={iniciarIgual} />
            <Text style={styles.fueraAviso}>La visita quedará marcada como fuera de rango en el panel.</Text>
            <Pressable onPress={() => setFuera(null)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cancelar</Text>
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
  fueraTexto: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 19, marginTop: -spacing.sm },
  fueraAviso: { fontSize: 11.5, color: colors.inkFaint, textAlign: 'center', marginTop: spacing.sm },
  sheetOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionText: { fontWeight: '600', fontSize: 14, color: colors.ink },
});
