import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { jobLabel, type MachineView, relativeDay } from '@/lib/model';
import { C, S, T } from '@/lib/theme';

import { Card, Progress, STATUS_COLOR, StatusPill } from './ui';

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
      return v.idleDays ? `Idle for ${v.idleDays} day${v.idleDays === 1 ? '' : 's'}` : 'Free since today';
    case 'maintenance':
      return 'Under maintenance';
  }
}

export function MachineCard({ view }: { view: MachineView }) {
  const color = STATUS_COLOR[view.status];
  const { machine, current, queue } = view;
  return (
    <Card onPress={() => router.push({ pathname: '/machine/[id]', params: { id: machine.id } })} style={styles.card}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {machine.name}
          </Text>
          <StatusPill status={view.status} />
        </View>

        {current ? (
          <View style={{ gap: 2 }}>
            <Text style={T.body} numberOfLines={1}>
              {jobLabel(current)}
            </Text>
            {!!current.customer && (
              <Text style={T.small} numberOfLines={1}>
                {current.customer}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[T.dim, view.status === 'idle' && { color: C.idle }]}>
            {view.status === 'idle' ? 'No job running — losing money' : machine.details || 'No job'}
          </Text>
        )}

        {current && <Progress value={view.progress} color={color} />}

        <View style={styles.row}>
          <Text style={[styles.headline, { color }]}>{headline(view)}</Text>
          {queue.length > 0 && <Text style={T.small}>+{queue.length} queued</Text>}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  bar: { width: 5 },
  body: { flex: 1, padding: S.lg, gap: S.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  name: { fontSize: 18, fontWeight: '800', color: C.text, flexShrink: 1 },
  headline: { fontSize: 14, fontWeight: '800' },
});
