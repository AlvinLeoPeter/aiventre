import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/tab-bar';
import { useData } from '@/lib/store';

export default function TabLayout() {
  const { shop } = useData();
  if (!shop) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="machines" options={{ title: 'Machines' }} />
      <Tabs.Screen name="buyers" options={{ title: 'Buyers' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
      <Tabs.Screen name="quote" options={{ title: 'Quote' }} />
      <Tabs.Screen name="shop" options={{ title: 'My shop' }} />
    </Tabs>
  );
}
