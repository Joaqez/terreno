import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminVendedores'>;

export default function AdminVendedoresScreen({ navigation }: Props) {
  const { vendedoresDisponibles, cargarVendedores, tiendas } = useTerrenoStore();

  useEffect(() => {
    cargarVendedores();
  }, [cargarVendedores]);

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>Vendedores</Title>
      <Subtitle>{vendedoresDisponibles.length} cuentas registradas</Subtitle>

      <FlatList
        data={[...vendedoresDisponibles].sort((a, b) => a.nombre.localeCompare(b.nombre))}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => {
          const tiendasAsignadas = tiendas.filter((t) => t.vendedorAsignadoId === item.id).length;
          return (
            <Pressable style={styles.fila} onPress={() => navigation.navigate('AdminVendedorDetalle', { vendedorId: item.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge tone={item.rol === 'supervisor' ? 'accent' : 'neutral'}>
                  {item.rol === 'supervisor' ? 'Supervisor' : 'Vendedor'}
                </Badge>
                <Text style={styles.meta}>
                  {tiendasAsignadas} tiendas · meta {item.minimoDiario > 0 ? item.minimoDiario : tiendasAsignadas}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  nombre: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  email: { fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  meta: { fontSize: 11, color: colors.inkFaint },
});
