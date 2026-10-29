import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { ShopPlace } from '@/components/place';
import { SaveButton, useShopForm } from '@/components/shop-form';
import { Box, Button, Field, Link, Screen, Section } from '@/components/ui';
import { runTask, type SetupResult } from '@/lib/api';
import { machineTypesFor, WORK_TYPES } from '@/lib/demo';
import { mergeShop, useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

/** "Tell us more": the owner describes the shop and the AI adds what it hears to the profile. */
function Describe() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SetupResult | null>(null);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await runTask<SetupResult>('setup_shop', { text, work_options: WORK_TYPES, machine_options: machineTypesFor([]) });
      mergeShop({
        name: r.shop_name,
        area: r.area,
        city: r.city,
        state: r.state,
        summary: r.summary,
        phone: r.phone,
        email: r.email,
        work: r.work.filter((w) => WORK_TYPES.includes(w)),
        capabilities: r.capabilities,
        materials: r.materials,
        industries: r.industries,
        certifications: r.certifications,
      });
      setResult(r);
      setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const known = new Set(data.machines.map((m) => m.type.toLowerCase()));
  const newMachines = result?.machines.filter((m) => !known.has(m.type.toLowerCase())) ?? [];

  return (
    <Box>
      <Text style={s.body}>Tell it more about your shop — what you make, materials, industries, certificates. Tap the mic to talk.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        placeholder="e.g. We mostly do tractor and pump parts in EN8 and cast iron, ISO 9001 certified, tolerances up to 10 microns."
        placeholderTextColor={c.faint}
        selectionColor={c.text}
        style={s.story}
      />
      <Button label={busy ? 'Reading…' : 'Add to my profile'} icon="sparkles-outline" kind="secondary" disabled={busy || text.trim().length < 10} onPress={run} />
      {busy && <ActivityIndicator color={c.muted} />}
      {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
      {result && (
        <View style={{ gap: 4 }}>
          <Text style={s.strong}>Added to your profile.</Text>
          {newMachines.length > 0 && (
            <Text style={s.meta}>
              It also heard {newMachines.map((m) => `${m.type} ×${m.count}`).join(', ')} — add them in the Machines tab so they show on your board.
            </Text>
          )}
          {result.missing.slice(0, 3).map((m) => (
            <Text key={m} style={s.meta}>
              • {m}
            </Text>
          ))}
        </View>
      )}
    </Box>
  );
}

/** Name, contact and where the shop is: what buyers see first. */
export default function DetailsScreen() {
  const s = useStyles();
  const f = useShopForm();
  const [describing, setDescribing] = useState(false);
  const { form, patch } = f;

  return (
    <Screen padTop={false}>
      <Box style={{ gap: S.lg }} key={f.key}>
        <Field label="Shop name" value={form.name} onChangeText={(name) => patch({ name })} />
        <Field label="Your name" value={form.owner} onChangeText={(owner) => patch({ owner })} />
        <Field
          label="About the shop"
          value={form.summary ?? ''}
          onChangeText={(summary) => patch({ summary })}
          multiline
          placeholder="One or two lines a purchase manager would want to read"
          style={{ minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }}
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Phone for buyers" value={form.phone ?? ''} onChangeText={(phone) => patch({ phone })} keyboardType="phone-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Hour rate ₹"
              value={form.rate ? String(form.rate) : ''}
              onChangeText={(r) => patch({ rate: Number(r) || undefined })}
              keyboardType="number-pad"
              placeholder="800"
            />
          </View>
        </View>
        <Field label="Email for buyers" value={form.email ?? ''} onChangeText={(email) => patch({ email })} keyboardType="email-address" autoCapitalize="none" />
        <ShopPlace value={form} onChange={patch} />
        <SaveButton f={f} />
      </Box>

      <Section title="Let the AI fill it in" right={!describing && <Link label="Describe it" onPress={() => setDescribing(true)} />} />
      {describing ? <Describe /> : <Text style={[s.meta, { marginTop: -S.sm }]}>Talk or type about your shop and the AI adds it to your profile.</Text>}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: S.md },
  body: { ...type.body, color: c.muted },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  story: {
    minHeight: 110,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.edge,
    borderRadius: R.control,
    padding: 14,
    color: c.text,
    fontSize: 16,
    lineHeight: 22,
  },
}));
