import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';

import { usePrefs } from './prefs';
import { supabase } from './supabase';

/** Signing in with a 6-digit code sent by email — no passwords to forget. */

let session: Session | null = null;
let known = false; // whether we've heard from Supabase yet
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

supabase.auth.getSession().then(({ data }) => {
  session = data.session;
  known = true;
  emit();
});
supabase.auth.onAuthStateChange((_event, next) => {
  session = next;
  known = true;
  emit();
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSession = () => useSyncExternalStore(subscribe, () => session, () => session);
export const useSessionKnown = () => useSyncExternalStore(subscribe, () => known, () => known);
export const getSession = () => session;
export const onSessionChange = (fn: () => void) => subscribe(fn);

const friendly = (message: string) =>
  /rate limit|too many/i.test(message)
    ? 'Too many codes asked for. Wait a few minutes and try again.'
    : /expired|invalid/i.test(message)
      ? 'That code didn’t work or has expired. Check it, or ask for a new one.'
      : message;

export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw new Error(friendly(error.message));
}

export async function verifyCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.replace(/\D/g, ''), type: 'email' });
  if (error) throw new Error(friendly(error.message));
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Whether this phone can use the AI: the access code, or being signed in. */
export function useAIReady() {
  const { accessCode } = usePrefs();
  const signedIn = !!useSession();
  return !!accessCode || signedIn;
}
