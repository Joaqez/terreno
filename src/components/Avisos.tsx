import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { useAvisos } from '../lib/avisos';

/** Muestra el aviso actual (ver `avisar()` en src/lib/avisos.ts). Va una sola
 * vez en App.tsx, encima de todo. Tocarlo lo cierra. */
export default function Avisos() {
  const { aviso, cerrar } = useAvisos();
  const insets = useSafeAreaInsets();
  if (!aviso) return null;
  const error = aviso.tono === 'error';
  return (
    <View pointerEvents="box-none" style={[styles.capa, { bottom: insets.bottom + 90 }]}>
      <Pressable onPress={cerrar} style={[styles.aviso, error && styles.avisoError]}>
        <Ionicons name={error ? 'alert-circle' : 'checkmark-circle'} size={20} color={colors.accentInk} />
        <Text style={styles.texto}>{aviso.texto}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 440,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avisoError: { backgroundColor: colors.danger },
  texto: { color: colors.accentInk, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
