import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { etiquetaVisita, formatearFecha, formatearHora } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVisitaDetalle'>;

export default function AdminVisitaDetalleScreen({ navigation, route }: Props) {
  const { visitaId } = route.params;
  const { tiendas, visitasAdmin, vendedoresDisponibles, cargarVendedores } = useTerrenoStore();
  const visita = visitasAdmin.find((v) => v.id === visitaId);

  useEffect(() => {
    if (!vendedoresDisponibles.length) cargarVendedores();
  }, [vendedoresDisponibles.length, cargarVendedores]);

  if (!visita) {
    return (
      <Screen>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
        <Title>Visita no encontrada</Title>
      </Screen>
    );
  }

  const tienda = tiendas.find((t) => t.id === visita.tiendaId);
  const vendedor = vendedoresDisponibles.find((v) => v.id === visita.vendedorId);
  const etiqueta = etiquetaVisita(visita);

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{tienda?.nombre ?? 'Tienda eliminada'}</Title>
        <Subtitle>{tienda ? `${tienda.direccion}, ${tienda.comuna}` : visita.tiendaId}</Subtitle>

        <View style={{ marginBottom: spacing.md }}>
          <Badge tone={etiqueta.tono}>{etiqueta.texto}</Badge>
        </View>

        <View style={styles.card}>
          <Linea etiqueta="Vendedor" valor={vendedor?.nombre ?? '—'} />
          <Linea etiqueta="Fecha" valor={formatearFecha(visita.horaInicio)} />
          <Linea etiqueta="Horario" valor={`${formatearHora(visita.horaInicio)} – ${formatearHora(visita.horaFin)}`} />
          {visita.tipo === 'venta' ? (
            <>
              <Linea etiqueta="Tipo de venta" valor={visita.tipoVenta === 'acordada' ? 'Acordada' : 'Nueva'} />
              <Linea etiqueta="N° de factura" valor={visita.numeroFactura ?? '—'} />
            </>
          ) : null}
        </View>

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

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  linea: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
  lineaEtiqueta: { fontSize: 13, color: colors.inkSoft },
  lineaValor: { fontSize: 13, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  texto: { fontSize: 13.5, color: colors.ink, lineHeight: 20 },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.border },
  sinFoto: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  ayudaFoto: { fontSize: 11.5, color: colors.inkFaint, textAlign: 'center', marginTop: 4 },
});
