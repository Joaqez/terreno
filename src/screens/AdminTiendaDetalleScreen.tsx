import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Subtitle, TextLink, Title } from '../components/ui';
import InventarioResumen from '../components/InventarioResumen';
import JefeTiendaModal from '../components/JefeTiendaModal';
import VisitaFila, { formatearFecha, formatearHora } from '../components/VisitaFila';
import { JefeTienda } from '../types';
import { colors, radius, spacing } from '../theme';
import { avisar } from '../lib/avisos';
import { nombreVisible, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminTiendaDetalle'>;

export default function AdminTiendaDetalleScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const {
    tiendas,
    vendedoresDisponibles,
    cargarVendedores,
    actualizarTienda,
    visitasAdmin,
    cargarVisitasAdmin,
    jefesTienda,
  } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [mostrarSelector, setMostrarSelector] = React.useState(false);
  /** undefined = modal cerrado; null = crear uno nuevo; un jefe = editarlo. */
  const [jefeEditando, setJefeEditando] = React.useState<JefeTienda | null | undefined>(undefined);
  const historial = visitasAdmin.filter((v) => v.tiendaId === tiendaId);
  const jefesDeTienda = jefesTienda.filter((j) => j.tiendaId === tiendaId);
  const jefesActivos = jefesDeTienda.filter((j) => j.activo);
  const jefesAnteriores = jefesDeTienda.filter((j) => !j.activo);

  const nombreVendedor = (id?: string) => nombreVisible(vendedoresDisponibles.find((v) => v.id === id), 'un vendedor');

  function detalleJefe(j: JefeTienda) {
    // `historial` viene ordenado de más nueva a más antigua.
    const ultima = historial.find((v) => v.jefeTiendaId === j.id);
    const registro =
      j.origen === 'importado'
        ? 'Importado del Excel de tiendas'
        : `Registrado el ${formatearFecha(j.creadoEn)} por ${nombreVendedor(j.creadoPorId)}`;
    return [
      [j.telefono, j.email].filter(Boolean).join(' · ') || 'Sin teléfono ni correo',
      registro,
      ultima ? `Última visita: ${formatearFecha(ultima.horaInicio)}` : 'Aún sin visitas registradas',
    ].join('\n');
  }

  useEffect(() => {
    cargarVendedores();
    cargarVisitasAdmin();
  }, [cargarVendedores, cargarVisitasAdmin]);

  if (!tienda) {
    return (
      <Screen>
        <Title>Tienda no encontrada</Title>
      </Screen>
    );
  }

  const asignado = vendedoresDisponibles.find((v) => v.id === tienda.vendedorAsignadoId);

  return (
    <Screen>
      <Title>{tienda.nombre}</Title>
      <Subtitle>
        {tienda.direccion}, {tienda.comuna}
      </Subtitle>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.etiqueta}>Tipo de cobertura</Text>
        <View style={styles.filaBotones}>
          <Pressable
            style={[styles.pill, tienda.esMinima && styles.pillActiva]}
            onPress={() => {
              actualizarTienda(tienda.id, { esMinima: true });
              avisar('Tienda marcada como de Santiago');
            }}
          >
            <Text style={[styles.pillTexto, tienda.esMinima && styles.pillTextoActivo]}>
              Santiago (visita presencial)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pill, !tienda.esMinima && styles.pillActiva]}
            onPress={() => {
              actualizarTienda(tienda.id, { esMinima: false });
              avisar('Tienda marcada como de región');
            }}
          >
            <Text style={[styles.pillTexto, !tienda.esMinima && styles.pillTextoActivo]}>
              Región (seguimiento remoto)
            </Text>
          </Pressable>
        </View>

        <Text style={styles.etiqueta}>Vendedor asignado</Text>
        <Pressable style={styles.selector} onPress={() => setMostrarSelector(true)}>
          <Text style={styles.selectorTexto}>{asignado ? nombreVisible(asignado) : 'Sin asignar — tocar para elegir'}</Text>
        </Pressable>

        {tienda.esMinima ? (
          <>
            <Text style={styles.etiqueta}>Ubicación</Text>
            <Text style={[styles.ubicacionEstado, tienda.ubicacionPorConfirmar || tienda.lat == null ? styles.ubicacionPendiente : null]}>
              {tienda.lat == null
                ? 'Sin coordenadas: no se verifica la distancia al iniciar visitas.'
                : tienda.ubicacionPorConfirmar
                  ? 'Por confirmar: no se bloquean visitas lejos de la tienda. Para corregirla, abre una visita y toca "Usar esta ubicación como la de la tienda".'
                  : 'Confirmada: no se puede iniciar una visita a más de 200 m sin justificar.'}
            </Text>
            {tienda.lat != null ? (
              <TextLink
                title="Ver en Google Maps →"
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${tienda.lat},${tienda.lng}`)}
              />
            ) : null}
          </>
        ) : null}

        <Text style={styles.etiqueta}>Jefes de tienda ({jefesActivos.length})</Text>
        {jefesActivos.map((j) => (
          <FilaJefe
            key={j.id}
            jefe={j}
            detalle={detalleJefe(j)}
            onPress={() => navigation.navigate('AdminJefeDetalle', { jefeId: j.id })}
            onEditar={() => setJefeEditando(j)}
          />
        ))}
        <Pressable style={styles.nuevoJefe} onPress={() => setJefeEditando(null)}>
          <Text style={styles.nuevoJefeTexto}>+ Nuevo jefe de tienda</Text>
        </Pressable>
        {jefesAnteriores.length ? (
          <>
            <Text style={styles.subEtiqueta}>Ya no trabajan aquí ({jefesAnteriores.length})</Text>
            {jefesAnteriores.map((j) => (
              <FilaJefe
                key={j.id}
                jefe={j}
                detalle={`${detalleJefe(j)}${
                  j.bajaEn ? `\nDado de baja el ${formatearFecha(j.bajaEn)} por ${nombreVendedor(j.bajaPorId)}` : ''
                }`}
                onPress={() => navigation.navigate('AdminJefeDetalle', { jefeId: j.id })}
              />
            ))}
          </>
        ) : null}

        <Text style={styles.etiqueta}>Último inventario conocido</Text>
        {tienda.ultimoInventario ? (
          <Pressable
            onPress={() => navigation.navigate('AdminVisitaDetalle', { visitaId: tienda.ultimoInventario!.visitaId })}
          >
            <InventarioResumen
              inventario={tienda.ultimoInventario}
              pie={`Visita del ${formatearFecha(tienda.ultimoInventario.fecha)} a las ${formatearHora(
                tienda.ultimoInventario.fecha
              )} por ${nombreVendedor(tienda.ultimoInventario.vendedorId)} · tocar para ver la visita`}
            />
          </Pressable>
        ) : (
          <Text style={styles.infoValor}>Todavía no se registra qué productos hay en esta tienda.</Text>
        )}

        {tienda.notas ? (
          <>
            <Text style={styles.etiqueta}>Notas</Text>
            <View style={styles.card}>
              <Text style={styles.infoValor}>{tienda.notas}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.etiqueta}>Historial de visitas ({historial.length})</Text>
        {historial.length ? (
          historial.map((v) => (
            <VisitaFila
              key={v.id}
              visita={v}
              titulo={formatearFecha(v.horaInicio)}
              detalle={`${formatearHora(v.horaInicio)} · por ${nombreVendedor(v.vendedorId)}`}
              onPress={() => navigation.navigate('AdminVisitaDetalle', { visitaId: v.id })}
            />
          ))
        ) : (
          <Text style={styles.infoValor}>Sin visitas registradas.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={mostrarSelector} transparent animationType="slide" onRequestClose={() => setMostrarSelector(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Asignar {tienda.nombre}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Pressable
                style={styles.sheetOption}
                onPress={() => {
                  actualizarTienda(tienda.id, { vendedorAsignadoId: '' });
                  setMostrarSelector(false);
                  avisar('Tienda sin vendedor asignado');
                }}
              >
                <Text style={styles.sheetOptionText}>Sin asignar</Text>
              </Pressable>
              {vendedoresDisponibles.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.sheetOption}
                  onPress={() => {
                    actualizarTienda(tienda.id, { vendedorAsignadoId: v.id });
                    setMostrarSelector(false);
                    avisar(`Asignada a ${nombreVisible(v)}`);
                  }}
                >
                  <Text style={styles.sheetOptionText}>
                    {nombreVisible(v)} {v.id === tienda.vendedorAsignadoId ? '✓' : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setMostrarSelector(false)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <JefeTiendaModal
        visible={jefeEditando !== undefined}
        tiendaId={tienda.id}
        jefe={jefeEditando}
        onCerrar={() => setJefeEditando(undefined)}
      />
    </Screen>
  );
}

function FilaJefe({
  jefe,
  detalle,
  onPress,
  onEditar,
}: {
  jefe: JefeTienda;
  detalle: string;
  onPress: () => void;
  onEditar?: () => void;
}) {
  return (
    <Pressable style={[styles.card, styles.filaJefe, !jefe.activo && { opacity: 0.6 }]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.jefeNombre}>{jefe.nombre}</Text>
        <Text style={styles.jefeDetalle}>{detalle}</Text>
      </View>
      {onEditar ? <TextLink title="Editar" onPress={onEditar} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ubicacionEstado: { fontSize: 14.5, color: colors.inkSoft, lineHeight: 21, marginBottom: spacing.sm },
  ubicacionPendiente: { color: colors.amber, fontWeight: '600' },
  etiqueta: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  filaBotones: { gap: spacing.sm },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  pillActiva: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillTexto: { fontSize: 15, fontWeight: '600', color: colors.inkSoft },
  pillTextoActivo: { color: colors.accentInk },
  selector: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md },
  selectorTexto: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  filaJefe: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md },
  jefeNombre: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  jefeDetalle: { fontSize: 13.5, color: colors.inkSoft, marginTop: 3, lineHeight: 19 },
  nuevoJefe: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  nuevoJefeTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  subEtiqueta: { fontSize: 13, fontWeight: '700', color: colors.inkFaint, marginTop: spacing.md, marginBottom: spacing.sm },
  infoValor: { fontSize: 14.5, color: colors.ink, marginTop: 2 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,25,22,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  sheetTitle: { fontWeight: '700', fontSize: 17, marginBottom: spacing.md, color: colors.ink },
  sheetOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionText: { fontWeight: '600', fontSize: 15.5, color: colors.ink },
});
