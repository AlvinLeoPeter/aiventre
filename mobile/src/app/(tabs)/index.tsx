import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FindWorkSection, FreeHighlight } from '@/components/find-work';
import { Ring } from '@/components/ring';
import { Box, Button, Link, Press, Screen, Section, StatusPill, success } from '@/components/ui';
import { balance, invoiceState, unbilledJobs } from '@/lib/invoice';
import { addDays, bookedShare, followUpDue, freeDays, gap, jobLabel, type MachineView, parseDay, relativeDay, slots, type Status, today, viewAll } from '@/lib/model';
import { autoFind } from '@/lib/find';
import { inr } from '@/lib/quote';
import { extendJob, finishJob, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

// Most urgent first: answers needed, then money leaking, then gaps coming.
const ORDER: Status[] = ['check', 'idle', 'soon', 'running', 'maintenance'];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STRIP_DAYS = 6;

/** The next six days at a glance: a green ring when every machine is booked, orange when one is free. */
function WeekStrip({ views, now }: { views: MachineView[]; now: string }) {
  const { c } = useTheme();
  const s = useStyles();
  const all = views.map((v) => slots(v, now, STRIP_DAYS));
  return (
    <View style={s.strip}>
      {Array.from({ length: STRIP_DAYS }, (_, i) => {
        const day = addDays(now, i);
        const working = all.map((d) => d[i]).filter((x) => x !== 'off');
        const free = working.includes('free');
        const ring = !working.length ? c.control : free ? c.idle : c.running;
        return (
          <View
            key={day}
            style={[s.day, i === 0 && s.dayToday]}
            accessible
            accessibilityLabel={`${WEEKDAY[parseDay(day).getDay()]} ${parseDay(day).getDate()}: ${!working.length ? 'nothing running' : free ? 'a machine is free' : 'fully booked'}`}>
            <Text style={[s.dayName, i === 0 && s.dayNameToday]}>{WEEKDAY[parseDay(day).getDay()]}</Text>
            <View style={[s.dayRing, { borderColor: ring }]}>
              <Text style={s.dayNum}>{parseDay(day).getDate()}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** One small card per machine: its state and when it's next free. */
function MachineTile({ view, now }: { view: MachineView; now: string }) {
  const { c } = useTheme();
  const s = useStyles();
  const g = gap(view, now);
  const line =
    view.status === 'maintenance'
      ? 'Under maintenance'
      : view.status === 'check'
        ? 'Is the job done?'
        : view.status === 'idle'
          ? `${g?.days ?? 0} day${g?.days === 1 ? '' : 's'} free`
          : `Free ${relativeDay(view.freeFrom)}`;
  return (
    <Press
      label={view.machine.name}
      scale={0.97}
      style={[s.tile, view.status === 'idle' && { borderColor: c.idle, borderWidth: 2 }]}
      onPress={() => router.push({ pathname: '/machine/[id]', params: { id: view.machine.id } })}>
      <Text style={s.tileName} numberOfLines={1}>
        {view.machine.name}
      </Text>
      <StatusPill status={view.status} />
      <Text style={s.meta} numberOfLines={2}>
        {line}
      </Text>
    </Press>
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

  // Right after setup (or loading the sample shop), start looking for work for free machines.
  useEffect(() => {
    autoFind();
  }, []);
  const views = viewAll(data, now).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  const checks = views.filter((v) => v.status === 'check');
  const followUps = (data.leads ?? []).filter((l) => followUpDue(l, now));
  const idle = views.filter((v) => v.status === 'idle').length;
  const free = freeDays(views, now);
  const booked = bookedShare(views, now);
  const invoices = (data.invoices ?? []).filter((i) => !i.cancelled);
  const overdue = invoices.filter((i) => invoiceState(i, now).key === 'overdue').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const unbilled = unbilledJobs(data, now);
  const name = data.shop?.name ?? '';

  return (
    <Screen>
      <View style={s.header}>
        <Press label="My shop and settings" scale={0.94} style={s.avatar} onPress={() => router.navigate('/shop')}>
          <Text style={s.avatarText}>{(name.trim()[0] ?? 'A').toUpperCase()}</Text>
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={s.meta}>
            {greeting()}
            {data.shop?.owner ? `, ${data.shop.owner}` : ''}
          </Text>
          <Text style={s.shopName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Press label="Settings" scale={0.92} style={s.gear} onPress={() => router.push('/settings/app')}>
          <Ionicons name="settings-outline" size={22} color={c.text} />
        </Press>
      </View>

      {views.length > 0 && <WeekStrip views={views} now={now} />}

      {views.length > 0 && (
        <Box style={s.pulse}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.metaStrong}>Next 2 weeks</Text>
            <Text style={s.big}>
              {Math.round(booked * 100)}%<Text style={s.bigUnit}> booked</Text>
            </Text>
            <Text style={s.meta}>
              {free} machine-day{free === 1 ? '' : 's'} free{idle ? ` · ${idle} idle now` : ''}
            </Text>
          </View>
          <Ring value={booked} size={96} stroke={12} label="booked" caption="next 2 weeks" bare />
        </Box>
      )}

      {views.length > 0 && (
        <View style={s.tiles}>
          {views.map((v) => (
            <MachineTile key={v.machine.id} view={v} now={now} />
          ))}
        </View>
      )}

      <FreeHighlight views={views} />

      {(checks.length > 0 || followUps.length > 0 || overdue.length > 0 || unbilled.length > 0) && (
        <>
          <Section title="Needs you" />
          {checks.map((v) => (
            <DoneCheck key={v.machine.id} view={v} />
          ))}
          {followUps.slice(0, 3).map((l) => (
            <Box key={l.id} style={s.check}>
              <View style={{ gap: 2 }}>
                <Text style={s.question}>Follow up with {l.company}?</Text>
                <Text style={s.meta}>No reply since you contacted them.</Text>
              </View>
              <Button label="Write a follow-up" icon="sparkles-outline" small onPress={() => router.push({ pathname: '/buyer/[id]', params: { id: l.id } })} />
            </Box>
          ))}
          {followUps.length > 3 && <Link label={`${followUps.length - 3} more follow-ups →`} onPress={() => router.navigate('/buyers')} />}
          {overdue.slice(0, 2).map((i) => (
            <Box key={i.id} style={s.check}>
              <View style={{ gap: 2 }}>
                <Text style={s.question}>
                  {inr(balance(i))} overdue from {i.buyer.name}
                </Text>
                <Text style={s.meta}>
                  {i.number} · {invoiceState(i, now).label}
                </Text>
              </View>
              <Button label="Send a reminder" icon="notifications-outline" small onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: i.id } })} />
            </Box>
          ))}
          {unbilled.length > 0 && (
            <Box style={s.check}>
              <View style={{ gap: 2 }}>
                <Text style={s.question}>
                  {unbilled.length === 1 ? `Bill ${jobLabel(unbilled[0])}?` : `${unbilled.length} finished jobs not billed`}
                </Text>
                <Text style={s.meta}>{unbilled[0].customer ? `For ${unbilled[0].customer}` : 'Finished, no invoice yet'}</Text>
              </View>
              <Button
                label="Make invoice"
                icon="receipt-outline"
                small
                onPress={() => {
                  const first = unbilled[0].customer;
                  const ids = unbilled.filter((j) => j.customer === first).map((j) => j.id);
                  router.push({ pathname: '/invoice/edit', params: { jobIds: ids.join(',') } });
                }}
              />
            </Box>
          )}
        </>
      )}

      {views.length === 0 ? (
        <Box>
          <Text style={s.body}>No machines yet. Add the ones on your floor and Aiventre keeps track of when each one is free.</Text>
          <Button label="Add machines" onPress={() => router.navigate('/machines')} />
        </Box>
      ) : (
        <FindWorkSection views={views} />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: c.onPrimary },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 48, alignItems: 'center', gap: 6, paddingVertical: 6, borderRadius: 16 },
  dayToday: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  dayName: { fontSize: 12, color: c.muted },
  dayNameToday: { fontWeight: '800', color: c.text },
  dayRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 14, fontWeight: '700', color: c.text, ...type.num },
  pulse: { flexDirection: 'row', alignItems: 'center', gap: S.lg, padding: S.xl - 2 },
  metaStrong: { ...type.meta, fontWeight: '600', color: c.muted },
  big: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.5, color: c.text, ...type.num },
  bigUnit: { fontSize: 18, fontWeight: '700', letterSpacing: 0, color: c.muted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '45%', flexGrow: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: S.md, gap: S.sm },
  tileName: { fontSize: 14, fontWeight: '800', color: c.text },
  check: { borderColor: c.soon, gap: S.md },
  question: { ...type.strong, fontSize: 16, color: c.text },
  meta: { ...type.meta, color: c.muted },
  body: { ...type.body, color: c.muted },
  actions: { flexDirection: 'row', gap: S.sm },
}));
