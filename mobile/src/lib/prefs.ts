import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Settings that belong to this phone, not to the shop: look, AI access code, automatic searching. */

export type ThemePref = 'system' | 'light' | 'dark';
export type Prefs = {
  theme: ThemePref;
  accessCode: string;
  autoFind: boolean;
  searched: Record<string, string>; // machine id → the free day it was last searched for
  autoDay: string; // the day of the last automatic searches, and how many ran
  autoCount: number;
};

const KEY = 'aiventre:prefs';
let prefs: Prefs = { theme: 'system', accessCode: '', autoFind: true, searched: {}, autoDay: '', autoCount: 0 };
const listeners = new Set<() => void>();

// Tell the phone too, so keyboards, alerts and pickers match the app.
const applyTheme = (theme: ThemePref) => {
  if (Platform.OS !== 'web') Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
};

export function setPrefs(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
}

export async function loadPrefs() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved) prefs = { ...prefs, ...saved };
  } catch {
    // Unreadable: keep the defaults.
  }
  applyTheme(prefs.theme);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePrefs = () => useSyncExternalStore(subscribe, () => prefs, () => prefs);
export const getPrefs = () => prefs;

export function setTheme(theme: ThemePref) {
  setPrefs({ theme });
  applyTheme(theme);
}

export const setAccessCode = (accessCode: string) => setPrefs({ accessCode: accessCode.trim() });
export const setAutoFind = (autoFind: boolean) => setPrefs({ autoFind });
