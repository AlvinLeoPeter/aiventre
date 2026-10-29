import type { ReactNode } from 'react';
import { Platform, type StyleProp, Text, View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Press } from '@/components/ui';
import { makeStyles, useTheme } from '@/lib/theme';

// The four places you go every day. Quote and My shop are tabs too, reached from + and your
// picture on Today, so they don't take room here.
const TABS = [
  { name: 'index', label: 'Today', on: 'home', off: 'home-outline' },
  { name: 'machines', label: 'Machines', on: 'cog', off: 'cog-outline' },
  { name: 'buyers', label: 'Buyers', on: 'people', off: 'people-outline' },
  { name: 'money', label: 'Money', on: 'wallet', off: 'wallet-outline' },
] as const;

// iPhones on iOS 26 get Apple's real liquid glass; elsewhere a see-through colour stands in for it.
const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * A slim floating glass bar with the four tabs, and a round + for anything new. It sits low,
 * over the home-indicator area like YouTube's, so it covers as little of the page as it can.
 */
export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c, scheme } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: insets.bottom ? Math.max(insets.bottom - 8, 8) : 12 }]}>
      <Bar glass={GLASS} scheme={scheme} style={[s.bar, GLASS ? s.barGlass : s.barTint]}>
        {TABS.map((t) => {
          const route = state.routes.find((r) => r.name === t.name);
          if (!route) return null;
          const on = current === t.name;
          return (
            <Press
              key={t.name}
              label={t.label}
              scale={0.94}
              style={[s.tab, on && s.tabOn]}
              onPress={() => {
                if (!on) navigateToTab(route.key);
              }}>
              <Ionicons name={on ? t.on : t.off} size={21} color={on ? c.text : c.muted} />
              <Text style={[s.label, on && s.labelOn]}>{t.label}</Text>
            </Press>
          );
        })}
      </Bar>
      <Press label="New: quote a drawing, add a job or a buyer" scale={0.92} style={s.plus} onPress={() => router.push('/new')}>
        <Ionicons name="add" size={28} color={c.onPrimary} />
      </Press>
    </View>
  );
}

function Bar({ glass, scheme, style, children }: { glass: boolean; scheme: 'light' | 'dark'; style: StyleProp<ViewStyle>; children: ReactNode }) {
  if (glass)
    return (
      <GlassView glassEffectStyle="regular" colorScheme={scheme} style={style}>
        {children}
      </GlassView>
    );
  return <View style={style}>{children}</View>;
}

const useStyles = makeStyles((c) => ({
  wrap: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  barGlass: {},
  // No real glass on this phone: a see-through bar with a hairline edge, solid enough to read on.
  barTint: { backgroundColor: c.bar, borderWidth: 1, borderColor: c.border, boxShadow: '0 8px 24px rgba(21,23,28,0.12)' },
  tab: { height: 48, minWidth: 58, paddingHorizontal: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 1 },
  tabOn: { backgroundColor: c.active },
  label: { fontSize: 10.5, fontWeight: '600', color: c.muted },
  labelOn: { fontWeight: '800', color: c.text },
  plus: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(21,23,28,0.25)',
  },
}));
