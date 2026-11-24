import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

/**
 * Recuadro para tomar una foto (antes / después). Dice explícitamente que se
 * toca — antes era un recuadro punteado vacío y no se entendía. Con foto,
 * muestra "Toca para repetir" y si se está subiendo.
 */
export default function CuadroFoto({
  fotoUri,
  subiendo,
  onPress,
  ayuda,
}: {
  fotoUri: string | null;
  subiendo: boolean;
  onPress: () => void;
  /** Qué fotografiar. */
  ayuda: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.cuadro, !fotoUri && styles.cuadroVacio, pressed && { opacity: 0.85 }]} onPress={onPress}>
      {fotoUri ? (
        <>
          <Image source={{ uri: fotoUri }} style={styles.preview} />
          <View style={styles.etiqueta}>
            {subiendo ? <ActivityIndicator color={colors.accentInk} size="small" /> : null}
            <Text style={styles.etiquetaTexto}>{subiendo ? 'Subiendo…' : 'Toca para repetir'}</Text>
          </View>
        </>
      ) : (
        <View style={styles.vacio}>
          <Ionicons name="camera-outline" size={44} color={colors.accent} style={{ marginBottom: spacing.xs }} />
          <Text style={styles.accion}>Toca para tomar la foto</Text>
          <Text style={styles.ayuda}>{ayuda}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cuadro: {
    width: '100%',
    // En computador no crece más que esto (en celular no se nota).
    maxWidth: 520,
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadroVacio: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, backgroundColor: colors.accentSoft },
  preview: { width: '100%', height: '100%' },
  vacio: { alignItems: 'center', paddingHorizontal: spacing.xl },
  accion: { fontSize: 17, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  ayuda: { fontSize: 14.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xs },
  etiqueta: {
    position: 'absolute',
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(15,25,22,0.7)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  etiquetaTexto: { color: colors.accentInk, fontWeight: '600', fontSize: 14 },
});
