import { Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';

import { balance, invoiceState, unbilledJobs } from '@/lib/invoice';
import { followUpDue, jobLabel, type MachineView, relativeDay, today } from '@/lib/model';
import { inr } from '@/lib/quote';
import { extendJob, finishJob, useData } from '@/lib/store';
import { makeStyles, S, type } from '@/lib/theme';

import { Box, Button, Link, Section, success } from './ui';

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

/**
 * "Needs you": jobs to confirm, follow-ups due, money overdue, finished work not billed —
 * each with the one button that deals with it. Nothing shows when nothing needs you.
 */
export function NeedsYou({ views, title = 'Needs you' }: { views: MachineView[]; title?: string }) {
  const s = useStyles();
  const data = useData();
  const now = today();
  const checks = views.filter((v) => v.status === 'check');
  const followUps = (data.leads ?? []).filter((l) => followUpDue(l, now));
  const invoices = (data.invoices ?? []).filter((i) => !i.cancelled);
  const overdue = invoices.filter((i) => invoiceState(i, now).key === 'overdue').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const unbilled = unbilledJobs(data, now);

  if (!(checks.length > 0 || followUps.length > 0 || overdue.length > 0 || unbilled.length > 0)) return null;
  return (
      <>
        <Section title={title} />
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
  );
}

const useStyles = makeStyles((c) => ({
  check: { borderColor: c.soon, gap: S.md },
  question: { ...type.strong, fontSize: 16, color: c.text },
  meta: { ...type.meta, color: c.muted },
  actions: { flexDirection: 'row', gap: S.sm },
}));
