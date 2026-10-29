import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Press } from '@/components/ui';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

type Item = { label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; tint: 'accent' | 'running' | 'idle' | 'soon'; to: Href };

const ITEMS: Item[] = [
  { label: 'Quote a drawing', sub: 'Photo or PDF → price per part', icon: 'calculator', tint: 'accent', to: '/quote' },
  { label: 'Add a job', sub: 'Put work on a machine', icon: 'construct', tint: 'running', to: '/job' },
  { label: 'New invoice', sub: 'GST bill for finished work', icon: 'receipt', tint: 'idle', to: '/invoice/edit' },
  { label: 'Add a buyer you know', sub: 'Someone to follow up with', icon: 'person-add', tint: 'soon', to: '/buyer/new' },
  { label: 'Sort a buyer’s reply', sub: 'Paste it, get the next step', icon: 'chatbubble-ellipses', tint: 'accent', to: '/reply' },
  { label: 'Ask the machine expert', sub: 'Tools, feeds, speeds, faults', icon: 'build', tint: 'running', to: '/expert' },
];

/** What the + opens: everything you might start, one tap each. */
export default function NewSheet() {
  const { c } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const tint = { accent: [c.accent, c.onAccent], running: [c.running, '#ffffff'], idle: [c.idle, '#ffffff'], soon: [c.soon, '#ffffff'] } as const;

  return (
    <View style={[s.sheet, { paddingBottom: insets.bottom + S.lg }]}>
      <Text style={s.title}>New</Text>
      {ITEMS.map((it) => (
        <Press
          key={it.label}
          label={it.label}
          scale={0.98}
          style={s.row}
          onPress={() => {
            router.back();
            if (it.to === '/quote') router.navigate(it.to);
            else router.push(it.to);
          }}>
          <View style={[s.icon, { backgroundColor: tint[it.tint][0] }]}>
            <Ionicons name={it.icon} size={20} color={tint[it.tint][1]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{it.label}</Text>
            <Text style={s.sub}>{it.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </Press>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  sheet: { backgroundColor: c.ground, paddingHorizontal: S.lg, paddingTop: S.xl, gap: S.sm },
  title: { ...type.title, fontSize: 24, color: c.text, marginBottom: S.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.box, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.strong, color: c.text },
  sub: { ...type.meta, color: c.muted },
}));
