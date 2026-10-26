import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Settings that belong to this phone, not to the shop: look, and the AI access code. */

export type ThemePref = 'system' | 'light' | 'dark';
export type Prefs = { theme: ThemePref; accessCode: string };

const KEY = 'aiventre:prefs';
let prefs: Prefs = { theme: 'system', accessCode: '' };
const listeners = new Set<() => void>();

// Tell the phone too, so keyboards, alerts and pickers match the app.
const applyTheme = (theme: ThemePref) => {
  if (Platform.OS !== 'web') Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
};

function set(next: Partial<Prefs>) {
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
  set({ theme });
  applyTheme(theme);
}

export const setAccessCode = (accessCode: string) => set({ accessCode: accessCode.trim() });
