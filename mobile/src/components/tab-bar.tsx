import { type ReactNode, useEffect, useState } from 'react';
import { Platform, Pressable, type StyleProp, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Press, tap } from '@/components/ui';
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

// On a phone a tab switches the moment a finger lands, like iPhone tab bars. In a browser that
// first touch can get lost, so there it switches on the click.
const SWITCH_ON = Platform.OS === 'web' ? 'onPress' : 'onPressIn';

// The highlight's glide from one tab to the next: quick, with a hint of overshoot.
const GLIDE = { damping: 20, stiffness: 320, mass: 0.6 };

/**
 * A slim floating glass bar with the four tabs, and a round + for anything new. It sits low,
 * over the home-indicator area like YouTube's, so it covers as little of the page as it can.
 * A tab switches the moment a finger lands on it, and the highlight glides across to it.
 */
export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c, scheme } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const index = TABS.findIndex((t) => t.name === current); // -1 on Quote and My shop
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0); // of one tab
  const x = useSharedValue(0);

  useEffect(() => {
    if (!width || index < 0) return;
    x.set(reduced ? index * width : withSpring(index * width, GLIDE));
  }, [index, width, reduced, x]);
  const glide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: insets.bottom ? Math.max(insets.bottom - 8, 8) : 12 }]}>
      <Bar glass={GLASS} scheme={scheme} style={[s.bar, GLASS ? s.barGlass : s.barTint]}>
        <View style={s.tabs} onLayout={(e) => setWidth(e.nativeEvent.layout.width / TABS.length)}>
          {width > 0 && index >= 0 && <Animated.View style={[s.pill, { width }, glide]} />}
          {TABS.map((t) => {
            const route = state.routes.find((r) => r.name === t.name);
            if (!route) return null;
            const on = current === t.name;
            return (
              <Pressable
                key={t.name}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: on }}
                style={s.tab}
                {...{
                  [SWITCH_ON]: () => {
                    if (on) return;
                    tap();
                    navigateToTab(route.key);
                  },
                }}>
                <Ionicons name={on ? t.on : t.off} size={21} color={on ? c.text : c.muted} />
                <Text style={[s.label, on && s.labelOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
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
  wrap: { position: 'absolute', zIndex: 10, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  tabs: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 24, backgroundColor: c.active },
  barGlass: {},
  // No real glass on this phone: a see-through bar with a hairline edge, solid enough to read on.
  barTint: { backgroundColor: c.bar, borderWidth: 1, borderColor: c.border, boxShadow: '0 8px 24px rgba(21,23,28,0.12)' },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 1 },
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
