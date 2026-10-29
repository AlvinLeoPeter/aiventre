import { Easing, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar, SideBar } from '@/components/tab-bar';
import { useWide } from '@/lib/layout';
import { useData } from '@/lib/store';

const WEB = Platform.OS === 'web';

export default function TabLayout() {
  const { shop } = useData();
  const wide = useWide();
  if (!shop) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => (wide ? <SideBar {...props} /> : <FloatingTabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        // On a computer the places sit in a sidebar on the left.
        tabBarPosition: wide ? 'left' : 'bottom',
        // Like YouTube: the new tab is there almost at once (a 90 ms fade; with no animation at
        // all the old tab can stay on top on the web). The four everyday tabs load up front so
        // even the first switch is instant, and hidden tabs don't redraw while you're away.
        // In a browser the switch is a touch slower and the new page rises into place, so a click
        // feels smooth rather than abrupt.
        animation: 'fade',
        transitionSpec: WEB
          ? { animation: 'timing', config: { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) } }
          : { animation: 'timing', config: { duration: 90, easing: Easing.out(Easing.quad) } },
        ...(WEB && {
          sceneStyleInterpolator: ({ current }) => ({
            sceneStyle: {
              opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
              transform: [{ translateY: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [8, 0, 8] }) }],
            },
          }),
        }),
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
