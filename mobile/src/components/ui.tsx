import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Glow } from '@/components/glow';
import { useWide } from '@/lib/layout';
import { STATUS_LABEL, type Status } from '@/lib/model';
import { makeStyles, type Palette, R, S, TILES, type Tone, type, useTheme } from '@/lib/theme';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const success = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** Text colour, pill background and pill text for each machine state. */
export const statusColors = (c: Palette, s: Status) =>
  ({
    running: { fg: c.running, pill: c.runningPill, ink: c.runningInk },
    soon: { fg: c.soon, pill: c.soonPill, ink: c.soonInk },
    check: { fg: c.soon, pill: c.soonPill, ink: c.soonInk },
    idle: { fg: c.idle, pill: c.idlePill, ink: c.idleInk },
    maintenance: { fg: c.off, pill: c.offPill, ink: c.offInk },
  })[s];

// Phones only accept a few named curves as text, so custom curves go through cubicBezier().
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Anything tappable. It sinks slightly the moment a finger lands (not when it lifts),
 * which is what makes a tap feel instant. Skipped when the phone asks for less motion.
 */
export function Press({
  onPress,
  style,
  pressedStyle,
  disabled,
  scale = 0.97,
  label,
  children,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scale?: number;
  label?: string;
  children: ReactNode;
}) {
  const [down, setDown] = useState(false);
  const reduced = useReducedMotion();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        style,
        down && pressedStyle,
        {
          transform: [{ scale: down && !reduced ? scale : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 120,
          transitionTimingFunction: EASE_OUT,
        },
      ]}>
      {children}
    </AnimatedPressable>
  );
}

/**
 * A scrolling page over the slow colour glow. Keeps the field you're typing in visible above
 * the keyboard: on iOS the scroll view grows by the keyboard's height; on Android the page
 * shrinks to fit. Room at the bottom so the floating tab bar never covers the last card.
 */
export function Screen({
  children,
  title,
  sub,
  padTop = true,
  maxWidth = 880,
}: {
  children: ReactNode;
  title?: string;
  sub?: string;
  padTop?: boolean;
  maxWidth?: number; // on a wide computer screen, how wide the page's content gets
}) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const s = useStyles();
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'android' ? 'height' : undefined}>
      <Glow />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: padTop ? insets.top + (wide ? S.xl : S.md) : S.lg,
          paddingHorizontal: wide ? S.xxl : S.lg,
          paddingBottom: wide ? S.xxl * 2 : 112,
          ...(wide && { width: '100%', maxWidth, alignSelf: 'center' as const }),
          gap: S.lg,
        }}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        {(title || sub) && (
          <View style={{ gap: 2, marginBottom: S.xs }}>
            {!!sub && <Text style={s.sub}>{sub}</Text>}
            {!!title && <Text style={s.title}>{title}</Text>}
          </View>
        )}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A card: frosted glass with a bright hairline edge. */
export function Box({ children, style, flush }: { children: ReactNode; style?: StyleProp<ViewStyle>; flush?: boolean }) {
  const s = useStyles();
  return <View style={[s.box, flush && { padding: 0, gap: 0 }, style]}>{children}</View>;
}

/** A hairline between rows inside a Box. */
export function Rule({ inset = 0 }: { inset?: number }) {
  const s = useStyles();
  return <View style={[s.rule, { marginLeft: inset }]} />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'accent' | 'secondary' | 'quiet' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  flex?: boolean;
  small?: boolean;
};

export function Button({ label, onPress, kind = 'primary', icon, disabled, flex, small }: ButtonProps) {
  const { c } = useTheme();
  const s = useStyles();
  const look = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    accent: { bg: c.accent, fg: c.onAccent, border: c.accent },
    secondary: { bg: c.surface, fg: c.text, border: c.edge },
    quiet: { bg: 'transparent', fg: c.muted, border: 'transparent' },
    danger: { bg: 'transparent', fg: c.idle, border: 'transparent' },
  }[kind];
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        small && s.buttonSmall,
        { backgroundColor: look.bg, borderColor: look.border },
        flex && { flex: 1 },
        disabled && { opacity: 0.35 },
      ]}>
      {icon && <Ionicons name={icon} size={small ? 16 : 18} color={look.fg} />}
      <Text style={[s.buttonText, small && { fontSize: 14 }, { color: look.fg }]}>{label}</Text>
    </Press>
  );
}

export function Chip({ label, selected, onPress, count }: { label: string; selected?: boolean; onPress: () => void; count?: number }) {
  const s = useStyles();
  return (
    <Press onPress={onPress} style={[s.chip, selected && s.chipOn]}>
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
      {!!count && <Text style={[s.chipText, s.chipTextOn, type.num, { opacity: 0.7 }]}>×{count}</Text>}
    </Press>
  );
}

