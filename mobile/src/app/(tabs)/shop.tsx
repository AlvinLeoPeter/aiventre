import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, Field, Screen, SectionTitle } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { WORK_TYPES } from '@/lib/demo';
import { loadDemo, resetAll, updateShop, useData } from '@/lib/store';
import { C, S, T } from '@/lib/theme';

const COMING = [
  { icon: 'sparkles' as const, text: 'AI finds buyers for each free gap, weeks before it starts' },
  { icon: 'mail' as const, text: 'Emails drafted for you to approve and send' },
  { icon: 'calculator' as const, text: 'Quote from a drawing photo' },
  { icon: 'cloud-done' as const, text: 'Login and sync between phone and laptop' },
];

export default function ShopScreen() {
  const data = useData();
  const shop = data.shop!;
  const [form, setForm] = useState(shop);
  const [saved, setSaved] = useState(false);
  const changed = JSON.stringify(form) !== JSON.stringify(shop);

  const toggleWork = (w: string) =>
    setForm((f) => ({ ...f, work: f.work.includes(w) ? f.work.filter((x) => x !== w) : [...f.work, w] }));

  return (
    <Screen>
      <Text style={T.hero}>My shop</Text>

      <Card style={{ gap: S.lg }}>
        <Field label="Shop name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field label="Your name" value={form.owner} onChangeText={(owner) => setForm({ ...form, owner })} />
        <Field label="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>What work do you do?</Text>
          <View style={styles.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={form.work.includes(w)} onPress={() => toggleWork(w)} />
            ))}
          </View>
        </View>
        <Button
          label={saved && !changed ? 'Saved ✓' : 'Save'}
          disabled={!changed || !form.name.trim()}
          onPress={() => {
            updateShop({ ...form, name: form.name.trim() });
            setSaved(true);
          }}
        />
      </Card>

      <SectionTitle>Coming next</SectionTitle>
      <Card style={{ gap: S.md }}>
        {COMING.map((c) => (
          <View key={c.text} style={styles.row}>
            <Ionicons name={c.icon} size={18} color={C.mint} />
            <Text style={[T.dim, { flex: 1 }]}>{c.text}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Demo & reset</SectionTitle>
      <Card style={{ gap: S.sm }}>
        <Button
          label="Load the sample shop"
          kind="secondary"
          icon="flask"
          onPress={() =>
            confirm('Load the sample shop?', 'This replaces your machines and jobs with a demo shop.', 'Load', () => {
              loadDemo();
              router.replace('/');
            })
          }
        />
        <Button
          label="Reset everything"
          kind="danger"
          icon="trash"
          onPress={() =>
            confirm('Reset everything?', 'All machines, jobs and shop details on this phone will be deleted.', 'Reset', () => {
              resetAll();
              router.replace('/onboarding');
            })
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
});
