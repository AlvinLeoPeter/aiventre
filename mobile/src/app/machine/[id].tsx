import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { headline } from '@/components/machine-card';
import { Button, Card, Field, Progress, Screen, SectionTitle, STATUS_COLOR, StatusPill } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { jobLabel, niceDay, queueSchedule, relativeDay, today, viewMachine } from '@/lib/model';
import { extendJob, finishJob, removeJob, removeMachine, startJob, updateMachine, useData } from '@/lib/store';
import { C, S, T } from '@/lib/theme';

export default function MachineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const machine = data.machines.find((m) => m.id === id);
  const [name, setName] = useState(machine?.name ?? '');
  const [details, setDetails] = useState(machine?.details ?? '');

  if (!machine) {
    return (
      <Screen padTop={false}>
        <Text style={T.dim}>This machine was removed.</Text>
      </Screen>
    );
  }

  const view = viewMachine(data, machine);
  const { current, queue, status } = view;
  const color = STATUS_COLOR[status];
  const now = today();

  const schedule = queueSchedule(view, now);

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: machine.name }} />

      <View style={{ gap: S.sm }}>
        <StatusPill status={status} />
        <Text style={[T.hero, { color }]}>{headline(view)}</Text>
        {!!machine.details && <Text style={T.dim}>{machine.details}</Text>}
      </View>

      {current ? (
        <Card style={{ gap: S.md, borderColor: color + '55' }}>
          <SectionTitle right={<Text style={styles.link} onPress={() => router.push({ pathname: '/job', params: { id: current.id } })}>Edit</Text>}>
            {status === 'check' ? 'Is it done?' : 'Running now'}
          </SectionTitle>
          <View style={{ gap: 2 }}>
            <Text style={T.title}>{jobLabel(current)}</Text>
            {!!current.customer && <Text style={T.dim}>{current.customer}</Text>}
          </View>
          <Progress value={view.progress} color={color} />
          <Text style={T.small}>
            Started {relativeDay(current.start!)} · {current.due! < now ? 'was due' : 'finishes'} {niceDay(current.due!)}
          </Text>
          <Button label="Job done" icon="checkmark" kind="good" onPress={() => finishJob(current.id)} />
          <View style={styles.row}>
            <Button label="+1 day" kind="secondary" flex onPress={() => extendJob(current.id, 1)} />
            <Button label="+2 days" kind="secondary" flex onPress={() => extendJob(current.id, 2)} />
            <Button label="+1 week" kind="secondary" flex onPress={() => extendJob(current.id, 7)} />
          </View>
        </Card>
      ) : (
        <Card style={{ gap: S.md, borderColor: status === 'idle' ? C.idle + '55' : C.border }}>
          <Text style={T.title}>{status === 'maintenance' ? 'Under maintenance' : 'Nothing running'}</Text>
          <Text style={T.dim}>
            {status === 'maintenance'
              ? 'Switch maintenance off below when it is back in action.'
              : 'Add the next job, or let the AI find one (coming next).'}
          </Text>
        </Card>
      )}

      <SectionTitle>{`Up next${queue.length ? ` · ${queue.length}` : ''}`}</SectionTitle>
      {schedule.map(({ job, start, end }) => (
        <Card key={job.id} style={{ gap: S.sm }}>
          <Text style={[T.body, { fontWeight: '800' }]}>{jobLabel(job)}</Text>
          {!!job.customer && <Text style={T.small}>{job.customer}</Text>}
          <Text style={T.small}>
            {job.days} day{job.days === 1 ? '' : 's'} · about {niceDay(start)} → {niceDay(end)}
          </Text>
          <View style={styles.row}>
            {!current && <Button label="Start now" kind="primary" flex onPress={() => startJob(job.id)} />}
            <Button label="Edit" kind="secondary" flex onPress={() => router.push({ pathname: '/job', params: { id: job.id } })} />
            <Button
              label="Remove"
              kind="danger"
              flex
              onPress={() => confirm('Remove this job?', jobLabel(job), 'Remove', () => removeJob(job.id))}
            />
          </View>
        </Card>
      ))}
      <Button
        label="Add a job to this machine"
        icon="add"
        kind={current ? 'secondary' : 'primary'}
        onPress={() => router.push({ pathname: '/job', params: { machineId: machine.id } })}
      />

      <SectionTitle>Machine</SectionTitle>
      <Card style={{ gap: S.lg }}>
        <Field label="Name" value={name} onChangeText={setName} onBlur={() => name.trim() && updateMachine(machine.id, { name: name.trim() })} />
        <Field
          label="Details (make, bed size, travel)"
          value={details}
          onChangeText={setDetails}
          onBlur={() => updateMachine(machine.id, { details: details.trim() })}
          placeholder="e.g. Haas, 850 mm travel"
        />
        <Button
          label={machine.maintenance ? 'Back in action' : 'Mark under maintenance'}
          kind="secondary"
          icon={machine.maintenance ? 'play' : 'construct'}
          onPress={() => updateMachine(machine.id, { maintenance: !machine.maintenance })}
        />
        <Button
          label="Remove machine"
          kind="danger"
          icon="trash"
          onPress={() =>
            confirm(`Remove ${machine.name}?`, 'Its jobs will be removed too.', 'Remove', () => {
              removeMachine(machine.id);
              router.back();
            })
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.sm },
  link: { color: C.brand, fontWeight: '800', fontSize: 14 },
});
