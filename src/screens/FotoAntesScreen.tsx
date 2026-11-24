import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CuadroFoto from '../components/CuadroFoto';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, spacing } from '../theme';
import { calcularDistanciaKm } from '../lib/distancia';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { obtenerUbicacionPrecisa } from '../lib/useUbicacionActual';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FotoAntes'>;

export default function FotoAntesScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, jornada, actualizarBorrador, borrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida(
    borrador?.tiendaId === tiendaId ? borrador.fotoAntesUrl : undefined
  );

  useEffect(() => {
    // La visita (borrador) la crea RutaScreen al verificar la ubicación. Sin
    // ella (ej. botón atrás del navegador después de finalizar) se vuelve a
    // la ruta: crearla aquí se saltaría la verificación de distancia.
    if (borrador?.tiendaId !== tiendaId) {
      navigation.navigate('Ruta');
      return;
    }
    // Si RutaScreen ya verificó la distancia, esa lectura es la de la visita.
    if (useTerrenoStore.getState().borrador?.ubicacionVendedor) return;
    // Si no (tienda sin coordenadas confiables), se toma en segundo plano (no
    // bloquea: si el GPS tarda o falla, la visita sigue igual). Queda en la
    // visita como respaldo y para corregir tiendas con coordenadas malas.
    obtenerUbicacionPrecisa().then((u) => {
      if (!u || useTerrenoStore.getState().borrador?.tiendaId !== tiendaId) return;
      const distanciaTiendaM =
        tienda?.lat != null && tienda?.lng != null
          ? Math.round(calcularDistanciaKm(u.lat, u.lng, tienda.lat, tienda.lng) * 1000)
          : null;
      actualizarBorrador({ ubicacionVendedor: { lat: u.lat, lng: u.lng, precisionM: u.precisionM, distanciaTiendaM } });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendaId]);

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Title>Foto de antes</Title>
        <Subtitle>Apenas llegues, antes de conversar con el encargado.</Subtitle>

        <CuadroFoto
          fotoUri={fotoUri}
          subiendo={subiendo}
          ayuda="Nuestro exhibidor, tal como lo encuentras."
          onPress={() => capturar(`jornadas/${jornada?.id}/visitas/${tiendaId}/antes-${Date.now()}.jpg`)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingTop: spacing.md }}>
        <PrimaryButton
          title="Continuar"
          disabled={!fotoUrl || subiendo}
          loading={subiendo}
          onPress={() => {
            actualizarBorrador({ fotoAntesUrl: fotoUrl! });
            navigation.navigate('JefeTienda', { tiendaId });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorText: { color: colors.danger, fontSize: 14.5, marginBottom: spacing.md },
});
