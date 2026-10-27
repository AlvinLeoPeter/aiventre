import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { FindWorkButton } from '@/components/find-work';
import { headline, Ribbon } from '@/components/machine-card';
import { Box, Button, Field, Link, Progress, Rule, Screen, Section, StatusPill, statusColors, success } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { jobLabel, niceDay, queueSchedule, relativeDay, today, viewMachine } from '@/lib/model';
import { extendJob, finishJob, removeJob, removeMachine, startJob, updateMachine, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

export default function MachineScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const machine = data.machines.find((m) => m.id === id);
  const [name, setName] = useState(machine?.name ?? '');
  const [details, setDetails] = useState(machine?.details ?? '');

  if (!machine) {
    return (
      <Screen padTop={false}>
        <Text style={s.muted}>This machine was removed.</Text>
      </Screen>
    );
  }

  const view = viewMachine(data, machine);
  const { current, queue, status } = view;
  const col = statusColors(c, status);
  const now = today();
  const schedule = queueSchedule(view, now);
  const editJob = (jobId: string) => router.push({ pathname: '/job', params: { id: jobId } });

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: machine.name }} />

      <View style={{ gap: S.sm }}>
        <StatusPill status={status} />
        <Text style={s.big}>{headline(view)}</Text>
        {!!machine.details && <Text style={s.muted}>{machine.details}</Text>}
      </View>

      <View style={{ gap: S.sm }}>
        <Ribbon view={view} dates />
      </View>

      {current ? (
        <Box style={status === 'check' && { borderColor: c.soon }}>
          <View style={s.between}>
            <Text style={s.label}>{status === 'check' ? 'Is it done?' : 'Running now'}</Text>
            <Link label="Edit" onPress={() => editJob(current.id)} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={s.heading}>{jobLabel(current)}</Text>
            {!!current.customer && <Text style={s.muted}>{current.customer}</Text>}
          </View>
          <Progress value={view.progress} color={col.fg} />
          <Text style={s.meta}>
            Started {relativeDay(current.start!)} · {current.due! < now ? 'was due' : 'finishes'} {niceDay(current.due!)}
          </Text>
          <Button
            label="Job done"
            icon="checkmark"
            onPress={() => {
              success();
              finishJob(current.id);
            }}
          />
          <View style={s.row}>
            <Button label="+1 day" kind="secondary" flex small onPress={() => extendJob(current.id, 1)} />
            <Button label="+2 days" kind="secondary" flex small onPress={() => extendJob(current.id, 2)} />
            <Button label="+1 week" kind="secondary" flex small onPress={() => extendJob(current.id, 7)} />
          </View>
        </Box>
      ) : (
        <Box style={status === 'idle' && { borderColor: c.idle }}>
          <Text style={s.heading}>{status === 'maintenance' ? 'Under maintenance' : 'Nothing running'}</Text>
          <Text style={s.muted}>
            {status === 'maintenance'
              ? 'Switch maintenance off below when it’s back in action.'
              : 'Every idle day costs you. Add the next job, or let the AI find one below.'}
          </Text>
        </Box>
      )}

      <Section title={queue.length ? `Up next · ${queue.length}` : 'Up next'} />
      {schedule.length > 0 && (
        <Box flush>
          {schedule.map(({ job, start, end }, i) => (
            <View key={job.id}>
              {i > 0 && <Rule />}
              <View style={s.queued}>
                <View style={s.between}>
                  <Text style={[s.strong, { flex: 1 }]} numberOfLines={1}>
                    {jobLabel(job)}
                  </Text>
                  <Text style={[s.meta, type.num]}>
                    {niceDay(start)} → {niceDay(end)}
                  </Text>
                </View>
                <Text style={s.meta}>
                  {[job.customer, `${job.days} day${job.days === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                </Text>
                <View style={s.row}>
                  {!current && <Button label="Start now" flex small onPress={() => startJob(job.id)} />}
                  <Button label="Edit" kind="secondary" flex small onPress={() => editJob(job.id)} />
                  <Button
                    label="Remove"
                    kind="danger"
                    flex
                    small
                    onPress={() => confirm('Remove this job?', jobLabel(job), 'Remove', () => removeJob(job.id))}
                  />
                </View>
              </View>
            </View>
          ))}
        </Box>
      )}
      <Button
        label="Add a job to this machine"
        icon="add"
        kind={current ? 'secondary' : 'primary'}
        onPress={() => router.push({ pathname: '/job', params: { machineId: machine.id } })}
      />

      <FindWorkButton view={view} />
      <Button
        label={`Ask the machine expert about ${machine.name}`}
        icon="construct-outline"
        kind="secondary"
        onPress={() => router.push({ pathname: '/expert', params: { machine: machine.id } })}
      />

      <Section title="Machine" />
      <Box style={{ gap: S.lg }}>
        <Field label="Name" value={name} onChangeText={setName} onBlur={() => name.trim() && updateMachine(machine.id, { name: name.trim() })} />
        <Field
          label="Details (make, bed size, travel)"
          value={details}
          onChangeText={setDetails}
          onBlur={() => updateMachine(machine.id, { details: details.trim() })}
          placeholder="e.g. Haas, 850 mm travel"
        />
        <Field
          label="Hour rate ₹ (if different from the shop’s)"
          defaultValue={machine.rate ? String(machine.rate) : ''}
          placeholder={String(data.shop?.rate ?? 800)}
          keyboardType="number-pad"
          onEndEditing={(e) => updateMachine(machine.id, { rate: Number(e.nativeEvent.text) || undefined })}
        />
        <Button
          label={machine.maintenance ? 'Back in action' : 'Mark under maintenance'}
          kind="secondary"
          icon={machine.maintenance ? 'play' : 'construct-outline'}
          onPress={() => updateMachine(machine.id, { maintenance: !machine.maintenance })}
        />
        <Button
          label="Remove machine"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm(`Remove ${machine.name}?`, 'Its jobs will be removed too.', 'Remove', () => {
              removeMachine(machine.id);
              router.back();
            })
          }
        />
      </Box>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  big: { ...type.title, color: c.text },
  heading: { ...type.heading, fontSize: 19, color: c.text },
  strong: { ...type.strong, color: c.text },
  label: { ...type.label, color: c.muted },
  muted: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  queued: { padding: S.lg, gap: S.sm },
}));
