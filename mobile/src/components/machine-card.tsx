import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';

import { findWork, useSearches } from '@/lib/find';
import { addDays, gap, jobLabel, type MachineView, parseDay, relativeDay, type Slot, slots, today } from '@/lib/model';
import { makeStyles, type Palette, S, type, useTheme } from '@/lib/theme';

import { Button, Press, statusColors } from './ui';

/** The one-line answer to "what's this machine doing?" */
export function headline(v: MachineView): string {
  switch (v.status) {
    case 'running':
      return v.queue.length ? `Booked till ${relativeDay(v.freeFrom)}` : `Free ${relativeDay(v.freeFrom)}`;
    case 'soon':
      return `Free ${relativeDay(v.freeFrom)}`;
    case 'check':
      return `Was due ${relativeDay(v.current?.due ?? v.freeFrom)}`;
    case 'idle':
      return v.idleDays ? `Idle ${v.idleDays} day${v.idleDays === 1 ? '' : 's'}` : 'Free since today';
    case 'maintenance':
      return 'Maintenance';
  }
}

const slotColor = (c: Palette, s: Slot) => ({ booked: c.booked, check: c.soon, free: c.free, off: c.control })[s];

/**
 * The signature of the app: a machine's next 14 days as 14 small blocks.
 * Filled = booked, empty = free (a gap to sell). Read a whole shop in one look.
 */
export function Ribbon({ view, dates, tall }: { view: MachineView; dates?: boolean; tall?: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  const now = today();
  return (
    <View style={[s.ribbon, tall && { gap: 4 }]} accessibilityLabel={`Next 14 days: ${slots(view, now).filter((x) => x === 'free').length} free`}>
      {slots(view, now).map((slot, i) => (
        <View key={i} style={s.cellWrap}>
          <View style={[s.cell, tall && s.cellTall, dates && s.cellBig, { backgroundColor: slotColor(c, slot) }]} />
          {dates && <Text style={[s.date, i === 0 && { color: c.text, fontWeight: '600' }]}>{parseDay(addDays(now, i)).getDate()}</Text>}
        </View>
      ))}
    </View>
  );
}

/** One machine as a row of the board: name, what it's doing, when it frees up, its 14 days. */
export function MachineRow({ view }: { view: MachineView }) {
  const { c } = useTheme();
  const s = useStyles();
  const { machine, current, queue } = view;
  const col = statusColors(c, view.status);
  const detail = current
    ? [jobLabel(current), current.customer].filter(Boolean).join(' · ')
    : view.status === 'maintenance'
      ? 'Not taking work'
      : 'Nothing running';

  return (
    <Press
      scale={0.985}
      onPress={() => router.push({ pathname: '/machine/[id]', params: { id: machine.id } })}
      style={s.row}
      pressedStyle={{ backgroundColor: c.raised }}>
      <View style={s.top}>
        <Text style={s.name} numberOfLines={1}>
          {machine.name}
        </Text>
        <Text style={[s.headline, { color: col.fg }]}>{headline(view)}</Text>
      </View>
      <Text style={s.detail} numberOfLines={1}>
        {detail}
        {queue.length > 0 && <Text style={{ color: c.faint }}>{`  +${queue.length} queued`}</Text>}
      </Text>
      <Ribbon view={view} />
    </Press>
  );
}

/**
 * One machine on its own card (the Machines tab): how full its next two weeks are, the 14
 * days, what it's doing now — and for a machine with free days, Find work right there.
 */
export function MachineCard({ view }: { view: MachineView }) {
  const { c } = useTheme();
  const s = useStyles();
  const search = useSearches()[view.machine.id];
  const now = today();
  const days = slots(view, now).filter((x) => x !== 'off');
  const share = days.length ? days.filter((x) => x !== 'free').length / days.length : 0;
  const free = gap(view, now);
  const col = statusColors(c, view.status);
  const idle = view.status === 'idle';
  const off = view.status === 'maintenance';
  const { machine, current, queue } = view;

  return (
    <Press
      scale={0.985}
      label={machine.name}
      onPress={() => router.push({ pathname: '/machine/[id]', params: { id: machine.id } })}
      style={[s.card, idle && { borderColor: c.idle, borderWidth: 2 }]}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.cardName} numberOfLines={1}>
            {machine.name}
          </Text>
          {!!machine.details && (
            <Text style={s.detail} numberOfLines={1}>
              {machine.details}
            </Text>
          )}
        </View>
        <Text style={[s.share, idle && { color: c.idle }, off && { color: c.faint }]}>{off ? '—' : `${Math.round(share * 100)}%`}</Text>
      </View>
      <Ribbon view={view} tall />
      <Text style={s.detail} numberOfLines={1}>
        <Text style={{ color: col.fg, fontWeight: '700' }}>{headline(view)}</Text>
        {current ? ` · ${[jobLabel(current), current.customer].filter(Boolean).join(' · ')}` : ''}
        {queue.length > 0 ? `  +${queue.length} queued` : ''}
      </Text>
      {!off && free && (idle || view.status === 'soon') && (
        <View style={s.freeRow}>
          <Text style={[s.freeText, { color: c.idle }]}>
            {free.days} free day{free.days === 1 ? '' : 's'} in the next 2 weeks
          </Text>
          {search?.state === 'running' ? (
            <ActivityIndicator color={c.muted} />
          ) : (
            <Button label="Find work" small onPress={() => findWork(machine.id)} />
          )}
        </View>
      )}
    </Press>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 26, padding: S.lg + 2, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  cardName: { fontSize: 17, fontWeight: '800', color: c.text },
  share: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: c.text, ...type.num },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  freeText: { flex: 1, fontSize: 13, fontWeight: '700' },
  cellTall: { height: 24, borderRadius: 6 },
  row: { paddingHorizontal: S.lg, paddingVertical: 14, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: S.md },
  name: { ...type.strong, fontSize: 16, color: c.text, flexShrink: 1 },
  headline: { fontSize: 14, fontWeight: '600', ...type.num },
  detail: { ...type.meta, color: c.muted },
  ribbon: { flexDirection: 'row', gap: 3, marginTop: 6 },
  cellWrap: { flex: 1, alignItems: 'center', gap: 4 },
  cell: { alignSelf: 'stretch', height: 10, borderRadius: 3 },
  cellBig: { height: 28, borderRadius: 5 },
  date: { fontSize: 12, color: c.faint, ...type.num },
}));
