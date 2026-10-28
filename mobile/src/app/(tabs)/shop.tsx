import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ShopPlace } from '@/components/place';
import { Box, Button, Chip, Field, Label, Link, ListField, Rule, Screen, Section, Segmented } from '@/components/ui';
import { runTask, type SetupResult } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { machineTypesFor, WORK_TYPES } from '@/lib/demo';
import type { Shop } from '@/lib/model';
import { clearOpenJobs } from '@/lib/open-jobs';
import { clearPhotos, getPhotos, usePhotos } from '@/lib/photos';
import { setAccessCode, setAutoFind, setTheme, type ThemePref, usePrefs } from '@/lib/prefs';
import { pickBackup, shareBackup, shareProfile } from '@/lib/share';
import { loadDemo, mergeShop, resetAll, updateShop, useData } from '@/lib/store';
import { useSyncStatus } from '@/lib/sync';
import { trustSteps } from '@/lib/trust';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const COMING = [
  'Searches that run overnight even when the app is closed',
  'Payment reminders that go out by themselves',
];

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Phone setting' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const LISTS = [
  ['capabilities', 'What you can do', 'e.g. 3-axis milling, drilling, tapping'],
  ['materials', 'Materials', 'e.g. MS, EN8, aluminium, SS304'],
  ['industries', 'Industries you serve', 'e.g. tractor parts, pumps, valves'],
  ['certifications', 'Certifications', 'e.g. ISO 9001:2015'],
] as const;

const BLANK_BANK = { name: '', account: '', ifsc: '', upi: '' };

/** Signed in or not, and whether the shop is safely online. */
function AccountBox() {
  const { c } = useTheme();
  const s = useStyles();
  const session = useSession();
  const status = useSyncStatus();
  if (!session) {
    return (
      <Box>
        <Text style={s.strong}>Your shop is only on this phone</Text>
        <Text style={s.body}>Sign in to save it online, use it on another phone, and let Aiventre find work while the app is closed.</Text>
        <Button label="Sign in with email" icon="person-circle-outline" onPress={() => router.push('/account')} />
      </Box>
    );
  }
  const line =
    status.state === 'choose'
      ? 'Choose which shop to keep'
      : status.state === 'syncing'
        ? 'Syncing…'
        : status.state === 'offline'
          ? 'Offline — will sync later'
          : status.state === 'error'
            ? 'Couldn’t sync — tap to see why'
            : 'Saved online';
  return (
    <Pressable onPress={() => router.push('/account')}>
      <Box style={s.between}>
        <View style={{ flex: 1 }}>
          <Text style={s.strong}>{line}</Text>
          <Text style={s.meta}>{session.user.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Box>
    </Pressable>
  );
}

/** How ready the shop is for a buyer who has never heard of it. */
function TrustCard() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const photos = usePhotos();
  const steps = trustSteps(data, photos.length);
  const done = steps.filter((x) => x.done).length;
  return (
    <Pressable onPress={() => router.push('/trust')} accessibilityRole="button">
      <Box style={s.between}>
        <Ionicons name="shield-checkmark-outline" size={24} color={done === steps.length ? c.running : c.muted} />
        <View style={{ flex: 1 }}>
          <Text style={s.strong}>
            Trust pack · {done} of {steps.length} done
          </Text>
          <Text style={s.meta}>What buyers check before giving work to a new shop</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Box>
    </Pressable>
  );
}

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
          <Text style={s.strong}>Added to your profile below.</Text>
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

