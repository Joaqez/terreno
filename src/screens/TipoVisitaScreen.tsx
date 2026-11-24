import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TipoVisita'>;

/**
 * "¿Hay pedido?" — desde 2026-11-18 la app ya no distingue venta de
 * mantención: solo "Con pedido" (abre la lista de productos) o "Sin pedido".
 * En ambos casos después viene el checklist del exhibidor. Internamente se
 * sigue guardando `tipo: 'venta' | 'mantencion'` para no romper las visitas
 * antiguas. Ver CLAUDE.md.
 */
export default function TipoVisitaScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, actualizarBorrador, preguntasMantencion } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);

  function elegir(tipo: 'venta' | 'mantencion') {
    if (tipo === 'venta') {
      actualizarBorrador({ tipo });
      navigation.navigate('Pedido', { tiendaId });
    } else {
      // Si antes eligió "Con pedido" y volvió atrás, se descarta ese pedido.
      actualizarBorrador({ tipo, pedido: undefined });
      navigation.navigate(preguntasMantencion.some((p) => p.activa) ? 'Checklist' : 'FotoDespues', { tiendaId, tipo });
    }
  }

  return (
    <Screen>
      <Title>¿Hay pedido?</Title>
      <Subtitle>¿La tienda hace un pedido de nuestros productos?</Subtitle>

      <Pressable style={styles.choice} onPress={() => elegir('venta')}>
        <View style={styles.icon}>
          <Ionicons name="cube-outline" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceTitle}>Con pedido</Text>
          <Text style={styles.choiceText}>Eliges los productos y cantidades del pedido.</Text>
        </View>
      </Pressable>

      <Pressable style={styles.choice} onPress={() => elegir('mantencion')}>
        <View style={styles.icon}>
          <Ionicons name="construct-outline" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceTitle}>Sin pedido</Text>
          <Text style={styles.choiceText}>Sigues directo con la mantención del exhibidor.</Text>
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
  icon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontWeight: '700', fontSize: 16.5, color: colors.ink, marginBottom: 2 },
  choiceText: { fontSize: 14, color: colors.inkSoft, lineHeight: 19 },
});
