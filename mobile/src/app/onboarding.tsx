import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';

import { DEFAULT_REACH, ShopPlace } from '@/components/place';
import { Box, Button, Chip, Field, Label, Screen } from '@/components/ui';
import { runTask, type SetupResult } from '@/lib/api';
import { machineTypesFor, WORK_TYPES } from '@/lib/demo';
import type { Shop } from '@/lib/model';
import { useAIReady } from '@/lib/auth';
import { setAccessCode } from '@/lib/prefs';
import { finishOnboarding, loadDemo } from '@/lib/store';
import { makeStyles, type Palette, R, S, type, useTheme } from '@/lib/theme';

type Step = 'welcome' | 'describe' | 'shop' | 'machines';


// A taste of the board on the welcome screen: three machines, their next 14 days.
const PREVIEW: { name: string; note: string; booked: number; tone: keyof Palette }[] = [
  { name: 'VMC 1', note: 'Free in 9 days', booked: 9, tone: 'running' },
  { name: 'VMC 2', note: 'Free Thursday', booked: 3, tone: 'soon' },
  { name: 'CNC lathe', note: 'Idle 2 days', booked: 0, tone: 'idle' },
];

const EXAMPLE =
  'e.g. I’m Rajesh, I run Sharma Precision in Chakan MIDC, Pune. We have 2 Haas VMCs and one CNC lathe, mostly auto parts in EN8 and aluminium.';

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

/** Each step slides in gently from the right, so moving forward feels like moving forward. */
function StepView({ children }: { children: ReactNode }) {
  return (
    <Animated.View entering={FadeInRight.duration(260)} style={{ gap: S.lg }}>
      {children}
    </Animated.View>
  );
}

