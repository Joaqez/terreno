import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, GhostButton, PrimaryButton, Screen } from '../components/ui';
import { colors, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VisitaRegistrada'>;

export default function VisitaRegistradaScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, visitas } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const visita = [...visitas].reverse().find((v) => v.tiendaId === tiendaId);

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 20 }}>
        <View style={styles.check}>
          <Text style={{ fontSize: 26 }}>✓</Text>
        </View>
        <Text style={styles.title}>Visita registrada</Text>
        <Text style={styles.subtitle}>Tu bitácora fue guardada correctamente.</Text>
      </View>

      <Card>
        <Row k="Tienda" v={tienda?.nombre ?? '—'} />
        <Row k="Tipo de visita" v={visita?.tipo === 'venta' ? 'Venta' : 'Mantención'} />
        {visita?.tipo === 'venta' && (
          <Row
            k="Pedido"
            v={`${visita.pedido?.length ?? 0} productos · ${(visita.pedido ?? []).reduce((n, i) => n + i.cantidad, 0)} unidades`}
          />
        )}
        <Row k="Fotos" v="Antes ✓ · Después ✓" />
      </Card>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <PrimaryButton title="Volver a la ruta" onPress={() => navigation.navigate('Ruta')} />
        <GhostButton title="Ir al panel principal" onPress={() => navigation.navigate('Home')} />
      </View>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkSoft, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowK: { color: colors.inkSoft, fontSize: 13.5 },
  rowV: { fontWeight: '600', fontSize: 13.5, color: colors.ink },
});
