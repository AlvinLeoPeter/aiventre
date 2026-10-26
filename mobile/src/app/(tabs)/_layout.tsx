import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useData } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
// Filled icon for the tab you're on, outline for the rest.
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? on : off} size={size - 2} color={color as string} />;
  };

export default function TabLayout() {
  const { shop } = useData();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!shop) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        // Explicit height so labels never clip, plus the phone's home-indicator area.
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500', lineHeight: 15 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today', 'today-outline') }} />
      <Tabs.Screen name="machines" options={{ title: 'Machines', tabBarIcon: icon('cog', 'cog-outline') }} />
      <Tabs.Screen name="quote" options={{ title: 'Quote', tabBarIcon: icon('calculator', 'calculator-outline') }} />
      <Tabs.Screen name="shop" options={{ title: 'My shop', tabBarIcon: icon('storefront', 'storefront-outline') }} />
    </Tabs>
  );
}
