import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { addDays, jobLabel, type MachineView, parseDay, relativeDay, type Slot, slots, today } from '@/lib/model';
import { makeStyles, type Palette, S, type, useTheme } from '@/lib/theme';

import { Press, statusColors } from './ui';

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
export function Ribbon({ view, dates }: { view: MachineView; dates?: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  const now = today();
  return (
    <View style={s.ribbon} accessibilityLabel={`Next 14 days: ${slots(view, now).filter((x) => x === 'free').length} free`}>
      {slots(view, now).map((slot, i) => (
        <View key={i} style={s.cellWrap}>
          <View style={[s.cell, dates && s.cellBig, { backgroundColor: slotColor(c, slot) }]} />
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

const useStyles = makeStyles((c) => ({
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
