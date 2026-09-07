import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TipoVisita'>;

/**
 * Pantalla clave del feedback de la reunión del 2026-09-07: la mayoría de las
 * visitas son de venta, así que el flujo real es "foto → preguntar en la
 * tienda si necesitan stock → recién ahí se sabe si es venta o mantención",
 * en vez de pedirle al vendedor que elija el tipo de visita antes de hablar
 * con el encargado. Ver CLAUDE.md.
 */
export default function TipoVisitaScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);

  function elegir(tipo: 'venta' | 'mantencion') {
    actualizarBorrador({ tipo });
    if (tipo === 'venta') {
      navigation.navigate('DetalleVenta', { tiendaId });
    } else {
      navigation.navigate('FotoDespues', { tiendaId, tipo });
    }
  }

  return (
    <Screen>
      <Title>{tienda?.nombre ?? 'Tienda'}</Title>
      <Subtitle>¿La tienda necesita más stock de nuestros productos? Pregúntale al encargado antes de continuar.</Subtitle>

      <Pressable style={styles.choice} onPress={() => elegir('venta')}>
        <View style={styles.icon}>
          <Text>🚚</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceTitle}>Sí, necesitan stock</Text>
          <Text style={styles.choiceText}>Se registra como venta: reposición o ingreso de productos.</Text>
        </View>
      </Pressable>

      <Pressable style={styles.choice} onPress={() => elegir('mantencion')}>
        <View style={styles.icon}>
          <Text>🔧</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceTitle}>No necesitan por ahora</Text>
          <Text style={styles.choiceText}>Se registra como mantención, sin entrega de producto.</Text>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  icon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontWeight: '700', fontSize: 15, color: colors.ink, marginBottom: 2 },
  choiceText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 17 },
});
