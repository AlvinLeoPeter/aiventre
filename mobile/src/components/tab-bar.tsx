import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Press } from '@/components/ui';
import { makeStyles, R, useTheme } from '@/lib/theme';

// The four places you go every day. Quote and My shop are tabs too, reached from + and your
// picture on Today, so they don't take room here.
const TABS = [
  { name: 'index', label: 'Today', on: 'home', off: 'home-outline' },
  { name: 'machines', label: 'Machines', on: 'cog', off: 'cog-outline' },
  { name: 'buyers', label: 'Buyers', on: 'people', off: 'people-outline' },
  { name: 'money', label: 'Money', on: 'wallet', off: 'wallet-outline' },
] as const;

/** A floating glass bar with the four tabs, and a round + for anything new. */
export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={s.bar}>
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
              <Ionicons name={on ? t.on : t.off} size={22} color={on ? c.text : c.muted} />
              <Text style={[s.label, on && s.labelOn]}>{t.label}</Text>
            </Press>
          );
        })}
      </View>
      <Press label="New: quote a drawing, add a job or a buyer" scale={0.92} style={s.plus} onPress={() => router.push('/new')}>
        <Ionicons name="add" size={30} color={c.onPrimary} />
      </Press>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: {
    flex: 1,
    height: 68,
    borderRadius: R.pill,
    backgroundColor: c.bar,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    boxShadow: '0 10px 30px rgba(21,23,28,0.12)',
  },
  tab: { height: 56, minWidth: 60, paddingHorizontal: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabOn: { backgroundColor: c.active },
  label: { fontSize: 11, fontWeight: '600', color: c.muted },
  labelOn: { fontWeight: '800', color: c.text },
  plus: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 24px rgba(21,23,28,0.25)',
  },
}));
