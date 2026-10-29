import { Easing } from 'react-native';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/tab-bar';
import { useData } from '@/lib/store';

export default function TabLayout() {
  const { shop } = useData();
  if (!shop) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{
        headerShown: false,
        // Like YouTube: the new tab is there almost at once (a 90 ms fade; with no animation at
        // all the old tab can stay on top on the web). The four everyday tabs load up front so
        // even the first switch is instant, and hidden tabs don't redraw while you're away.
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: 90, easing: Easing.out(Easing.quad) } },
        lazy: false,
        freezeOnBlur: true,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="machines" options={{ title: 'Machines' }} />
      <Tabs.Screen name="buyers" options={{ title: 'Buyers' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
      <Tabs.Screen name="quote" options={{ title: 'Quote', lazy: true }} />
      <Tabs.Screen name="shop" options={{ title: 'My shop', lazy: true }} />
    </Tabs>
  );
}