export default function Onboarding() {
  const { c } = useTheme();
  const s = useStyles();
  const aiReady = useAIReady();
  const [step, setStep] = useState<Step>('welcome');
  const [shop, setShop] = useState<Shop>({ name: '', owner: '', city: '', work: [], reach: DEFAULT_REACH });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState('');

  const [story, setStory] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [filled, setFilled] = useState(false);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const bump = (t: string, by: number) => setCounts((n) => ({ ...n, [t]: Math.max(0, (n[t] ?? 0) + by) }));
  const toggleWork = (w: string) =>
    setShop((p) => ({ ...p, work: p.work.includes(w) ? p.work.filter((x) => x !== w) : [...p.work, w] }));
  const patch = (p: Partial<Shop>) => setShop((prev) => ({ ...prev, ...p }));

  // The owner talks (or types) once; the AI fills in the next two steps for them to check.
  const fillFromStory = async () => {
    setBusy(true);
    setError('');
    try {
      if (!aiReady) setAccessCode(code);
      const r = await runTask<SetupResult>('setup_shop', {
        text: story,
        work_options: WORK_TYPES,
        machine_options: machineTypesFor([]),
      });
      setShop((p) => ({
        ...p,
        name: r.shop_name || p.name,
        owner: r.owner_name || p.owner,
        area: r.area || p.area,
        city: r.city || p.city,
        state: r.state || p.state,
        work: r.work.filter((w) => WORK_TYPES.includes(w)),
        summary: r.summary || p.summary,
        phone: r.phone || p.phone,
        email: r.email || p.email,
        capabilities: r.capabilities,
        materials: r.materials,
        industries: r.industries,
        certifications: r.certifications,
      }));
      setCounts(Object.fromEntries(r.machines.filter((m) => m.type && m.count > 0).map((m) => [m.type, Math.min(m.count, 99)])));
      setDetails(Object.fromEntries(r.machines.filter((m) => m.details).map((m) => [m.type, m.details])));
      setMissing(r.missing);
      setFilled(true);
      setStep('shop');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'welcome') {
    return (
      <Screen>
        <View style={s.hero}>
          <Text style={s.wordmark}>Aiventre</Text>
          <Text style={s.tagline}>Every machine at a glance. Your next job, found before a machine goes idle.</Text>
        </View>
        <Preview />
        <Button label="Set up my shop" icon="arrow-forward" onPress={() => setStep('describe')} />
        <Button
          label="Try a sample shop"
          kind="secondary"
          onPress={() => {
            loadDemo();
            router.replace('/');
          }}
        />
        <Text style={[s.meta, { textAlign: 'center' }]}>Takes about a minute.</Text>
        <Button label="I already have an account — sign in" kind="quiet" onPress={() => router.push('/account')} />
      </Screen>
    );
  }

  if (step === 'describe') {
    return (
      <Screen>
        <StepView key="describe">
          <View style={{ gap: 2 }}>
            <Text style={s.meta}>Step 1 of 3</Text>
            <Text style={s.title}>Tell us about your shop</Text>
          </View>
          <Text style={s.muted}>
            Say it the way you’d tell a new buyer: your name, the shop, where it is, what work you do and which machines you have. Tap
            the mic on your keyboard to just talk.
          </Text>
          <TextInput
            value={story}
            onChangeText={setStory}
            placeholder={EXAMPLE}
            placeholderTextColor={c.faint}
            selectionColor={c.text}
            multiline
            textAlignVertical="top"
            style={s.story}
          />
          {!aiReady && (
            <Field
              label="Access code (from Alvin)"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          )}
          <Button
            label={busy ? 'Reading what you wrote…' : 'Fill it in for me'}
            disabled={busy || story.trim().length < 15 || (!aiReady && !code.trim())}
            onPress={fillFromStory}
          />
          {busy && (
            <View style={s.row}>
              <ActivityIndicator color={c.muted} />
              <Text style={s.meta}>A few seconds.</Text>
            </View>
          )}
          {!!error && <Text style={[s.muted, { color: c.idle }]}>{error}</Text>}
          <Button label="I’ll fill it in myself" kind="secondary" onPress={() => setStep('shop')} />
          <Text style={s.meta}>What you write is sent to Aiventre’s AI only to fill in this setup.</Text>
          <Button label="Back" kind="quiet" onPress={() => setStep('welcome')} />
        </StepView>
      </Screen>
    );
  }

  if (step === 'shop') {
    return (
      <Screen>
        <StepView key="shop">
          <View style={{ gap: 2 }}>
            <Text style={s.meta}>Step 2 of 3</Text>
            <Text style={s.title}>Your shop</Text>
          </View>
          {filled && (
            <Box style={{ gap: S.sm }}>
              <Text style={s.strong}>Filled in from what you wrote — check it.</Text>
              {missing.length > 0 && (
                <>
                  <Text style={s.meta}>Worth adding:</Text>
                  {missing.slice(0, 3).map((m) => (
                    <Text key={m} style={s.meta}>
                      • {m}
                    </Text>
                  ))}
                </>
              )}
            </Box>
          )}
          <Field label="Shop name" value={shop.name} onChangeText={(name) => patch({ name })} placeholder="e.g. Sharma Precision" />
          <Field label="Your name" value={shop.owner} onChangeText={(owner) => patch({ owner })} placeholder="e.g. Rajesh" />
          <View style={{ gap: S.sm }}>
            <Label>What work do you do?</Label>
            <View style={s.chips}>
              {WORK_TYPES.map((w) => (
                <Chip key={w} label={w} selected={shop.work.includes(w)} onPress={() => toggleWork(w)} />
              ))}
            </View>
          </View>
          <ShopPlace value={shop} onChange={patch} />
          <Button label="Next: your machines" icon="arrow-forward" disabled={!shop.name.trim()} onPress={() => setStep('machines')} />
          <Button label="Back" kind="quiet" onPress={() => setStep('describe')} />
        </StepView>
      </Screen>
    );
  }

  const suggestions = machineTypesFor(shop.work);
  return (
    <Screen>
      <StepView key="machines">
        <View style={{ gap: 2 }}>
          <Text style={s.meta}>Step 3 of 3</Text>
          <Text style={s.title}>Your machines</Text>
        </View>
        <Text style={s.muted}>Tap a type once for each machine you have.</Text>
        <View style={s.chips}>
          {[...suggestions, ...Object.keys(counts).filter((k) => !suggestions.includes(k))].map((t) => (
            <Chip key={t} label={t} count={counts[t]} selected={!!counts[t]} onPress={() => bump(t, 1)} />
          ))}
        </View>
        <View style={[s.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <Field label="Something else?" value={custom} onChangeText={setCustom} placeholder="e.g. Honing machine" />
          </View>
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

        {total > 0 && (
          <Box style={{ gap: S.sm }}>
            {Object.entries(counts)
              .filter(([, n]) => n > 0)
              .map(([t, n]) => (
                <View key={t} style={s.countRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.strong}>{t}</Text>
                    {!!details[t] && <Text style={s.meta}>{details[t]}</Text>}
                  </View>
                  <Button label="−" kind="secondary" small onPress={() => bump(t, -1)} />
                  <Text style={s.count}>{n}</Text>
                  <Button label="+" kind="secondary" small onPress={() => bump(t, 1)} />
                </View>
              ))}
          </Box>
        )}

        <Button
          label={total ? `Done · ${total} machine${total === 1 ? '' : 's'}` : 'Add at least one machine'}
          icon="checkmark"
          disabled={!total}
          onPress={() => {
            const clean = (v?: string) => v?.trim() ?? '';
            finishOnboarding(
              { ...shop, name: clean(shop.name), owner: clean(shop.owner), city: clean(shop.city), area: clean(shop.area), state: clean(shop.state) },
              Object.entries(counts)
                .filter(([, n]) => n > 0)
                .map(([t, count]) => ({ type: t, count, details: details[t] })),
            );
            router.replace('/');
          }}
        />
        <Button label="Back" kind="quiet" onPress={() => setStep('shop')} />
      </StepView>
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
  story: {
    minHeight: 160,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    padding: 14,
    color: c.text,
    fontSize: 16,
    lineHeight: 22,
  },
  previewRow: { paddingHorizontal: S.lg, paddingVertical: 10, gap: 8 },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cells: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, height: 10, borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  count: { color: c.text, fontSize: 18, fontWeight: '600', minWidth: 28, textAlign: 'center', ...type.num },
}));
