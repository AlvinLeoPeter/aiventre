import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Box, Button, Field, Label, Link, Screen, Section, Segmented } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { clearKept } from '@/lib/keep';
import { clearOpenJobs } from '@/lib/open-jobs';
import { clearPhotos } from '@/lib/photos';
import { type GlowPref, setAccessCode, setAutoFind, setGlow, setTheme, setWatchJobs, type ThemePref, usePrefs } from '@/lib/prefs';
import { pickBackup, shareBackup } from '@/lib/share';
import { loadDemo, resetAll } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const GLOWS: { value: GlowPref; label: string }[] = [
  { value: 'on', label: 'Moving' },
  { value: 'still', label: 'Still' },
  { value: 'off', label: 'Off' },
];

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const;

/** Settings for this phone: how it looks, the AI, backups, and starting over. */
export default function AppSettings() {
  const { c } = useTheme();
  const s = useStyles();
  const prefs = usePrefs();
  const session = useSession();
  const [code, setCode] = useState('');
  const [fileError, setFileError] = useState('');

  return (
    <Screen padTop={false}>
      <Section title="Look" />
      <Label>Light or dark</Label>
      <Segmented options={THEMES} value={prefs.theme} onChange={setTheme} />
      <Label>Colour glow behind the screens</Label>
      <Segmented options={GLOWS} value={prefs.glow} onChange={setGlow} />
      <Text style={[s.meta, { marginTop: -S.sm }]}>If the app feels slow on this phone, choose Still or Off.</Text>

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
      <Segmented options={[...ON_OFF]} value={prefs.autoFind ? 'on' : 'off'} onChange={(v) => setAutoFind(v === 'on')} />
      <Text style={[s.meta, { marginTop: -S.sm }]}>
        When a machine is free or finishing within 3 days, Aiventre searches for buyers as you open the app and notifies you.
      </Text>
      <Label>Watch for open jobs</Label>
      <Segmented options={[...ON_OFF]} value={prefs.watchJobs ? 'on' : 'off'} onChange={(v) => setWatchJobs(v === 'on')} />
      <Text style={[s.meta, { marginTop: -S.sm }]}>
        Every 3 days, as you open the app, Aiventre checks tenders and buy requirements again and notifies you only when something new fits.
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
        {session
          ? 'Your shop is saved online too. A backup file is an extra copy you keep yourself.'
          : 'Your shop lives only on this phone until you sign in. Save a backup to Drive or WhatsApp now and then.'}
      </Text>
      {!!fileError && <Text style={[s.meta, { color: c.idle }]}>{fileError}</Text>}

      <Section title="Demo and reset" />
      <View style={{ gap: S.sm }}>
        <Button
          label="Load the sample shop"
          kind="secondary"
          onPress={() =>
            confirm('Load the sample shop?', 'This replaces your machines, jobs and buyers with a demo shop.', 'Load', () => {
              clearPhotos();
              clearOpenJobs();
              clearKept();
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
              clearKept();
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
  row: { flexDirection: 'row', gap: S.md },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
