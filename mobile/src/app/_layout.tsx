import { useEffect } from 'react';
import { AppState } from 'react-native';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { loadChat } from '@/lib/assistant';
import { loadExpert } from '@/lib/expert';
import { autoFind } from '@/lib/find';
import { onNotificationTap } from '@/lib/notify';
import { autoWatchJobs, loadOpenJobs } from '@/lib/open-jobs';
import { loadPhotos } from '@/lib/photos';
import { startSync } from '@/lib/sync';
import { loadPrefs } from '@/lib/prefs';
import { loadData, useReady } from '@/lib/store';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const ready = useReady();
  const { c, scheme } = useTheme();

  useEffect(() => {
    loadPrefs().then(loadData).then(startSync);
    loadChat();
    loadExpert();
    loadPhotos();
    loadOpenJobs();
  }, []);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    // Look for work for free machines, and for newly posted jobs every few days: now, and each
    // time the app comes back to the front.
    autoFind();
    autoWatchJobs();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      autoFind();
      autoWatchJobs();
    });
    const untap = onNotificationTap((url) => router.push(url as never));
    return () => {
      sub.remove();
      untap();
    };
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.ground, card: c.ground, text: c.text, border: c.border, primary: c.text },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.ground },
          headerTintColor: c.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.ground },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="machine/[id]" options={{ title: '' }} />
        <Stack.Screen name="job" options={{ presentation: 'modal', title: 'Job' }} />
        <Stack.Screen name="buyer/[id]" options={{ title: '' }} />
        <Stack.Screen name="buyer/new" options={{ presentation: 'modal', title: 'Add a buyer' }} />
        <Stack.Screen name="reply" options={{ presentation: 'modal', title: 'Sort a reply' }} />
        <Stack.Screen name="assistant" options={{ headerShown: false }} />
        <Stack.Screen name="expert" options={{ headerShown: false }} />
        <Stack.Screen name="trust" options={{ title: 'Trust pack' }} />
        <Stack.Screen name="open-jobs" options={{ title: 'Open jobs' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal', title: 'Account' }} />
        <Stack.Screen name="bills" options={{ title: 'Bills' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: '' }} />
        <Stack.Screen name="invoice/edit" options={{ title: 'Invoice' }} />
        <Stack.Screen name="buy" options={{ title: 'Buy' }} />
      </Stack>
    </ThemeProvider>
  );
}
