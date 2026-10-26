import { Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';

import { MachineRow } from '@/components/machine-card';
import { Box, Button, Link, Rule, Screen, Section, success } from '@/components/ui';
import { addDays, BOARD_DAYS, freeDays, jobLabel, type MachineView, niceDay, relativeDay, type Status, today, viewAll } from '@/lib/model';
import { extendJob, finishJob, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

// Most urgent first: answers needed, then money leaking, then gaps coming.
const ORDER: Status[] = ['check', 'idle', 'soon', 'running', 'maintenance'];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Stat({ label, value, color, first }: { label: string; value: number; color?: string; first?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.stat, !first && s.statDivider]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function DoneCheck({ view }: { view: MachineView }) {
  const s = useStyles();
  const job = view.current!;
  return (
    <Animated.View exiting={FadeOut.duration(180)}>
      <Box style={s.check}>
        <View style={{ gap: 2 }}>
          <Text style={s.question}>Is {jobLabel(job)} done?</Text>
          <Text style={s.meta}>
            {view.machine.name} · was due {relativeDay(job.due!)}
          </Text>
        </View>
        <View style={s.actions}>
          <Button
            label="Done"
            icon="checkmark"
            flex
            small
            onPress={() => {
              success();
              finishJob(job.id);
            }}
          />
          <Button label="+1 day" kind="secondary" flex small onPress={() => extendJob(job.id, 1)} />
          <Button label="+2 days" kind="secondary" flex small onPress={() => extendJob(job.id, 2)} />
        </View>
      </Box>
    </Animated.View>
  );
}

export default function Today() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const now = today();
  const views = viewAll(data, now).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  const count = (...st: Status[]) => views.filter((v) => st.includes(v.status)).length;
  const checks = views.filter((v) => v.status === 'check');
  const idle = count('idle');
  const free = freeDays(views, now);

  return (
    <Screen
      sub={`${greeting()}${data.shop?.owner ? `, ${data.shop.owner}` : ''} · ${niceDay(now)}`}
      title={data.shop?.name}>
      <Box flush style={s.stats}>
        <Stat first label="Working" value={count('running', 'soon', 'check')} />
        <Stat label="Idle now" value={idle} color={idle ? c.idle : undefined} />
        <Stat label="Free days" value={free} />
      </Box>

      {checks.length > 0 && (
        <>
          <Section title="Needs you" />
          {checks.map((v) => (
            <DoneCheck key={v.machine.id} view={v} />
          ))}
        </>
      )}

      <Section title="Machines" right={<Link label="+ Add job" onPress={() => router.push('/job')} />} />
      {views.length === 0 ? (
        <Box>
          <Text style={s.body}>No machines yet. Add the ones on your floor and the board fills itself in.</Text>
          <Button label="Add machines" onPress={() => router.navigate('/machines')} />
        </Box>
      ) : (
        <Box flush>
          <View style={s.boardHead}>
            <Text style={s.meta}>Today</Text>
            <Text style={s.meta}>{`Next ${BOARD_DAYS} days · to ${niceDay(addDays(now, BOARD_DAYS - 1))}`}</Text>
          </View>
          {views.map((v) => (
            <View key={v.machine.id}>
              <Rule />
              <MachineRow view={v} />
            </View>
          ))}
        </Box>
      )}

      {views.length > 0 && (
        <View style={s.legend}>
          <View style={[s.key, { backgroundColor: c.booked }]} />
          <Text style={s.meta}>Booked</Text>
          <View style={[s.key, { backgroundColor: c.free, marginLeft: S.md }]} />
          <Text style={s.meta}>Free — the AI will look for work here</Text>
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  stats: { flexDirection: 'row' },
  stat: { flex: 1, paddingVertical: 14, paddingHorizontal: S.md, gap: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: c.rule },
  statLabel: { ...type.meta, color: c.muted },
  statValue: { ...type.value, color: c.text },
  check: { borderColor: c.soon, gap: S.md },
  question: { ...type.strong, fontSize: 16, color: c.text },
  meta: { ...type.meta, color: c.muted },
  body: { ...type.body, color: c.muted },
  actions: { flexDirection: 'row', gap: S.sm },
  boardHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingVertical: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: -S.sm },
  key: { width: 10, height: 10, borderRadius: 3 },
}));
