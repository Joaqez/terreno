import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import InventarioResumen from '../components/InventarioResumen';
import { Badge, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { etiquetaVisita, formatearFecha, formatearHora } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { PRECISION_MAXIMA_M, formatearMetros, textoFueraDeRango } from '../lib/rangoVisita';
import { avisar } from '../lib/avisos';
import { nombreVisible, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { RespuestaChecklist, Tienda, UbicacionVisita } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVisitaDetalle'>;

export default function AdminVisitaDetalleScreen({ navigation, route }: Props) {
  const { visitaId } = route.params;
  const { tiendas, visitasAdmin, vendedoresDisponibles, cargarVendedores, jefesTienda, actualizarTienda } =
    useTerrenoStore();
  const visita = visitasAdmin.find((v) => v.id === visitaId);
  const [confirmandoUbicacion, setConfirmandoUbicacion] = useState(false);
  const jefe = visita?.jefeTiendaId ? jefesTienda.find((j) => j.id === visita.jefeTiendaId) : undefined;

  useEffect(() => {
    if (!vendedoresDisponibles.length) cargarVendedores();
  }, [vendedoresDisponibles.length, cargarVendedores]);

  if (!visita) {
    return (
      <Screen>
        <Title>Visita no encontrada</Title>
      </Screen>
    );
  }

  const tienda = tiendas.find((t) => t.id === visita.tiendaId);
  const vendedor = vendedoresDisponibles.find((v) => v.id === visita.vendedorId);
  const etiqueta = etiquetaVisita(visita);
  const pedido = visita.pedido ?? [];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{tienda?.nombre ?? 'Tienda eliminada'}</Title>
        <Subtitle>{tienda ? `${tienda.direccion}, ${tienda.comuna}` : visita.tiendaId}</Subtitle>

        <View style={{ marginBottom: spacing.md, flexDirection: 'row', gap: 6 }}>
          <Badge tone={etiqueta.tono}>{etiqueta.texto}</Badge>
          {visita.fueraDeRango ? <Badge tone="danger">Fuera de rango</Badge> : null}
        </View>

        {visita.fueraDeRango ? (
          <View style={[styles.card, styles.cardFuera]}>
            <Text style={styles.fueraTitulo}>Iniciada fuera de rango · {textoFueraDeRango(visita.fueraDeRango)}</Text>
            <Text style={styles.texto}>“{visita.fueraDeRango.justificacion}”</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Linea etiqueta="Vendedor" valor={nombreVisible(vendedor, '—')} />
          <Linea etiqueta="Fecha" valor={formatearFecha(visita.horaInicio)} />
          <Linea etiqueta="Horario" valor={`${formatearHora(visita.horaInicio)} – ${formatearHora(visita.horaFin)}`} />
          {visita.modo === 'presencial' ? (
            <Linea etiqueta="Jefe de tienda" valor={jefe ? jefe.nombre : (visita.jefeTiendaNombre ?? 'No registrado')} />
          ) : null}
          {jefe?.telefono ? <Linea etiqueta="Teléfono" valor={jefe.telefono} /> : null}
          {jefe?.email ? <Linea etiqueta="Correo" valor={jefe.email} /> : null}
        </View>

        {visita.tipo === 'venta' ? (
          <>
            <Text style={styles.etiqueta}>
              Pedido · {pedido.length} productos · {pedido.reduce((n, i) => n + i.cantidad, 0)} unidades
            </Text>
            <View style={styles.card}>
              {pedido.length ? (
                pedido.map((i) => (
                  <View key={i.productoId} style={styles.itemPedido}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNombre}>{i.nombre}</Text>
                      <Text style={styles.itemSku}>SKU {i.sku}</Text>
                    </View>
                    <Text style={styles.itemCantidad}>× {i.cantidad}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.texto}>Sin productos registrados.</Text>
              )}
            </View>
          </>
        ) : null}

        {visita.inventario ? (
          <>
            <Text style={styles.etiqueta}>Productos en tienda al llegar</Text>
            <InventarioResumen inventario={visita.inventario} />
          </>
        ) : null}

        {visita.checklist?.length ? (
          <>
            <Text style={styles.etiqueta}>
              Checklist del exhibidor · {visita.checklist.filter((i) => i.respuesta === 'no').length} con "No"
            </Text>
            <View style={styles.card}>
              {visita.checklist.map((i) => (
                <View key={i.preguntaId}>
                  <View style={styles.itemPedido}>
                    <Text style={[styles.itemNombre, { flex: 1 }]}>{i.pregunta}</Text>
                    <Text style={[styles.respuesta, estiloRespuesta[i.respuesta]]}>{TEXTO_RESPUESTA[i.respuesta]}</Text>
                  </View>
                  {i.comentario ? <Text style={styles.comentarioNo}>{i.comentario}</Text> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {visita.ubicacionVendedor ? (
          <>
            <Text style={styles.etiqueta}>Ubicación al iniciar la visita</Text>
            <View style={styles.card}>
              <Text style={styles.texto}>
                {visita.ubicacionVendedor.distanciaTiendaM != null
                  ? `A ${formatearMetros(visita.ubicacionVendedor.distanciaTiendaM)} de la tienda`
                  : 'La tienda no tiene coordenadas para comparar'}
                {visita.ubicacionVendedor.precisionM != null
                  ? ` (precisión ±${Math.round(visita.ubicacionVendedor.precisionM)} m)`
                  : ''}
              </Text>
              {tienda?.ubicacionPorConfirmar ? (
                <Text style={styles.porConfirmar}>
                  La ubicación de esta tienda está por confirmar: todavía no se bloquean visitas lejos de ella.
                </Text>
              ) : null}
              <View style={{ marginTop: spacing.sm }}>
                <TextLink
                  title="Ver en Google Maps →"
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${visita.ubicacionVendedor!.lat},${visita.ubicacionVendedor!.lng}`
                    )
                  }
                />
              </View>
              {tienda && visita.modo === 'presencial' ? (
                <View style={styles.fijarUbicacion}>
                  {ubicacionYaUsada(tienda, visita.ubicacionVendedor) ? (
                    <Text style={styles.ubicacionFijada}>✓ Esta es la ubicación actual de la tienda.</Text>
                  ) : confirmandoUbicacion ? (
                    <>
                      <Text style={styles.texto}>
                        ¿Fijar este punto como la ubicación de {tienda.nombre}? Desde ahí se medirán los {'200 m'} de
                        las próximas visitas.
                        {(visita.ubicacionVendedor.precisionM ?? Infinity) > PRECISION_MAXIMA_M
                          ? ' Ojo: el GPS de esta visita era poco preciso.'
                          : ''}
                      </Text>
                      <View style={styles.filaBotones}>
                        <TextLink
                          title="Sí, fijar ubicación"
                          onPress={() => {
                            actualizarTienda(tienda.id, {
                              lat: visita.ubicacionVendedor!.lat,
                              lng: visita.ubicacionVendedor!.lng,
                              ubicacionPorConfirmar: false,
                            });
                            setConfirmandoUbicacion(false);
                            avisar('Ubicación de la tienda actualizada');
                          }}
                        />
                        <TextLink title="Cancelar" tone="danger" onPress={() => setConfirmandoUbicacion(false)} />
                      </View>
                    </>
                  ) : (
                    <TextLink title="Usar esta ubicación como la de la tienda" onPress={() => setConfirmandoUbicacion(true)} />
                  )}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.etiqueta}>{visita.modo === 'rapida' ? 'Motivo de la gestión' : 'Observaciones'}</Text>
        <View style={styles.card}>
          <Text style={styles.texto}>
            {(visita.modo === 'rapida' ? visita.motivoGestionRapida : visita.observaciones) || 'Sin observaciones.'}
          </Text>
        </View>

        {visita.modo === 'presencial' ? (
          <>
            <Foto titulo="Foto antes" url={visita.fotoAntesUrl} />
            <Foto titulo="Foto después" url={visita.fotoDespuesUrl} />
          </>
        ) : null}

        {tienda ? (
          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <TextLink
              title="Ver tienda e historial →"
              onPress={() => navigation.navigate('AdminTiendaDetalle', { tiendaId: tienda.id })}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const TEXTO_RESPUESTA: Record<RespuestaChecklist, string> = { si: 'Sí', no: 'No', na: 'No aplica' };

function ubicacionYaUsada(t: Tienda, u: UbicacionVisita) {
  return !t.ubicacionPorConfirmar && t.lat === u.lat && t.lng === u.lng;
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.lineaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.lineaValor}>{valor}</Text>
    </View>
  );
}

function Foto({ titulo, url }: { titulo: string; url?: string }) {
  return (
    <>
      <Text style={styles.etiqueta}>{titulo}</Text>
      {url ? (
        <Pressable onPress={() => Linking.openURL(url)}>
          <Image source={{ uri: url }} style={styles.foto} resizeMode="cover" />
          <Text style={styles.ayudaFoto}>Toca para ver en tamaño completo</Text>
        </Pressable>
      ) : (
        <View style={[styles.foto, styles.sinFoto]}>
          <Text style={styles.ayudaFoto}>Sin foto</Text>
        </View>
      )}
    </>
  );
}

const estiloRespuesta = StyleSheet.create({
  si: { color: colors.success },
  no: { color: colors.danger, backgroundColor: colors.dangerSoft },
  na: { color: colors.inkFaint },
});

const styles = StyleSheet.create({
  cardFuera: { borderColor: colors.danger, backgroundColor: colors.dangerSoft, marginBottom: spacing.sm },
  fueraTitulo: { fontSize: 14.5, fontWeight: '700', color: colors.danger, marginBottom: 4 },
  porConfirmar: { fontSize: 14, color: colors.amber, fontWeight: '600', marginTop: spacing.sm },
  fijarUbicacion: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  ubicacionFijada: { fontSize: 14.5, color: colors.success, fontWeight: '600' },
  filaBotones: { flexDirection: 'row', gap: spacing.xl },
  comentarioNo: { fontSize: 14, color: colors.danger, marginTop: -2, marginBottom: 6, fontStyle: 'italic' },
  respuesta: { fontSize: 14.5, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, overflow: 'hidden' },
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  linea: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
  lineaEtiqueta: { fontSize: 14.5, color: colors.inkSoft },
  lineaValor: { fontSize: 14.5, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
  etiqueta: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  texto: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  itemPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemNombre: { fontSize: 14.5, fontWeight: '600', color: colors.ink },
  itemSku: { fontSize: 12.5, color: colors.inkFaint, marginTop: 1 },
  itemCantidad: { fontSize: 16.5, fontWeight: '700', color: colors.accent },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.border },
  sinFoto: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  ayudaFoto: { fontSize: 13, color: colors.inkFaint, textAlign: 'center', marginTop: 4 },
});