export default function ShopScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const prefs = usePrefs();
  const session = useSession();
  const shop = data.shop!;
  const [form, setForm] = useState<Shop>(shop);
  // When the profile changes elsewhere (the AI, a restore), start again from the new one.
  const [base, setBase] = useState(shop);
  if (base !== shop) {
    setBase(shop);
    setForm(shop);
  }
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState('');
  const [describing, setDescribing] = useState(false);
  const [fileError, setFileError] = useState('');
  const changed = JSON.stringify(form) !== JSON.stringify(shop);
  const patch = (p: Partial<Shop>) => setForm((f) => ({ ...f, ...p }));

  const toggleWork = (w: string) => patch({ work: form.work.includes(w) ? form.work.filter((x) => x !== w) : [...form.work, w] });

  return (
    <Screen title="My shop">
      <AccountBox />
      <TrustCard />
      <Button label="Send my company profile (PDF)" icon="document-text-outline" onPress={() => shareProfile(data, getPhotos()).catch((e) => setFileError((e as Error).message))} />
      <Text style={[s.meta, { marginTop: -S.sm }]}>Your shop, machines, photos, registration and on-time record — to send buyers on WhatsApp or email.</Text>
      {!!fileError && <Text style={[s.meta, { color: c.idle }]}>{fileError}</Text>}
      <View style={s.row}>
        <Button label="Bills" icon="receipt-outline" kind="secondary" small flex onPress={() => router.push('/bills')} />
        <Button label="Buy tools & material" icon="cart-outline" kind="secondary" small flex onPress={() => router.push('/buy')} />
      </View>

      <Section title="Profile" right={!describing && <Link label="Describe it to AI" onPress={() => setDescribing(true)} />} />
      {describing && <Describe />}

      <Box style={{ gap: S.lg }} key={JSON.stringify(base)}>
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
        <Field
          label="Your GSTIN (printed on quotations)"
          value={form.gstin ?? ''}
          onChangeText={(gstin) => patch({ gstin: gstin.toUpperCase() })}
          autoCapitalize="characters"
          maxLength={15}
        />
        <Field
          label="Address (printed on invoices)"
          value={form.address ?? ''}
          onChangeText={(address) => patch({ address })}
          placeholder="e.g. Plot 12, SIDCO Industrial Estate, Ambattur"
        />
        <View style={{ gap: S.sm }}>
          <Label>Where buyers pay you (printed on invoices)</Label>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Bank" value={form.bank?.name ?? ''} onChangeText={(name) => patch({ bank: { ...BLANK_BANK, ...form.bank, name } })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="IFSC"
                value={form.bank?.ifsc ?? ''}
                onChangeText={(ifsc) => patch({ bank: { ...BLANK_BANK, ...form.bank, ifsc: ifsc.toUpperCase() } })}
                autoCapitalize="characters"
                maxLength={11}
              />
            </View>
          </View>
          <Field
            label="Account number"
            value={form.bank?.account ?? ''}
            onChangeText={(account) => patch({ bank: { ...BLANK_BANK, ...form.bank, account } })}
            keyboardType="number-pad"
          />
          <Field
            label="UPI ID"
            value={form.bank?.upi ?? ''}
            onChangeText={(upi) => patch({ bank: { ...BLANK_BANK, ...form.bank, upi: upi.trim() } })}
            autoCapitalize="none"
            placeholder="e.g. shopname@okicici"
          />
        </View>
        <View style={{ gap: S.sm }}>
          <Label>What work do you do?</Label>
          <View style={s.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={form.work.includes(w)} onPress={() => toggleWork(w)} />
            ))}
          </View>
        </View>
        {LISTS.map(([k, label, placeholder]) => (
          <ListField key={k} label={label} placeholder={placeholder} value={form[k]} onChange={(v) => patch({ [k]: v })} />
        ))}
        <ShopPlace value={form} onChange={patch} />
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
          <Text style={[s.body, { flex: 1 }]}>Access code saved on this phone</Text>
          <Link label="Change" onPress={() => setAccessCode('')} />
        </Box>
      ) : (
        <Box>
          <Field label="Access code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Button label="Save code" kind="secondary" disabled={!code.trim()} onPress={() => setAccessCode(code)} />
        </Box>
      )}
      <Label>Find work by itself</Label>
      <Segmented
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
        value={prefs.autoFind ? 'on' : 'off'}
        onChange={(v) => setAutoFind(v === 'on')}
      />
      <Text style={[s.meta, { marginTop: -S.sm }]}>
        When a machine is free or finishing within 3 days, Aiventre searches for buyers as you open the app (at most 3 searches a day) and
        notifies you.
      </Text>

      <Section title="Backup" />
      <View style={s.row}>
        <Button label="Save a backup" icon="download-outline" kind="secondary" small flex onPress={() => shareBackup().catch((e) => setFileError((e as Error).message))} />
        <Button
          label="Restore"
          icon="refresh-outline"
          kind="secondary"
          small
          flex
          onPress={() =>
            confirm('Restore from a backup?', 'Everything on this phone is replaced by what’s in the backup file.', 'Choose file', () => {
              pickBackup()
                .then((done) => done && router.replace('/'))
                .catch((e) => setFileError((e as Error).message));
            })
          }
        />
      </View>
      <Text style={[s.meta, { marginTop: -S.sm }]}>
        {session ? 'Your shop is saved online too. A backup file is an extra copy you keep yourself.' : 'Your shop lives only on this phone until you sign in. Save a backup to Drive or WhatsApp now and then.'}
      </Text>

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
            confirm('Load the sample shop?', 'This replaces your machines, jobs and buyers with a demo shop.', 'Load', () => {
              clearPhotos();
              clearOpenJobs();
              loadDemo();
              router.replace('/');
            })
          }
        />
        <Button
          label="Reset everything"
          kind="danger"
          onPress={() =>
            confirm('Reset everything?', 'All machines, jobs, buyers and shop details on this phone will be deleted.', 'Reset', () => {
              clearPhotos();
              clearOpenJobs();
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
  row: { flexDirection: 'row', gap: S.md },
  item: { ...type.body, color: c.muted, paddingHorizontal: S.lg, paddingVertical: 14 },
  body: { ...type.body, color: c.muted },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  story: {
    minHeight: 110,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    padding: 14,
    color: c.text,
    fontSize: 16,
    lineHeight: 22,
  },
}));
