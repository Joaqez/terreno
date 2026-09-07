import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, GhostButton, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { vendedor, jornada, tiendas, visitas } = useTerrenoStore();

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (!jornada) {
    return (
      <Screen>
        <Title>Hola, {vendedor.nombre.split(' ')[0]}</Title>
        <Subtitle>{fecha}</Subtitle>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Tu día aún no comienza</Text>
          <Text style={styles.heroText}>
            Registra el kilometraje inicial de tu vehículo para comenzar tu ruta de hoy.
          </Text>
          <PrimaryButton title="Iniciar día" onPress={() => navigation.navigate('KmInicio')} />
        </View>
      </Screen>
    );
  }

  const minimas = tiendas.filter((t) => t.esMinima);
  const visitadasIds = new Set(visitas.map((v) => v.tiendaId));
  const visitadas = minimas.filter((t) => visitadasIds.has(t.id)).length;
  const entregas = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'venta').length;
  const mantenciones = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'mantencion').length;

  return (
    <Screen>
      <Title>Hola, {vendedor.nombre.split(' ')[0]}</Title>
      <Subtitle>{fecha}</Subtitle>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ruta en curso</Text>
        <Text style={styles.heroText}>
          {visitadas} de {minimas.length} tiendas mínimas visitadas
        </Text>
        <PrimaryButton title="Ver ruta del día" onPress={() => navigation.navigate('Ruta')} />
      </View>

      <View style={styles.statsRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statNum}>{entregas}</Text>
          <Text style={styles.statLbl}>Ventas hoy</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statNum}>{mantenciones}</Text>
          <Text style={styles.statLbl}>Mantenciones hoy</Text>
        </Card>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <GhostButton title="Finalizar día" onPress={() => navigation.navigate('CierreDia')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroTitle: { color: colors.accentInk, fontWeight: '700', fontSize: 17, marginBottom: 6 },
  heroText: { color: colors.accentInk, opacity: 0.9, marginBottom: spacing.lg, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statNum: { fontSize: 21, fontWeight: '700', color: colors.ink },
  statLbl: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
});
