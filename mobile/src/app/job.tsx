import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button, Card, Chip, Field, Screen, tap } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { addDays, jobLabel, niceDay, today, viewMachine } from '@/lib/model';
import { addJob, removeJob, updateJob, useData } from '@/lib/store';
import { C, R, S, T } from '@/lib/theme';

const QUICK_DAYS = [1, 2, 3, 5, 7, 14];
const daysLabel = (n: number) => (n === 7 ? '1 week' : n === 14 ? '2 weeks' : `${n} day${n === 1 ? '' : 's'}`);

export default function JobScreen() {
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
        <Text style={T.dim}>Add a machine first, in the Machines tab.</Text>
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
      <View style={styles.row}>
        <View style={{ flex: 2 }}>
          <Field label="Customer" value={customer} onChangeText={setCustomer} placeholder="Who is it for?" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Quantity" value={qty} onChangeText={setQty} placeholder="500" keyboardType="number-pad" />
        </View>
      </View>

      {!existing && (
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>On which machine?</Text>
          <View style={styles.chips}>
            {data.machines.map((m) => (
              <Chip key={m.id} label={m.name} selected={m.id === machineId} onPress={() => setMachineId(m.id)} />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: S.sm }}>
        <Text style={T.label}>How long will it take?</Text>
        <View style={styles.chips}>
          {QUICK_DAYS.map((n) => (
            <Chip key={n} label={daysLabel(n)} selected={days === n} onPress={() => setDays(n)} />
          ))}
        </View>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="One day less"
            onPress={() => {
              tap();
              setDays((d) => Math.max(1, d - 1));
            }}
            style={styles.stepButton}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.stepValue}>{daysLabel(days)}</Text>
          <Pressable
            accessibilityLabel="One day more"
            onPress={() => {
              tap();
              setDays((d) => Math.min(90, d + 1));
            }}
            style={styles.stepButton}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      {!!when && (
        <Card style={{ borderColor: C.brand + '55' }}>
          <Text style={[T.body, { fontWeight: '700' }]}>{when}</Text>
          <Text style={[T.small, { marginTop: 4 }]}>You’ll get one reminder on the finish day asking if it’s done.</Text>
        </Card>
      )}

      <Button label={existing ? 'Save' : 'Add job'} disabled={!title.trim() || !machineId} onPress={save} />
      {existing && (
        <Button
          label="Delete job"
          kind="danger"
          icon="trash"
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: S.xs,
  },
  stepButton: { width: 48, height: 44, borderRadius: R.sm, backgroundColor: C.cardRaised, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: C.text, fontSize: 22, fontWeight: '700' },
  stepValue: { color: C.text, fontSize: 17, fontWeight: '800' },
});
