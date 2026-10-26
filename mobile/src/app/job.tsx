import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Box, Button, Chip, Field, Label, Press, Screen } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { addDays, jobLabel, niceDay, today, viewMachine } from '@/lib/model';
import { addJob, removeJob, updateJob, useData } from '@/lib/store';
import { makeStyles, R, S, type } from '@/lib/theme';

const QUICK_DAYS = [1, 2, 3, 5, 7, 14];
const daysLabel = (n: number) => (n === 7 ? '1 week' : n === 14 ? '2 weeks' : `${n} day${n === 1 ? '' : 's'}`);

export default function JobScreen() {
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string; machineId?: string }>();
  const data = useData();
  const existing = data.jobs.find((j) => j.id === params.id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [customer, setCustomer] = useState(existing?.customer ?? '');
  const [qty, setQty] = useState(existing?.qty ? String(existing.qty) : '');
  const [days, setDays] = useState(existing?.days ?? 2);
  const [machineId, setMachineId] = useState(existing?.machineId ?? params.machineId ?? data.machines[0]?.id ?? '');

  const machine = data.machines.find((m) => m.id === machineId);

  if (data.machines.length === 0) {
    return (
      <Screen padTop={false}>
        <Text style={s.muted}>Add a machine first, in the Machines tab.</Text>
      </Screen>
    );
  }

  // When will it run? A new job on a busy machine waits for everything before it.
  const now = today();
  let when = '';
  if (existing?.status === 'running' && existing.start) {
    when = `Finishes ${niceDay(addDays(existing.start, days))}`;
  } else if (!existing && machine) {
    const v = viewMachine(data, machine, now);
    const start = v.current ? v.freeFrom : now;
    when = v.current
      ? `Queued after current work · about ${niceDay(start)} → ${niceDay(addDays(start, days))}`
      : `Starts today · finishes ${niceDay(addDays(now, days))}`;
  }

  const save = () => {
    const fields = { title: title.trim(), customer: customer.trim(), qty: Number(qty) || null, days };
    if (existing) updateJob(existing.id, fields);
    else addJob({ ...fields, machineId });
    router.back();
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: existing ? 'Edit job' : 'New job' }} />

      <Field label="What’s the job?" value={title} onChangeText={setTitle} placeholder="e.g. Gearbox bracket" autoFocus={!existing} />
      <View style={s.row}>
        <View style={{ flex: 2 }}>
          <Field label="Customer" value={customer} onChangeText={setCustomer} placeholder="Who is it for?" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Quantity" value={qty} onChangeText={setQty} placeholder="500" keyboardType="number-pad" />
        </View>
      </View>

      {!existing && (
        <View style={{ gap: S.sm }}>
          <Label>On which machine?</Label>
          <View style={s.chips}>
            {data.machines.map((m) => (
              <Chip key={m.id} label={m.name} selected={m.id === machineId} onPress={() => setMachineId(m.id)} />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: S.sm }}>
        <Label>How long will it take?</Label>
        <View style={s.chips}>
          {QUICK_DAYS.map((n) => (
            <Chip key={n} label={daysLabel(n)} selected={days === n} onPress={() => setDays(n)} />
          ))}
        </View>
        <View style={s.stepper}>
          <Press label="One day less" onPress={() => setDays((d) => Math.max(1, d - 1))} style={s.stepButton}>
            <Text style={s.stepText}>−</Text>
          </Press>
          <Text style={s.stepValue}>{daysLabel(days)}</Text>
          <Press label="One day more" onPress={() => setDays((d) => Math.min(90, d + 1))} style={s.stepButton}>
            <Text style={s.stepText}>+</Text>
          </Press>
        </View>
      </View>

      {!!when && (
        <Box style={{ gap: 4 }}>
          <Text style={s.strong}>{when}</Text>
          <Text style={s.meta}>You’ll get one reminder on the finish day asking if it’s done.</Text>
        </Box>
      )}

      <Button label={existing ? 'Save' : 'Add job'} disabled={!title.trim() || !machineId} onPress={save} />
      {existing && (
        <Button
          label="Delete job"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm('Delete this job?', jobLabel(existing), 'Delete', () => {
              removeJob(existing.id);
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  muted: { ...type.body, color: c.muted },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    padding: S.xs,
  },
  stepButton: { width: 52, height: 44, borderRadius: R.control - 3, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: c.text, fontSize: 22, fontWeight: '500' },
  stepValue: { color: c.text, fontSize: 17, fontWeight: '600', ...type.num },
}));
