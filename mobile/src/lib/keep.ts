import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Results a screen must not lose when the app is closed: a finished quote, the last supplier
 * search. Each AI run costs credits, so what it produced stays until the owner starts over.
 * Loaded before the screens open, so they can start from it.
 */

const PREFIX = 'aiventre:keep:';
const cache: Record<string, unknown> = {};

export async function loadKept(keys: string[]) {
  await Promise.all(
    keys.map(async (k) => {
      try {
        const saved = await AsyncStorage.getItem(PREFIX + k);
        if (saved) cache[k] = JSON.parse(saved);
      } catch {
        // Unreadable: the screen starts empty.
      }
    }),
  );
}

export const getKept = <T>(key: string) => cache[key] as T | undefined;

/** Remembers a screen's result; null forgets it. */
export function keep(key: string, value: unknown) {
  if (value == null) {
    delete cache[key];
    AsyncStorage.removeItem(PREFIX + key).catch(() => {});
    return;
  }
  cache[key] = value;
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
}

/** The shop is being replaced (reset, sample shop): its screens' results go too. */
export function clearKept() {
  Object.keys(cache).forEach((k) => keep(k, null));
}
