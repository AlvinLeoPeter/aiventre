import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { usePrefs } from './prefs';

/**
 * Aiventre's look: quiet ink-and-paper chrome, colour only where it means something
 * (a machine's state). Every screen reads its colours from useTheme(), so light and
 * dark mode are the same layout with a different palette.
 */

const light = {
  ground: '#f9fafb',
  surface: '#ffffff',
  raised: '#f4f4f5',
  active: '#ececee',
  border: '#e8e8e8',
  rule: '#f0f0f0',
  control: '#d1d5db',
  text: '#111111',
  muted: '#5f6368',
  faint: '#6b6b6b',
  primary: '#1d1f20',
  onPrimary: '#ffffff',

  running: '#247b50',
  runningPill: '#dcfae5',
  runningInk: '#04250e',
  soon: '#b45309',
  soonPill: '#fffbeb',
  soonInk: '#92400e',
  idle: '#c4242a',
  idlePill: '#ffedea',
  idleInk: '#831c1e',
  off: '#9ca3af',
  offPill: '#f0f0f0',
  offInk: '#3f3f46',

  // The 14-day board: booked days, free days, a job waiting for an answer.
  booked: '#247b50',
  free: '#e7e7ea',
};

export type Palette = typeof light;

const dark: Palette = {
  ground: '#000000',
  surface: '#111111',
  raised: '#1a1a1a',
  active: '#222222',
  border: '#2e2e2e',
  rule: '#1f1f1f',
  control: '#444444',
  text: '#ffffff',
  muted: '#b4b4b4',
  faint: '#949494',
  primary: '#ffffff',
  onPrimary: '#000000',

  running: '#3fc07a',
  runningPill: '#172a1d',
  runningInk: '#3fc07a',
  soon: '#f5b445',
  soonPill: '#2a2312',
  soonInk: '#f5b445',
  idle: '#e5566f',
  idlePill: '#2c1a20',
  idleInk: '#e5566f',
  off: '#6b6b6b',
  offPill: '#222222',
  offInk: '#b4b4b4',

  booked: '#3fc07a',
  free: '#262626',
};

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

/** Two radii only: tight for controls, soft for containers. */
export const R = { control: 10, box: 18, pill: 999 } as const;

const num = { fontVariant: ['tabular-nums' as const] };

/** One typeface (the phone's own), a few clear steps. */
export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 20 },
  strong: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  meta: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '500' as const },
  value: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.5, ...num },
  num,
};
