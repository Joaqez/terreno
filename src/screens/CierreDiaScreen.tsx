import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CierreDia'>;

export default function CierreDiaScreen({ navigation }: Props) {
  const { tiendas, visitas, vendedor, finalizarJornada } = useTerrenoStore();

  const minimas = tiendas.filter((t) => t.esMinima);
  const visitadasIds = new Set(visitas.map((v) => v.tiendaId));
  const visitadas = minimas.filter((t) => visitadasIds.has(t.id)).length;
  const metaDelDia = vendedor.minimoDiario > 0 ? vendedor.minimoDiario : minimas.length;

  return (
    <Screen>
      <Title>Cierre de día</Title>
      <Subtitle>Revisa cómo te fue antes de terminar tu jornada.</Subtitle>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.k}>Tiendas mínimas visitadas</Text>
          <Text style={styles.v}>
            {visitadas} de {metaDelDia}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Visitas registradas</Text>
          <Text style={styles.v}>{visitas.length}</Text>
        </View>
      </View>

      <PrimaryButton
        title="Finalizar día"
        onPress={() => {
          finalizarJornada();
          navigation.reset({ index: 0, routes: [{ name: 'ResumenDia' }] });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { color: colors.inkSoft, fontSize: 13.5 },
  v: { fontWeight: '600', fontSize: 13.5, color: colors.ink },
});
