import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import JefeTiendaModal from '../components/JefeTiendaModal';
import { Badge, Screen, Subtitle, TextLink, Title } from '../components/ui';
import VisitaFila, { formatearFecha, formatearHora } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { linkCorreo, linkLlamar, linkWhatsApp } from '../lib/contacto';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminJefeDetalle'>;

export default function AdminJefeDetalleScreen({ navigation, route }: Props) {
  const { jefeId } = route.params;
  const {
    jefesTienda,
    tiendas,
    vendedoresDisponibles,
    cargarVendedores,
    visitasAdmin,
    cargarVisitasAdmin,
    reactivarJefeTienda,
  } = useTerrenoStore();
  const [editando, setEditando] = useState(false);
  const jefe = jefesTienda.find((j) => j.id === jefeId);
  const tienda = tiendas.find((t) => t.id === jefe?.tiendaId);
  const visitas = visitasAdmin.filter((v) => v.jefeTiendaId === jefeId);

  useEffect(() => {
    if (!vendedoresDisponibles.length) cargarVendedores();
    if (!visitasAdmin.length) cargarVisitasAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!jefe) {
    return (
      <Screen>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
        <Title>Jefe de tienda no encontrado</Title>
      </Screen>
    );
  }

  const nombreVendedor = (id?: string) => vendedoresDisponibles.find((v) => v.id === id)?.nombre ?? 'un vendedor';
  const acciones = [
    { texto: 'Llamar', url: linkLlamar(jefe.telefono) },
    { texto: 'WhatsApp', url: linkWhatsApp(jefe.telefono) },
    { texto: 'Correo', url: linkCorreo(jefe.email) },
  ].filter((a): a is { texto: string; url: string } => !!a.url);

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{jefe.nombre}</Title>
        <Subtitle>{tienda ? `${tienda.nombre} · ${tienda.comuna}` : 'Tienda eliminada'}</Subtitle>

        {!jefe.activo ? (
          <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
            <Badge tone="neutral">Ya no trabaja aquí</Badge>
            {jefe.bajaEn ? (
              <Text style={styles.meta}>
                Dado de baja el {formatearFecha(jefe.bajaEn)} por {nombreVendedor(jefe.bajaPorId)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Linea etiqueta="Teléfono" valor={jefe.telefono || '—'} />
          <Linea etiqueta="Correo" valor={jefe.email || '—'} />
          <Linea
            etiqueta="Registrado"
            valor={
              jefe.origen === 'importado'
                ? 'Importado del Excel de tiendas'
                : `${formatearFecha(jefe.creadoEn)} por ${nombreVendedor(jefe.creadoPorId)}`
            }
          />
          {jefe.actualizadoEn ? (
            <Linea
              etiqueta="Última edición"
              valor={`${formatearFecha(jefe.actualizadoEn)} por ${nombreVendedor(jefe.actualizadoPorId)}`}
            />
          ) : null}
        </View>

        {acciones.length ? (
          <View style={styles.acciones}>
            {acciones.map((a) => (
              <Pressable key={a.texto} style={styles.accion} onPress={() => Linking.openURL(a.url)}>
                <Text style={styles.accionTexto}>{a.texto}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.links}>
          <TextLink title="Editar" onPress={() => setEditando(true)} />
          {!jefe.activo ? <TextLink title="Reactivar" onPress={() => reactivarJefeTienda(jefe.id)} /> : null}
          {tienda ? (
            <TextLink title="Ver tienda →" onPress={() => navigation.navigate('AdminTiendaDetalle', { tiendaId: tienda.id })} />
          ) : null}
        </View>

        <Text style={styles.etiqueta}>Visitas con este jefe de tienda ({visitas.length})</Text>
        {visitas.length ? (
          visitas.map((v) => (
            <VisitaFila
              key={v.id}
              visita={v}
              titulo={formatearFecha(v.horaInicio)}
              detalle={`${formatearHora(v.horaInicio)} · ${nombreVendedor(v.vendedorId)}`}
              onPress={() => navigation.navigate('AdminVisitaDetalle', { visitaId: v.id })}
            />
          ))
        ) : (
          <Text style={styles.meta}>Aún no hay visitas registradas con este jefe de tienda.</Text>
        )}
      </ScrollView>

      <JefeTiendaModal visible={editando} tiendaId={jefe.tiendaId} jefe={jefe} onCerrar={() => setEditando(false)} />
    </Screen>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.lineaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.lineaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  linea: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
  lineaEtiqueta: { fontSize: 13, color: colors.inkSoft },
  lineaValor: { fontSize: 13, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
  acciones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  accion: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  accionTexto: { color: colors.accentInk, fontWeight: '700', fontSize: 13.5 },
  links: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  meta: { fontSize: 12.5, color: colors.inkSoft },
});
