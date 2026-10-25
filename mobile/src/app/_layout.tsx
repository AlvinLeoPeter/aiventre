import { useEffect } from 'react';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { loadData, useReady } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.border, primary: C.brand },
};

export default function RootLayout() {
  const ready = useReady();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="machine/[id]" options={{ title: '' }} />
        <Stack.Screen name="job" options={{ presentation: 'modal', title: 'Job' }} />
      </Stack>
    </ThemeProvider>
  );
}
