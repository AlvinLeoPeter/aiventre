import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MachineCard } from '@/components/machine-card';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { daysBetween, jobLabel, type MachineView, niceDay, relativeDay, type Status, today, viewAll } from '@/lib/model';
import { extendJob, finishJob, useData } from '@/lib/store';
import { C, R, S, T } from '@/lib/theme';

// Most urgent first: answers needed, then money leaking, then gaps coming.
const ORDER: Status[] = ['check', 'idle', 'soon', 'running', 'maintenance'];
const GAP_WINDOW_DAYS = 14;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Tile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.tile, { borderColor: value ? color + '55' : C.border }]}>
      <Text style={[styles.tileValue, { color: value ? color : C.textFaint }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function DoneCheck({ view }: { view: MachineView }) {
  const job = view.current!;
  return (
    <Card style={styles.check}>
      <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
        <View style={styles.checkIcon}>
          <Ionicons name="help" size={20} color={C.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkTitle}>
            Is {jobLabel(job)} on {view.machine.name} done?
          </Text>
          <Text style={T.small}>It was due {relativeDay(job.due!)}.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Done" icon="checkmark" kind="good" flex onPress={() => finishJob(job.id)} />
        <Button label="+1 day" kind="secondary" flex onPress={() => extendJob(job.id, 1)} />
        <Button label="+2 days" kind="secondary" flex onPress={() => extendJob(job.id, 2)} />
      </View>
    </Card>
  );
}

export default function Today() {
  const data = useData();
  const now = today();
  const views = viewAll(data, now).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  const count = (...s: Status[]) => views.filter((v) => s.includes(v.status)).length;
  const checks = views.filter((v) => v.status === 'check');
  const gaps = views
    .filter((v) => v.status !== 'maintenance' && daysBetween(now, v.freeFrom) <= GAP_WINDOW_DAYS)
    .sort((a, b) => a.freeFrom.localeCompare(b.freeFrom));

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Text style={T.dim}>
          {greeting()}
          {data.shop?.owner ? `, ${data.shop.owner}` : ''}
        </Text>
        <Text style={T.hero}>{data.shop?.name}</Text>
        <Text style={T.small}>{niceDay(now)}</Text>
      </View>

      <View style={styles.tiles}>
        <Tile value={count('running', 'check')} label="Running" color={C.running} />
        <Tile value={count('soon')} label="Free soon" color={C.soon} />
        <Tile value={count('idle')} label="Idle" color={C.idle} />
      </View>

      {checks.length > 0 && (
        <>
          <SectionTitle>Needs you</SectionTitle>
          {checks.map((v) => (
            <DoneCheck key={v.machine.id} view={v} />
          ))}
        </>
      )}

      <SectionTitle
        right={
          <Text style={styles.link} onPress={() => router.push('/job')}>
            + Add job
          </Text>
        }>
        Machines
      </SectionTitle>
      {views.length === 0 ? (
        <Card>
          <Text style={T.dim}>No machines yet. Add them in the Machines tab.</Text>
        </Card>
      ) : (
        views.map((v) => <MachineCard key={v.machine.id} view={v} />)
      )}

      {gaps.length > 0 && (
        <>
          <SectionTitle>{`Free soon · next ${GAP_WINDOW_DAYS} days`}</SectionTitle>
          <Card style={{ gap: S.md }}>
            {gaps.map((v) => (
              <View key={v.machine.id} style={styles.gapRow}>
                <View style={[styles.gapDot, { backgroundColor: v.status === 'idle' ? C.idle : C.soon }]} />
                <Text style={[T.body, { flex: 1, fontWeight: '700' }]}>{v.machine.name}</Text>
                <Text style={T.dim}>{v.freeFrom <= now ? 'free now' : `free ${relativeDay(v.freeFrom)}`}</Text>
              </View>
            ))}
            <View style={styles.teaser}>
              <Ionicons name="sparkles" size={16} color={C.mint} />
              <Text style={[T.small, { flex: 1, color: C.textDim }]}>
                Next update: the AI finds buyers for these gaps before they start.
              </Text>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: S.sm },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, paddingVertical: S.lg, paddingHorizontal: S.md, gap: 2 },
  tileValue: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  tileLabel: { fontSize: 12, fontWeight: '700', color: C.textDim },
  check: { gap: S.md, borderColor: C.soon + '66' },
  checkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.soon, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  actions: { flexDirection: 'row', gap: S.sm },
  link: { color: C.brand, fontWeight: '800', fontSize: 14 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  gapDot: { width: 10, height: 10, borderRadius: 5 },
  teaser: { flexDirection: 'row', gap: S.sm, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.md },
});
