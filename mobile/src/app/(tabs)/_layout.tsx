import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useData } from '@/lib/store';
import { C } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabLayout() {
  const { shop } = useData();
  const insets = useSafeAreaInsets();
  if (!shop) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.textFaint,
        // Explicit height so labels never clip, plus the phone's home-indicator area.
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          height: 68 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', lineHeight: 14 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('pulse') }} />
      <Tabs.Screen name="machines" options={{ title: 'Machines', tabBarIcon: icon('cog') }} />
      <Tabs.Screen name="shop" options={{ title: 'My shop', tabBarIcon: icon('storefront') }} />
    </Tabs>
  );
}
