import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

/** Contenedor de pantalla estándar: fondo + padding + safe area. */
export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <View style={[styles.screenBody, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: ViewProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  hint,
  ...rest
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkFaint} style={styles.input} {...rest} />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnPrimary,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accentInk} />
      ) : (
        <Text style={styles.btnPrimaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}>
      <Text style={styles.btnGhostText}>{title}</Text>
    </Pressable>
  );
}

export function TextLink({ title, onPress, tone = 'accent' }: { title: string; onPress: () => void; tone?: 'accent' | 'danger' }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={[styles.textLink, tone === 'danger' && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'pending' | 'done' | 'accent' | 'neutral' | 'danger' }) {
  return (
    <View style={[styles.badge, badgeTones[tone]]}>
      <Text style={[styles.badgeText, badgeTextTones[tone]]}>{children}</Text>
    </View>
  );
}

const badgeTones = StyleSheet.create({
  pending: { backgroundColor: colors.amberSoft },
  done: { backgroundColor: colors.successSoft },
  accent: { backgroundColor: colors.accentSoft },
  neutral: { backgroundColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft },
});
const badgeTextTones = StyleSheet.create({
  pending: { color: colors.amber },
  done: { color: colors.success },
  accent: { color: colors.accent },
  neutral: { color: colors.inkSoft },
  danger: { color: colors.danger },
});

const typographySize = { xs: 12, sm: 13, md: 14.5, lg: 19, xl: 22 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenBody: { flex: 1, padding: spacing.lg },
  title: { fontSize: typographySize.lg, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  subtitle: { fontSize: typographySize.sm, color: colors.inkSoft, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: spacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: typographySize.md,
    color: colors.ink,
    backgroundColor: colors.bgElevated,
  },
  fieldHint: { fontSize: 12, color: colors.inkFaint, marginTop: 5 },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: colors.accentInk, fontWeight: '700', fontSize: typographySize.md },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { color: colors.inkSoft, fontWeight: '600', fontSize: typographySize.md },
  textLink: { color: colors.accent, fontWeight: '600', fontSize: 13.5 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
