import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { usePrefs } from './prefs';

/**
 * Aiventre's look: frosted-glass cards over a slow colour glow, big bold numbers, colour
 * where it means something (a machine's state, money owed). Every screen reads its colours from useTheme(), so light and
 * dark mode are the same layout with a different palette.
 */

const light = {
  ground: '#f4f5fa',
  // Cards are frosted glass: white, slightly see-through, so the colour glow behind shows softly.
  surface: 'rgba(255,255,255,0.66)',
  raised: 'rgba(255,255,255,0.45)',
  active: '#e9ebf2',
  border: 'rgba(255,255,255,0.95)',
  edge: 'rgba(21,23,28,0.10)', // fields and other outlines that must show on glass
  rule: 'rgba(21,23,28,0.07)',
  control: '#c9cdd8',
  text: '#15171c',
  muted: '#5b6070',
  faint: '#6b7080',
  primary: '#15171c',
  onPrimary: '#ffffff',
  accent: '#2f4bd1',
  accent2: '#7b4fe0',
  onAccent: '#ffffff',
  bar: '#ffffff', // the floating tab bar: solid, so text scrolling under it doesn't show

  running: '#2b8a3e',
  runningPill: '#ddf3e2',
  runningInk: '#17542a',
  soon: '#b45309',
  soonPill: '#fff1db',
  soonInk: '#7a3e06',
  idle: '#c2410c',
  idlePill: '#ffe6d5',
  idleInk: '#7a2a05',
  off: '#9ca3af',
  offPill: 'rgba(21,23,28,0.06)',
  offInk: '#3f3f46',

  // The 14-day board: booked days, free days. Rings run on `track`.
  booked: '#2f4bd1',
  free: '#ffd8c2',
  track: 'rgba(21,23,28,0.07)',
};

export type Palette = typeof light;

// Apple-style dark: true black, frosted cards, bright system colours.
const dark: Palette = {
  ground: '#000000',
  surface: 'rgba(255,255,255,0.08)',
  raised: 'rgba(255,255,255,0.05)',
  active: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.12)',
  edge: 'rgba(255,255,255,0.18)',
  rule: 'rgba(255,255,255,0.08)',
  control: '#48484a',
  text: '#f5f5f7',
  muted: '#aeaeb2',
  faint: '#8e8e93',
  primary: '#f5f5f7',
  onPrimary: '#000000',
  accent: '#4c7dff',
  accent2: '#9b6bff',
  onAccent: '#ffffff',
  bar: '#1e1e22',

  running: '#30d158',
  runningPill: 'rgba(48,209,88,0.16)',
  runningInk: '#30d158',
  soon: '#ffd60a',
  soonPill: 'rgba(255,214,10,0.14)',
  soonInk: '#ffd60a',
  idle: '#ff9f0a',
  idlePill: 'rgba(255,159,10,0.18)',
  idleInk: '#ffb340',
  off: '#636366',
  offPill: 'rgba(255,255,255,0.08)',
  offInk: '#aeaeb2',

  booked: '#4c7dff',
  free: 'rgba(255,159,10,0.30)',
  track: 'rgba(255,255,255,0.10)',
};

/**
 * The soft colours drifting behind every screen: each blob slowly fades from its first
 * colour to its second and back. Dark mode uses deeper ones at lower strength.
 */
export const GLOWS = {
  light: { from: ['#8fa8ff', '#c9a8ff', '#8ee3cf'], to: ['#a8c4ff', '#f5b8da', '#a8e6ff'], strength: 0.75 },
  dark: { from: ['#2f4bd1', '#7a3fd1', '#0f7a6e'], to: ['#3f6bff', '#b03fd1', '#0f5a9a'], strength: 0.6 },
} as const;

/** Coloured stat tiles (Buyers' counts and the like): background, number and label ink, icon disc. */
export const TILES = {
  light: {
    blue: { bg: '#dce4ff', ink: '#1a2c8a', disc: '#2f4bd1' },
    green: { bg: '#ddf3e2', ink: '#17542a', disc: '#2b8a3e' },
    orange: { bg: '#ffe6d5', ink: '#7a2a05', disc: '#d9480f' },
    pink: { bg: '#fbe0ec', ink: '#7a1238', disc: '#c2255c' },
  },
  dark: {
    blue: { bg: 'rgba(76,125,255,0.20)', ink: '#a8c0ff', disc: '#4c7dff' },
    green: { bg: 'rgba(48,209,88,0.18)', ink: '#8ce0a2', disc: '#30d158' },
    orange: { bg: 'rgba(255,159,10,0.20)', ink: '#ffc27a', disc: '#ff9f0a' },
    pink: { bg: 'rgba(255,55,95,0.20)', ink: '#ff9cb2', disc: '#ff375f' },
  },
} as const;
export type Tone = keyof typeof TILES.light;

export const PALETTES = { light, dark };
export type Scheme = keyof typeof PALETTES;

/** The scheme in force: the user's choice in My shop, else the phone's setting. */
export function useScheme(): Scheme {
  const system = useColorScheme();
  const { theme } = usePrefs();
  if (theme !== 'system') return theme;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const scheme = useScheme();
  return { c: PALETTES[scheme], scheme };
}

type Styles = Parameters<typeof StyleSheet.create>[0];

/** Styles that depend on colours, built once per scheme: const useStyles = makeStyles((c) => ({ … })). */
export function makeStyles<T extends Styles>(build: (c: Palette) => T & Styles) {
  const cache: Partial<Record<Scheme, Readonly<T>>> = {};
  return function useStyles() {
    const scheme = useScheme();
    return useMemo(() => (cache[scheme] ??= StyleSheet.create(build(PALETTES[scheme]))), [scheme]);
  };
}

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Two radii and a pill: fields, cards, and round-ended buttons and chips. */
export const R = { control: 14, box: 24, pill: 999 } as const;

const num = { fontVariant: ['tabular-nums' as const] };

/** One typeface (the phone's own), a few clear steps. */
export const type = {
  title: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
  heading: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 20 },
  strong: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  meta: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '500' as const },
  value: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.8, ...num },
  num,
};
