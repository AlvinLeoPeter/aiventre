import { useEffect, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useIsFocused } from 'expo-router';

import { PHONE_WIDTH, useWide } from '@/lib/layout';
import { usePrefs } from '@/lib/prefs';
import { GLOWS, useTheme } from '@/lib/theme';

// Where each blob sits (as a share of the screen width), how far it drifts and how long one sweep takes.
const BLOBS = [
  { x: -0.45, y: -0.3, size: 1.3, dx: 0.18, dy: 0.12, ms: 14000 },
  { x: 0.35, y: 0.45, size: 1.2, dx: -0.15, dy: 0.18, ms: 17000 },
  { x: -0.3, y: 1.25, size: 1.15, dx: 0.12, dy: -0.15, ms: 19000 },
];

/** A soft round patch of colour that fades to nothing at its edge — a blur without the cost of one. */
function Spot({ color }: { color: string }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.9} />
          <Stop offset="0.5" stopColor={color} stopOpacity={0.4} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function Blob({ blob, from, to, width, move }: { blob: (typeof BLOBS)[number]; from: string; to: string; width: number; move: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!move) {
      cancelAnimation(t);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: blob.ms, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [move, blob.ms, t]);

  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: t.get() * blob.dx * width }, { translateY: t.get() * blob.dy * width }, { scale: 1 + 0.12 * t.get() }],
  }));
  // The second colour fades in as the blob drifts, so the colours slowly change too.
  const shift = useAnimatedStyle(() => ({ opacity: t.get() }));
  const size = blob.size * width;

  return (
    <Animated.View style={[{ position: 'absolute', left: blob.x * width, top: blob.y * width, width: size, height: size }, drift]}>
      <Spot color={from} />
      <Animated.View style={[StyleSheet.absoluteFill, shift]}>
        <Spot color={to} />
      </Animated.View>
    </Animated.View>
  );
}

/** The glow itself: three drifting, colour-changing patches over the whole of its parent. */
function GlowLayer({ width, move }: { width: number; move: boolean }) {
  const { scheme } = useTheme();
  const g = GLOWS[scheme];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: g.strength, overflow: 'hidden' }]}>
      {BLOBS.map((b, i) => (
        <Blob key={i} blob={b} from={g.from[i]} to={g.to[i]} width={width} move={move} />
      ))}
    </View>
  );
}

/**
 * The slow colour glow behind a screen. It only moves while its screen is on show, and stays
 * still when the phone asks for less motion or the owner turned it off in settings. On a
 * computer's wide layout there's one glow behind the sidebar and the page together instead
 * (BackdropGlow), so this draws nothing there.
 */
export function Glow() {
  const { glow } = usePrefs();
  // In a narrow browser window the app is a centred column, so size the glow to that column.
  const window = useWindowDimensions().width;
  const wide = useWide();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  if (glow === 'off' || wide) return null;
  return <GlowLayer width={Math.min(window, PHONE_WIDTH)} move={focused && !reduced && glow === 'on'} />;
}

/** The desktop layout's one glow, behind the sidebar and every page, so they read as one surface. */
export function BackdropGlow() {
  const { glow } = usePrefs();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  if (glow === 'off') return null;
  return <GlowLayer width={width} move={!reduced && glow === 'on'} />;
}
