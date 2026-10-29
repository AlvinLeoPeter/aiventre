import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Box, Button, Press, Rule, Screen } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { getPhotos, usePhotos } from '@/lib/photos';
import { shareProfile } from '@/lib/share';
import { useData } from '@/lib/store';
import { useSyncStatus } from '@/lib/sync';
import { trustSteps } from '@/lib/trust';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

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

/** One line in the settings list: an icon, what it is, what's in it now, and a chevron. */
function Row({ icon, label, sub, to, first }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; to: Href; first?: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <>
      {!first && <Rule inset={64} />}
      <Press label={label} scale={0.99} style={s.row} onPress={() => router.push(to)}>
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={20} color={c.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.strong}>{label}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Press>
    </>
  );
}

/**
 * My shop: who you are at a glance, then a short list — each part of the profile and the
 * phone's settings on its own small screen, instead of one long form.
 */
export default function ShopScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const shop = data.shop!;
  const [fileError, setFileError] = useState('');
  const place = [shop.area, shop.city].filter(Boolean).join(', ');
  const work = [...shop.work, ...(shop.materials ?? [])];

  return (
    <Screen title="My shop">
      <Press label="Shop details" scale={0.98} onPress={() => router.push('/settings/details')}>
        <Box style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(shop.name.trim()[0] ?? 'A').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>
              {shop.name}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {[shop.owner, place].filter(Boolean).join(' · ') || 'Add your name and place'}
            </Text>
          </View>
          <Ionicons name="create-outline" size={20} color={c.muted} />
        </Box>
      </Press>

      <AccountBox />
      <TrustCard />
      <Button label="Send my company profile (PDF)" icon="document-text-outline" onPress={() => shareProfile(data, getPhotos()).catch((e) => setFileError((e as Error).message))} />
      {!!fileError && <Text style={[s.meta, { color: c.idle }]}>{fileError}</Text>}

      <Box flush>
        <Row first icon="storefront-outline" label="Shop details" sub={shop.phone || shop.email ? [shop.phone, shop.email].filter(Boolean).join(' · ') : 'Name, contact, place, hour rate'} to="/settings/details" />
        <Row icon="receipt-outline" label="GST and bank" sub={shop.gstin ? `GSTIN ${shop.gstin}` : 'GSTIN, address, bank — for invoices'} to="/settings/billing" />
        <Row icon="construct-outline" label="Work you do" sub={work.length ? work.slice(0, 4).join(', ') : 'Work, materials, industries'} to="/settings/work" />
        <Row icon="options-outline" label="App and AI" sub="Look, automatic searches, backup" to="/settings/app" />
      </Box>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: c.onPrimary },
  name: { fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.active, alignItems: 'center', justifyContent: 'center' },
  body: { ...type.body, color: c.muted },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
