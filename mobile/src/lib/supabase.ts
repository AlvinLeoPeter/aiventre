import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * The online database and sign-in. The publishable key is meant to ship inside apps:
 * what each person can read or write is decided by the database's own rules
 * (supabase/migrations), not by keeping this key secret.
 */

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bxibjxdzmcdfsivzwtej.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_tQ9RXBg6IsJKEawwEeBi-A_ryio2r1h';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Keep the login fresh only while the app is open, as Supabase recommends for phones.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The current login token, for calls to Aiventre's own server. */
export async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
