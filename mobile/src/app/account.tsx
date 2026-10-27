import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { Box, Button, Field, Link, Screen, success } from '@/components/ui';
import { sendCode, signOut, useSession, verifyCode } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { relativeDay, toDay } from '@/lib/model';
import { getData, useData } from '@/lib/store';
import { getSyncState, keepThisPhone, syncNow, takeCloudShop, useSyncStatus } from '@/lib/sync';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

function when(iso: string | null) {
  if (!iso) return 'not yet';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${relativeDay(toDay(d))} at ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Sign in with an emailed code; once in, see how syncing is going. */
export default function AccountScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const session = useSession();
  const status = useSyncStatus();
  const data = useData();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Screen padTop={false}>
        <Stack.Screen options={{ title: 'Sign in' }} />
        <Text style={s.title}>Save your shop online</Text>
        <Text style={s.body}>
          Sign in with your email. Your shop is backed up, works on a new phone, and Aiventre can look for work even when the app is
          closed. No password — we email you a code.
        </Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!sent}
          placeholder="you@example.com"
        />
        {!sent ? (
          <Button
            label={busy ? 'Sending…' : 'Email me a code'}
            disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
            onPress={() =>
              act(async () => {
                await sendCode(email);
                setSent(true);
              })
            }
          />
        ) : (
          <>
            <Field
              label={`Code sent to ${email.trim()}`}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={8}
              placeholder="6-digit code"
              autoFocus
            />
            <Button
              label={busy ? 'Checking…' : 'Sign in'}
              disabled={busy || code.replace(/\D/g, '').length < 6}
              onPress={() =>
                act(async () => {
                  const hadShop = !!getData().shop;
                  await verifyCode(email, code);
                  success();
                  await syncNow();
                  // A new phone that just got its shop from the account: go straight to it.
                  if (!hadShop && getData().shop && getSyncState() !== 'choose') router.replace('/');
                })
              }
            />
            <View style={s.between}>
              <Link label="Use another email" onPress={() => (setSent(false), setCode(''))} />
              <Link label="Send again" onPress={() => act(() => sendCode(email))} />
            </View>
            <Text style={s.meta}>Can’t see it? Check spam. Codes expire after an hour.</Text>
          </>
        )}
        {busy && <ActivityIndicator color={c.muted} />}
        {!!error && <Text style={[s.body, { color: c.idle }]}>{error}</Text>}
      </Screen>
    );
  }

  const localName = data.shop?.name;
  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Account' }} />
      <Text style={s.title}>Signed in</Text>
      <Text style={s.body}>{session.user.email}</Text>

      {status.state === 'choose' ? (
        <Box style={{ borderColor: c.soon }}>
          <Text style={s.heading}>Which shop should this phone use?</Text>
          <Text style={s.body}>
            Your account already has “{status.cloudShopName}” saved online, and this phone has “{localName}”.
          </Text>
          <Button
            label={`Use “${status.cloudShopName}” from my account`}
            disabled={busy}
            onPress={() =>
              confirm('Use the online shop?', 'What’s on this phone will be replaced by the shop saved in your account.', 'Use it', () =>
                act(async () => {
                  await takeCloudShop();
                  router.replace('/');
                }),
              )
            }
          />
          <Button
            label={`Keep this phone’s “${localName}”`}
            kind="secondary"
            disabled={busy}
            onPress={() =>
              confirm('Keep this phone’s shop?', 'The shop saved in your account will be replaced by what’s on this phone.', 'Keep it', () =>
                act(keepThisPhone),
              )
            }
          />
        </Box>
      ) : (
        <Box>
          <View style={s.between}>
            <Text style={s.strong}>
              {status.state === 'syncing'
                ? 'Syncing…'
                : status.state === 'offline'
                  ? 'Offline — will sync when you’re back online'
                  : status.state === 'error'
                    ? 'Couldn’t sync'
                    : data.shop
                      ? 'Your shop is saved online'
                      : 'Signed in — finish setting up your shop'}
            </Text>
            {status.state === 'syncing' && <ActivityIndicator color={c.muted} />}
          </View>
          <Text style={s.meta}>Last synced {when(status.lastSynced)}</Text>
          {status.state === 'error' && !!status.message && <Text style={[s.meta, { color: c.idle }]}>{status.message}</Text>}
          <Button label="Sync now" kind="secondary" small disabled={status.state === 'syncing'} onPress={() => act(syncNow)} />
        </Box>
      )}

      {!data.shop && status.state !== 'choose' && <Button label="Set up my shop" onPress={() => router.replace('/onboarding')} />}
      {!!error && <Text style={[s.body, { color: c.idle }]}>{error}</Text>}

      <Button
        label="Sign out"
        kind="danger"
        onPress={() =>
          confirm('Sign out?', 'Your shop stays on this phone. Changes sync again when you sign back in.', 'Sign out', () => {
            signOut();
            router.back();
          })
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  title: { ...type.title, color: c.text },
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text, flex: 1 },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
}));