/** Pick one of a few options, e.g. System / Light / Dark. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const s = useStyles();
  return (
    <View style={s.segments} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[s.segment, on && s.segmentOn]}>
            <Text style={[s.segmentText, on && s.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatusPill({ status, text }: { status: Status; text?: string }) {
  const { c } = useTheme();
  const s = useStyles();
  const col = statusColors(c, status);
  return (
    <View style={[s.pill, { backgroundColor: col.pill }]}>
      <View style={[s.dot, { backgroundColor: col.fg }]} />
      <Text style={[s.pillText, { color: col.ink }]}>{text ?? STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function Progress({ value, color }: { value: number; color: string }) {
  const s = useStyles();
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Section({ title, right }: { title: string; right?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.section}>
      <Text style={s.heading}>{title}</Text>
      {right}
    </View>
  );
}

/** A small text action at the end of a section heading. */
export function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={12}
      onPress={() => {
        tap();
        onPress();
      }}>
      <Text style={s.link}>{label}</Text>
    </Pressable>
  );
}

export function Label({ children }: { children: string }) {
  const s = useStyles();
  return <Text style={s.label}>{children}</Text>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { c } = useTheme();
  const s = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={c.faint}
        selectionColor={c.text}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[s.input, focused && { borderColor: c.text }, props.style]}
      />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

/**
 * A list typed as text, kept as typed until you leave the field: comma-separated, or one per
 * line (`lines`) when the items themselves can contain commas, like "Valve maker, Bhosari".
 */
export function ListField({
  label,
  placeholder,
  hint,
  value,
  onChange,
  lines,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  value?: string[];
  onChange: (v: string[]) => void;
  lines?: boolean;
}) {
  const [text, setText] = useState((value ?? []).join(lines ? '\n' : ', '));
  const toList = (t: string) => t.split(lines ? '\n' : ',').map((x) => x.trim()).filter(Boolean);
  return (
    <Field
      label={label}
      placeholder={placeholder}
      hint={hint}
      value={text}
      onChangeText={setText}
      onBlur={() => onChange(toList(text))}
      multiline={lines}
      style={lines ? { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' } : undefined}
    />
  );
}

const useStyles = makeStyles((c) => ({
  tile: { borderRadius: 22, padding: 14, gap: 6, borderWidth: 2 },
  tileDisc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, ...type.num },
  tileLabel: { fontSize: 12, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: c.ground },
  title: { ...type.title, color: c.text },
  sub: { ...type.meta, color: c.muted },
  box: { backgroundColor: c.surface, borderRadius: R.box, borderWidth: 1, borderColor: c.border, padding: S.lg, gap: S.md },
  rule: { height: 1, backgroundColor: c.rule },
  button: {
    minHeight: 50,
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: S.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  buttonSmall: { minHeight: 44, paddingHorizontal: S.lg },
  buttonText: { fontSize: 15, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: c.edge,
    backgroundColor: c.surface,
  },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: c.text },
  chipTextOn: { color: c.onPrimary },
  segments: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: R.pill, padding: 4, borderWidth: 1, borderColor: c.border },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  segmentOn: { backgroundColor: c.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: c.muted },
  segmentTextOn: { color: c.onPrimary, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 9, borderRadius: R.pill, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: S.md },
  heading: { ...type.heading, color: c.text },
  link: { fontSize: 15, fontWeight: '700', color: c.accent },
  label: { ...type.label, color: c.muted },
  hint: { ...type.meta, color: c.faint },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.edge,
    borderRadius: R.control,
    paddingHorizontal: 14,
    minHeight: 50,
    color: c.text,
    fontSize: 16,
  },
}));

/** A coloured tile with a big number: one count at a glance, tap to see those. */
export function Tile({
  tone,
  icon,
  value,
  label,
  onPress,
  on,
  basis = '45%',
}: {
  tone: Tone;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  onPress?: () => void;
  on?: boolean;
  basis?: `${number}%`; // share of the row: two tiles a row on a phone, four on a computer
}) {
  const { scheme } = useTheme();
  const t = TILES[scheme][tone];
  const s = useStyles();
  const body = (
    <View style={[s.tile, { backgroundColor: t.bg, borderColor: on ? t.disc : 'transparent' }]}>
      <View style={[s.tileDisc, { backgroundColor: t.disc }]}>
        <Ionicons name={icon} size={16} color="#ffffff" />
      </View>
      <Text style={[s.tileValue, { color: t.ink }]}>{value}</Text>
      <Text style={[s.tileLabel, { color: t.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return <View style={{ flexBasis: basis, flexGrow: 1 }}>{body}</View>;
  return (
    <Press onPress={onPress} label={`${value} ${label}`} scale={0.96} style={{ flexBasis: basis, flexGrow: 1 }}>
      {body}
    </Press>
  );
}
