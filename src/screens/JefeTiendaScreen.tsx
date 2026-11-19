import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import JefeTiendaModal from '../components/JefeTiendaModal';
import { GhostButton, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { JefeTienda } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'JefeTienda'>;

/**
 * "¿Con quién hablaste?" — aparece siempre después de la foto de antes
 * (2026-11-16). El vendedor elige un jefe ya registrado, crea uno nuevo, o
 * toca "Omitir". Ver "Jefes de tienda" en CLAUDE.md.
 */
export default function JefeTiendaScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, jefesTienda, borrador, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const jefes = jefesTienda.filter((j) => j.tiendaId === tiendaId && j.activo);
  const [modal, setModal] = useState<{ jefe: JefeTienda | null } | null>(null);

  function continuarCon(jefe: JefeTienda | null) {
    actualizarBorrador({ jefeTiendaId: jefe?.id, jefeTiendaNombre: jefe?.nombre });
    navigation.navigate('Inventario', { tiendaId });
  }

  return (
    <Screen>
      <Title>¿Con quién hablaste?</Title>
      <Subtitle>{tienda?.nombre}</Subtitle>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {jefes.length ? (
          jefes.map((j) => (
            <Pressable
              key={j.id}
              style={[styles.fila, borrador?.jefeTiendaId === j.id && styles.filaSeleccionada]}
              onPress={() => continuarCon(j)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{j.nombre}</Text>
                {j.telefono || j.email ? (
                  <Text style={styles.meta}>{[j.telefono, j.email].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
              <TextLink title="Editar" onPress={() => setModal({ jefe: j })} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.vacio}>Aún no hay jefes de tienda registrados en esta tienda.</Text>
        )}

        <Pressable style={styles.nuevo} onPress={() => setModal({ jefe: null })}>
          <Text style={styles.nuevoTexto}>+ Nuevo jefe de tienda</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.pie}>
        <GhostButton title="Omitir" onPress={() => continuarCon(null)} />
      </View>

      <JefeTiendaModal
        visible={!!modal}
        tiendaId={tiendaId}
        jefe={modal?.jefe}
        onCerrar={() => setModal(null)}
        onGuardado={(jefe) => {
          // Uno recién creado es con quien se está hablando: se elige y sigue.
          if (!modal?.jefe) continuarCon(jefe);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  filaSeleccionada: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  nombre: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  vacio: { color: colors.inkSoft, textAlign: 'center', marginVertical: spacing.lg },
  nuevo: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nuevoTexto: { color: colors.accent, fontWeight: '700', fontSize: 14.5 },
  pie: { paddingTop: spacing.md },
});
