import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { loadChat } from '@/lib/assistant';
import { loadPrefs } from '@/lib/prefs';
import { loadData, useReady } from '@/lib/store';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const ready = useReady();
  const { c, scheme } = useTheme();

  useEffect(() => {
    loadPrefs().then(loadData);
    loadChat();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
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
      </Stack>
    </ThemeProvider>
  );
}
