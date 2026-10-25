import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { STATUS_LABEL, type Status } from '@/lib/model';
import { C, R, S, T } from '@/lib/theme';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const STATUS_COLOR: Record<Status, string> = {
  running: C.running,
  soon: C.soon,
  check: C.soon,
  idle: C.idle,
  maintenance: C.maintenance,
};

/** A scrolling page with safe-area padding (top only — the tab bar handles the bottom). */
export function Screen({ children, padTop = true }: { children: ReactNode; padTop?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: padTop ? insets.top + S.lg : S.lg, paddingHorizontal: S.lg, paddingBottom: S.xxl * 2, gap: S.lg }}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'good' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  flex?: boolean;
};

export function Button({ label, onPress, kind = 'primary', icon, disabled, flex }: ButtonProps) {
  const look = {
    primary: { bg: C.brand, fg: '#fff', border: C.brand },
    secondary: { bg: C.cardRaised, fg: C.text, border: C.border },
    good: { bg: C.running, fg: '#062314', border: C.running },
    danger: { bg: 'transparent', fg: C.idle, border: 'transparent' },
    ghost: { bg: 'transparent', fg: C.textDim, border: 'transparent' },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: look.bg, borderColor: look.border },
        flex && { flex: 1 },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
      ]}>
      {icon && <Ionicons name={icon} size={18} color={look.fg} />}
      <Text style={[styles.buttonText, { color: look.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, count }: { label: string; selected?: boolean; onPress: () => void; count?: number }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, selected && { backgroundColor: C.brandSoft, borderColor: C.brand }]}>
      <Text style={[styles.chipText, selected && { color: C.text }]}>{label}</Text>
      {!!count && (
        <View style={styles.chipCount}>
          <Text style={styles.chipCountText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const color = STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function Progress({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={T.label}>{children}</Text>
      {right}
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: S.sm }}>
      <Text style={T.label}>{label}</Text>
      <TextInput placeholderTextColor={C.textFaint} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  button: {
    minHeight: 50,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textDim },
  chipCount: { backgroundColor: C.brand, borderRadius: R.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chipCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.sm },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: 14,
    color: C.text,
    fontSize: 16,
  },
});
