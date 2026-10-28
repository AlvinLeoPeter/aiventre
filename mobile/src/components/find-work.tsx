import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { findWork, useSearches } from '@/lib/find';
import { usePrefs } from '@/lib/prefs';
import { gap, type MachineView, relativeDay, today } from '@/lib/model';
import { useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

import { Box, Button, Link, Rule, Section } from './ui';

/** What to show next to a machine: search it, it's searching, or see what was found. */
function Action({ machineId, first }: { machineId: string; first: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const search = useSearches()[machineId];
  const fresh = (data.leads ?? []).filter((l) => l.machineId === machineId && l.status === 'new').length;

  if (search?.state === 'running') {
    return (
      <View style={s.searching}>
        <ActivityIndicator size="small" color={c.muted} />
        <Text style={s.meta}>Searching</Text>
      </View>
    );
  }
  if (fresh > 0)
    return (
      <View style={s.both}>
        <Link label={`${fresh} buyer${fresh === 1 ? '' : 's'} →`} onPress={() => router.navigate('/buyers')} />
        <Button label="More" kind="secondary" small onPress={() => findWork(machineId)} />
      </View>
    );
  return <Button label={search?.state === 'failed' ? 'Try again' : 'Find work'} kind={first ? 'primary' : 'secondary'} small onPress={() => findWork(machineId)} />;
}

/**
 * Today's "Free days to fill": every machine with unbooked days in the next two weeks,
 * soonest first, each one tap away from the AI looking for work for it.
 */
export function FindWorkSection({ views }: { views: MachineView[] }) {
  const s = useStyles();
  const autoOn = usePrefs().autoFind;
  const now = today();
  const open = views
    .filter((v) => v.status !== 'maintenance')
    .map((v) => ({ v, free: gap(v, now) }))
    .filter((x): x is { v: MachineView; free: NonNullable<ReturnType<typeof gap>> } => x.free !== null)
    .sort((a, b) => a.free.from.localeCompare(b.free.from));
  if (!open.length) return null;

  return (
    <>
      <Section title="Free days to fill" />
      <Box flush>
        {open.map(({ v, free }, i) => (
          <View key={v.machine.id}>
            {i > 0 && <Rule />}
            <View style={s.row}>
              <Pressable
                accessibilityRole="button"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/machine/[id]', params: { id: v.machine.id } })}>
                <Text style={s.strong}>{v.machine.name}</Text>
                <Text style={s.meta}>
                  {free.from <= now ? 'Free now' : `Free ${relativeDay(free.from)}`} · {free.days} free day{free.days === 1 ? '' : 's'}
                </Text>
              </Pressable>
              <Action machineId={v.machine.id} first={i === 0} />
            </View>
          </View>
        ))}
      </Box>
      <Text style={[s.meta, { marginTop: -S.sm }]}>
        {autoOn
          ? 'Machines free within 3 days are searched by themselves when you open the app — you get a notification when buyers turn up.'
          : 'The AI finds companies near you that buy this kind of work, with a message ready to send.'}
      </Text>
      <Link label="Or see jobs buyers have posted now →" onPress={() => router.push('/open-jobs')} />
    </>
  );
}

/** The same action on a machine's own page. */
export function FindWorkButton({ view }: { view: MachineView }) {
  const data = useData();
  const search = useSearches()[view.machine.id];
  const fresh = (data.leads ?? []).filter((l) => l.machineId === view.machine.id && l.status === 'new').length;
  if (view.status === 'maintenance' || !gap(view)) return null;
  if (search?.state === 'running') return <Button label="Finding work… (1–3 min)" kind="secondary" disabled onPress={() => {}} />;
  if (fresh)
    return (
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Button label={`See ${fresh} buyer${fresh === 1 ? '' : 's'}`} icon="people-outline" kind="secondary" flex onPress={() => router.navigate('/buyers')} />
        <Button label="Find more" icon="search-outline" kind="secondary" flex onPress={() => findWork(view.machine.id)} />
      </View>
    );
  return <Button label="Find work for its free days" icon="search-outline" kind="secondary" onPress={() => findWork(view.machine.id)} />;
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: 64 },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  searching: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  both: { flexDirection: 'row', alignItems: 'center', gap: S.md },
}));
