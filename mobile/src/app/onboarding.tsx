import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, Field, Screen } from '@/components/ui';
import { MACHINE_TYPES, WORK_TYPES } from '@/lib/demo';
import { finishOnboarding, loadDemo } from '@/lib/store';
import { C, R, S, T } from '@/lib/theme';

type Step = 'welcome' | 'shop' | 'machines';

export default function Onboarding() {
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
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="pulse" size={36} color="#fff" />
          </View>
          <Text style={[T.hero, { fontSize: 38, textAlign: 'center' }]}>Aiventre</Text>
          <Text style={[T.dim, { fontSize: 17, textAlign: 'center', lineHeight: 24 }]}>
            Every machine at a glance.{'\n'}Your next job, found before you need it.
          </Text>
        </View>
        <Button label="Set up my shop" icon="arrow-forward" onPress={() => setStep('shop')} />
        <Button
          label="Try a sample shop"
          kind="secondary"
          onPress={() => {
            loadDemo();
            router.replace('/');
          }}
        />
        <Text style={[T.small, { textAlign: 'center' }]}>Takes about a minute. Everything stays on your phone.</Text>
      </Screen>
    );
  }

  if (step === 'shop') {
    return (
      <Screen>
        <Text style={T.label}>Step 1 of 2</Text>
        <Text style={T.hero}>Your shop</Text>
        <Field label="Shop name" value={shop.name} onChangeText={(name) => setShop({ ...shop, name })} placeholder="e.g. Sharma Precision" />
        <Field label="Your name" value={shop.owner} onChangeText={(owner) => setShop({ ...shop, owner })} placeholder="e.g. Rajesh" />
        <Field label="City" value={shop.city} onChangeText={(city) => setShop({ ...shop, city })} placeholder="e.g. Chakan, Pune" />
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>What work do you do?</Text>
          <View style={styles.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={shop.work.includes(w)} onPress={() => toggleWork(w)} />
            ))}
          </View>
        </View>
        <Button label="Next: your machines" icon="arrow-forward" disabled={!shop.name.trim()} onPress={() => setStep('machines')} />
        <Button label="Back" kind="ghost" onPress={() => setStep('welcome')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={T.label}>Step 2 of 2</Text>
      <Text style={T.hero}>Your machines</Text>
      <Text style={T.dim}>Tap a machine once for each one you have.</Text>
      <View style={styles.chips}>
        {[...MACHINE_TYPES, ...Object.keys(counts).filter((k) => !MACHINE_TYPES.includes(k))].map((t) => (
          <Chip key={t} label={t} count={counts[t]} selected={!!counts[t]} onPress={() => bump(t, 1)} />
        ))}
      </View>
      <View style={styles.row}>
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
        <Card style={{ gap: S.sm }}>
          {Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([type, n]) => (
              <View key={type} style={styles.countRow}>
                <Text style={[T.body, { flex: 1, fontWeight: '700' }]}>{type}</Text>
                <Button label="−" kind="secondary" onPress={() => bump(type, -1)} />
                <Text style={styles.count}>{n}</Text>
                <Button label="+" kind="secondary" onPress={() => bump(type, 1)} />
              </View>
            ))}
        </Card>
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
      <Button label="Back" kind="ghost" onPress={() => setStep('shop')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.md, paddingVertical: S.xxl * 2 },
  logo: { width: 76, height: 76, borderRadius: R.lg, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  count: { color: C.text, fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
});
