import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Subtitle, TextLink, Title } from '../components/ui';
import VisitaFila, { formatearFecha, formatearHora } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminTiendaDetalle'>;

export default function AdminTiendaDetalleScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, vendedoresDisponibles, cargarVendedores, actualizarTienda, visitasAdmin, cargarVisitasAdmin } =
    useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [mostrarSelector, setMostrarSelector] = React.useState(false);
  const historial = visitasAdmin.filter((v) => v.tiendaId === tiendaId);

  useEffect(() => {
    cargarVendedores();
    cargarVisitasAdmin();
  }, [cargarVendedores, cargarVisitasAdmin]);

  if (!tienda) {
    return (
      <Screen>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
        <Title>Tienda no encontrada</Title>
      </Screen>
    );
  }

  const asignado = vendedoresDisponibles.find((v) => v.id === tienda.vendedorAsignadoId);

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>{tienda.nombre}</Title>
      <Subtitle>
        {tienda.direccion}, {tienda.comuna}
      </Subtitle>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.etiqueta}>Tipo de cobertura</Text>
        <View style={styles.filaBotones}>
          <Pressable
            style={[styles.pill, tienda.esMinima && styles.pillActiva]}
            onPress={() => actualizarTienda(tienda.id, { esMinima: true })}
          >
            <Text style={[styles.pillTexto, tienda.esMinima && styles.pillTextoActivo]}>
              Santiago (visita presencial)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pill, !tienda.esMinima && styles.pillActiva]}
            onPress={() => actualizarTienda(tienda.id, { esMinima: false })}
          >
            <Text style={[styles.pillTexto, !tienda.esMinima && styles.pillTextoActivo]}>
              Región (seguimiento remoto)
            </Text>
          </Pressable>
        </View>

        <Text style={styles.etiqueta}>Vendedor asignado</Text>
        <Pressable style={styles.selector} onPress={() => setMostrarSelector(true)}>
          <Text style={styles.selectorTexto}>{asignado ? asignado.nombre : 'Sin asignar — tocar para elegir'}</Text>
        </Pressable>

        <Text style={styles.etiqueta}>Información de contacto</Text>
        <View style={styles.card}>
          <InfoLinea etiqueta="Contacto" valor={tienda.contacto} />
          <InfoLinea etiqueta="Teléfono" valor={tienda.telefono} />
          <InfoLinea etiqueta="Notas" valor={tienda.notas} />
        </View>

        <Text style={styles.etiqueta}>Historial de visitas ({historial.length})</Text>
        {historial.length ? (
          historial.map((v) => (
            <VisitaFila
              key={v.id}
              visita={v}
              titulo={formatearFecha(v.horaInicio)}
              detalle={`${formatearHora(v.horaInicio)} · ${
                vendedoresDisponibles.find((x) => x.id === v.vendedorId)?.nombre ?? 'Vendedor'
              }`}
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
                  }}
                >
                  <Text style={styles.sheetOptionText}>
                    {v.nombre} {v.id === tienda.vendedorAsignadoId ? '✓' : ''}
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
    </Screen>
  );
}

function InfoLinea({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  return (
    <View style={styles.infoLinea}>
      <Text style={styles.infoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.infoValor}>{valor ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontSize: 12,
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
  pillTexto: { fontSize: 13.5, fontWeight: '600', color: colors.inkSoft },
  pillTextoActivo: { color: colors.accentInk },
  selector: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md },
  selectorTexto: { fontSize: 13.5, color: colors.ink, fontWeight: '600' },
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  infoLinea: { marginBottom: spacing.sm },
  infoEtiqueta: { fontSize: 11.5, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValor: { fontSize: 13, color: colors.ink, marginTop: 2 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,25,22,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  sheetTitle: { fontWeight: '700', fontSize: 15.5, marginBottom: spacing.md, color: colors.ink },
  sheetOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionText: { fontWeight: '600', fontSize: 14, color: colors.ink },
});
