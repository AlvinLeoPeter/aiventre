import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { ShopPlace } from '@/components/place';
import { Box, Button, Chip, Field, Label, Link, Rule, Screen, Section, Segmented } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { WORK_TYPES } from '@/lib/demo';
import { setAccessCode, setTheme, type ThemePref, usePrefs } from '@/lib/prefs';
import { loadDemo, resetAll, updateShop, useData } from '@/lib/store';
import { makeStyles, S, type } from '@/lib/theme';

const COMING = [
  'Searches run by themselves every night, with a notification when buyers turn up',
  'Quotes saved with each buyer, so you can follow up',
  'Login, and your shop synced between phone and laptop',
];

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Phone setting' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ShopScreen() {
  const s = useStyles();
  const data = useData();
  const prefs = usePrefs();
  const shop = data.shop!;
  const [form, setForm] = useState(shop);
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState('');
  const changed = JSON.stringify(form) !== JSON.stringify(shop);

  const toggleWork = (w: string) =>
    setForm((f) => ({ ...f, work: f.work.includes(w) ? f.work.filter((x) => x !== w) : [...f.work, w] }));

  return (
    <Screen title="My shop">
      <Box style={{ gap: S.lg }}>
        <Field label="Shop name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field label="Your name" value={form.owner} onChangeText={(owner) => setForm({ ...form, owner })} />
        <View style={{ gap: S.sm }}>
          <Label>What work do you do?</Label>
          <View style={s.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={form.work.includes(w)} onPress={() => toggleWork(w)} />
            ))}
          </View>
        </View>
        <ShopPlace value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <Button
          label={saved && !changed ? 'Saved' : 'Save'}
          icon={saved && !changed ? 'checkmark' : undefined}
          disabled={!changed || !form.name.trim()}
          onPress={() => {
            updateShop({ ...form, name: form.name.trim() });
            setSaved(true);
          }}
        />
      </Box>

      <Section title="Look" />
      <Segmented options={THEMES} value={prefs.theme} onChange={setTheme} />

      <Section title="AI" />
      {prefs.accessCode ? (
        <Box style={s.between}>
          <Text style={s.body}>Access code saved on this phone</Text>
          <Link label="Change" onPress={() => setAccessCode('')} />
        </Box>
      ) : (
        <Box>
          <Field label="Access code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Button label="Save code" kind="secondary" disabled={!code.trim()} onPress={() => setAccessCode(code)} />
        </Box>
      )}

      <Section title="Coming next" />
      <Box flush>
        {COMING.map((text, i) => (
          <View key={text}>
            {i > 0 && <Rule />}
            <Text style={s.item}>{text}</Text>
          </View>
        ))}
      </Box>

      <Section title="Demo and reset" />
      <View style={{ gap: S.sm }}>
        <Button
          label="Load the sample shop"
          kind="secondary"
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
          onPress={() =>
            confirm('Reset everything?', 'All machines, jobs and shop details on this phone will be deleted.', 'Reset', () => {
              resetAll();
              router.replace('/onboarding');
            })
          }
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  item: { ...type.body, color: c.muted, paddingHorizontal: S.lg, paddingVertical: 14 },
  body: { ...type.body, color: c.muted, flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
