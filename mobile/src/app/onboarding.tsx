import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Box, Button, Chip, Field, Label, Screen } from '@/components/ui';
import { MACHINE_TYPES, WORK_TYPES } from '@/lib/demo';
import { finishOnboarding, loadDemo } from '@/lib/store';
import { makeStyles, type Palette, S, type, useTheme } from '@/lib/theme';

type Step = 'welcome' | 'shop' | 'machines';

// A taste of the board on the welcome screen: three machines, their next 14 days.
const PREVIEW: { name: string; note: string; booked: number; tone: keyof Palette }[] = [
  { name: 'VMC 1', note: 'Free in 9 days', booked: 9, tone: 'running' },
  { name: 'VMC 2', note: 'Free Thursday', booked: 3, tone: 'soon' },
  { name: 'CNC lathe', note: 'Idle 2 days', booked: 0, tone: 'idle' },
];

function Preview() {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <Box flush style={{ paddingVertical: S.sm }}>
      {PREVIEW.map((m) => (
        <View key={m.name} style={s.previewRow}>
          <View style={s.previewTop}>
            <Text style={s.strong}>{m.name}</Text>
            <Text style={[s.meta, { color: c[m.tone], fontWeight: '600' }]}>{m.note}</Text>
          </View>
          <View style={s.cells}>
            {Array.from({ length: 14 }, (_, i) => (
              <View key={i} style={[s.cell, { backgroundColor: i < m.booked ? c.booked : c.free }]} />
            ))}
          </View>
        </View>
      ))}
    </Box>
  );
}

export default function Onboarding() {
  const s = useStyles();
  const [step, setStep] = useState<Step>('welcome');
  const [shop, setShop] = useState({ name: '', owner: '', city: '', work: [] as string[] });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState('');

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const bump = (type: string, by: number) => setCounts((c) => ({ ...c, [type]: Math.max(0, (c[type] ?? 0) + by) }));
  const toggleWork = (w: string) =>
    setShop((s) => ({ ...s, work: s.work.includes(w) ? s.work.filter((x) => x !== w) : [...s.work, w] }));

  if (step === 'welcome') {
    return (
      <Screen>
        <View style={s.hero}>
          <Text style={s.wordmark}>Aiventre</Text>
          <Text style={s.tagline}>Every machine at a glance. Your next job, found before a machine goes idle.</Text>
        </View>
        <Preview />
        <Button label="Set up my shop" icon="arrow-forward" onPress={() => setStep('shop')} />
        <Button
          label="Try a sample shop"
          kind="secondary"
          onPress={() => {
            loadDemo();
            router.replace('/');
          }}
        />
        <Text style={[s.meta, { textAlign: 'center' }]}>Takes about a minute. Everything stays on your phone.</Text>
      </Screen>
    );
  }

  if (step === 'shop') {
    return (
      <Screen>
        <Text style={s.meta}>Step 1 of 2</Text>
        <Text style={s.title}>Your shop</Text>
        <Field label="Shop name" value={shop.name} onChangeText={(name) => setShop({ ...shop, name })} placeholder="e.g. Sharma Precision" />
        <Field label="Your name" value={shop.owner} onChangeText={(owner) => setShop({ ...shop, owner })} placeholder="e.g. Rajesh" />
        <Field label="City" value={shop.city} onChangeText={(city) => setShop({ ...shop, city })} placeholder="e.g. Chakan, Pune" />
        <View style={{ gap: S.sm }}>
          <Label>What work do you do?</Label>
          <View style={s.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={shop.work.includes(w)} onPress={() => toggleWork(w)} />
            ))}
          </View>
        </View>
        <Button label="Next: your machines" icon="arrow-forward" disabled={!shop.name.trim()} onPress={() => setStep('machines')} />
        <Button label="Back" kind="quiet" onPress={() => setStep('welcome')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={s.meta}>Step 2 of 2</Text>
      <Text style={s.title}>Your machines</Text>
      <Text style={s.muted}>Tap a type once for each machine you have.</Text>
      <View style={s.chips}>
        {[...MACHINE_TYPES, ...Object.keys(counts).filter((k) => !MACHINE_TYPES.includes(k))].map((t) => (
          <Chip key={t} label={t} count={counts[t]} selected={!!counts[t]} onPress={() => bump(t, 1)} />
        ))}
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label="Something else?" value={custom} onChangeText={setCustom} placeholder="e.g. Wire EDM" />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Button
            label="Add"
            kind="secondary"
            disabled={!custom.trim()}
            onPress={() => {
              bump(custom.trim(), 1);
              setCustom('');
            }}
          />
        </View>
      </View>

      {total > 0 && (
        <Box style={{ gap: S.sm }}>
          {Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([type, n]) => (
              <View key={type} style={s.countRow}>
                <Text style={[s.strong, { flex: 1 }]}>{type}</Text>
                <Button label="−" kind="secondary" small onPress={() => bump(type, -1)} />
                <Text style={s.count}>{n}</Text>
                <Button label="+" kind="secondary" small onPress={() => bump(type, 1)} />
              </View>
            ))}
        </Box>
      )}

      <Button
        label={total ? `Done · ${total} machine${total === 1 ? '' : 's'}` : 'Add at least one machine'}
        icon="checkmark"
        disabled={!total}
        onPress={() => {
          finishOnboarding(
            { ...shop, name: shop.name.trim(), owner: shop.owner.trim(), city: shop.city.trim() },
            Object.entries(counts)
              .filter(([, n]) => n > 0)
              .map(([type, count]) => ({ type, count })),
          );
          router.replace('/');
        }}
      />
      <Button label="Back" kind="quiet" onPress={() => setStep('shop')} />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { gap: S.md, paddingTop: S.xxl * 2, paddingBottom: S.lg },
  wordmark: { fontSize: 40, fontWeight: '700', letterSpacing: -1.2, color: c.text },
  tagline: { fontSize: 19, lineHeight: 26, color: c.muted },
  title: { ...type.title, color: c.text },
  strong: { ...type.strong, color: c.text },
  muted: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  previewRow: { paddingHorizontal: S.lg, paddingVertical: 10, gap: 8 },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cells: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, height: 10, borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  count: { color: c.text, fontSize: 18, fontWeight: '600', minWidth: 28, textAlign: 'center', ...type.num },
}));
