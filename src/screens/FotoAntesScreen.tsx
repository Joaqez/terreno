import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useFotoConSubida } from '../lib/useFotoConSubida';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FotoAntes'>;

export default function FotoAntesScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, jornada, iniciarBorrador, actualizarBorrador, borrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const { fotoUri, fotoUrl, subiendo, error, capturar } = useFotoConSubida();

  useEffect(() => {
    // Empieza un borrador nuevo cada vez que se entra a esta pantalla desde la ruta.
    if (borrador?.tiendaId !== tiendaId) {
      iniciarBorrador(tiendaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendaId]);

  return (
    <Screen>
      <Title>{tienda?.nombre ?? 'Tienda'}</Title>
      <Subtitle>Apenas llegues, antes de conversar con el encargado.</Subtitle>

      <Pressable
        style={styles.capture}
        onPress={() => capturar(`jornadas/${jornada?.id}/visitas/${tiendaId}/antes-${Date.now()}.jpg`)}
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.captureText}>Fotografía — ANTES{'\n'}Exhibidor, refrigerador o góndola con productos</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton
        title="Continuar"
        disabled={!fotoUrl || subiendo}
        loading={subiendo}
        onPress={() => {
          actualizarBorrador({ fotoAntesUrl: fotoUrl! });
          navigation.navigate('JefeTienda', { tiendaId });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  capture: {
    aspectRatio: 4 / 3,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  captureText: { textAlign: 'center', color: colors.inkSoft, fontWeight: '600', paddingHorizontal: spacing.lg },
  preview: { width: '100%', height: '100%' },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
});
