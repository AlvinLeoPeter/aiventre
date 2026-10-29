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

// The sidebar has room for every place, including the two the phone reaches from + and Today.
const SIDE = [
  { name: 'index', label: 'Dashboard', on: 'grid', off: 'grid-outline' },
  { name: 'machines', label: 'Machines', on: 'cog', off: 'cog-outline' },
  { name: 'buyers', label: 'Buyers', on: 'people', off: 'people-outline' },
  { name: 'money', label: 'Money', on: 'wallet', off: 'wallet-outline' },
  { name: 'quote', label: 'Quote', on: 'calculator', off: 'calculator-outline' },
  { name: 'shop', label: 'My shop', on: 'storefront', off: 'storefront-outline' },
] as const;

// In a browser, Pressable also says whether the mouse is over it.
const hover = (st: object) => !!(st as { hovered?: boolean }).hovered;

/** On a computer: a glass sidebar on the left with every place, a New button and settings. */
export function SideBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const s = useSideStyles();
  const current = state.routes[state.index]?.name;
  return (
    <View style={s.side}>
      <View style={s.brand}>
        <View style={s.logo}>
          <Text style={s.logoText}>A</Text>
        </View>
        <Text style={s.brandText}>Aiventre</Text>
      </View>
      <Press label="New: quote a drawing, add a job or a buyer" scale={0.97} style={s.new} onPress={() => router.push('/new')}>
        <Ionicons name="add" size={20} color={c.onPrimary} />
        <Text style={s.newText}>New</Text>
      </Press>
      <View style={{ gap: 4 }}>
        {SIDE.map((t) => {
          const route = state.routes.find((r) => r.name === t.name);
          if (!route) return null;
          const on = current === t.name;
          return (
            <Pressable
              key={t.name}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              style={(st) => [s.item, on ? s.itemOn : hover(st) && s.itemHover]}
              onPress={() => !on && navigateToTab(route.key)}>
              <Ionicons name={on ? t.on : t.off} size={20} color={on ? c.text : c.muted} />
              <Text style={[s.itemText, on && s.itemTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" style={(st) => [s.item, hover(st) && s.itemHover]} onPress={() => router.push('/settings/app')}>
        <Ionicons name="settings-outline" size={20} color={c.muted} />
        <Text style={s.itemText}>Settings</Text>
      </Pressable>
    </View>
  );
}

const useSideStyles = makeStyles((c) => ({
  // Frosted glass over the same glow as the page, with a bright hairline edge like the cards.
  side: { width: 240, padding: 16, gap: 18, borderRightWidth: 1, borderRightColor: c.border, backgroundColor: c.raised },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingTop: 8 },
  logo: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '800', color: c.onPrimary },
  brandText: { fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
  new: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: 999, backgroundColor: c.primary },
  newText: { fontSize: 15, fontWeight: '800', color: c.onPrimary },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: 14 },
  itemOn: { backgroundColor: c.active },
  itemHover: { backgroundColor: c.raised },
  itemText: { fontSize: 15, fontWeight: '600', color: c.muted },
  itemTextOn: { fontWeight: '800', color: c.text },
}));
