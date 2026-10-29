import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { makeStyles, type, useTheme } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * One ring, one number: how much of the next two weeks is booked. It fills in when the
 * screen opens and moves when a job changes — the one piece of motion on Today.
 */
export function Ring({ value, size = 104, stroke = 11, label, caption, bare }: { value: number; size?: number; stroke?: number; label: string; caption?: string; bare?: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const shown = useSharedValue(reduced ? value : 0);

  useEffect(() => {
    shown.set(reduced ? value : withTiming(value, { duration: 900, easing: EASE_OUT }));
  }, [value, reduced, shown]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - Math.min(1, Math.max(0, shown.get()))) }));

  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityLabel={`${Math.round(value * 100)}% ${label}${caption ? `, ${caption}` : ''}`}>
      {/* Rotated so the ring starts at twelve o'clock, like a watch. */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.accent} />
            <Stop offset="1" stopColor={c.accent2} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          animatedProps={props}
          fill="none"
        />
      </Svg>
      {!bare && (
        <View style={s.center}>
          <Text style={s.value}>{Math.round(value * 100)}%</Text>
          <Text style={s.label}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  value: { ...type.value, fontSize: 24, color: c.text },
  label: { fontSize: 12, color: c.muted, marginTop: -2 },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, backgroundColor: c.raised, borderWidth: 1, borderColor: c.border },
  tileValue: { fontSize: 16, fontWeight: '800', color: c.text, ...type.num },
  tileLabel: { fontSize: 11, fontWeight: '600', color: c.muted },
}));

/** A small still ring with a number above it: one part of a price, as a share of the whole. */
export function RingTile({ value, label, share, color }: { value: string; label: string; share: number; color: string }) {
  const { c } = useTheme();
  const s = useStyles();
  const size = 52;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const part = Math.min(1, Math.max(0, share));
  return (
    <View style={s.tile} accessible accessibilityLabel={`${label}: ${value}, ${Math.round(part * 100)}% of the price`}>
      <Text style={s.tileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${length * part} ${length}`} fill="none" />
      </Svg>
    </View>
  );
}
