import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MachineCard } from '@/components/machine-card';
import { Button, Card, Chip, Field, Screen, SectionTitle } from '@/components/ui';
import { MACHINE_TYPES } from '@/lib/demo';
import { viewAll } from '@/lib/model';
import { addMachine, useData } from '@/lib/store';
import { S, T } from '@/lib/theme';

export default function Machines() {
  const data = useData();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const views = viewAll(data);

  return (
    <Screen>
      <Text style={T.hero}>Machines</Text>
      <Text style={T.dim}>
        {views.length} machine{views.length === 1 ? '' : 's'} · tap one to update its job
      </Text>

      {views.map((v) => (
        <MachineCard key={v.machine.id} view={v} />
      ))}

      {adding ? (
        <Card style={{ gap: S.md }}>
          <SectionTitle>Tap to add a machine</SectionTitle>
          <View style={styles.chips}>
            {MACHINE_TYPES.map((t) => (
              <Chip key={t} label={t} onPress={() => addMachine(t)} />
            ))}
          </View>
          <Field label="Something else?" value={custom} onChangeText={setCustom} placeholder="e.g. Wire EDM" />
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button
              label="Add"
              flex
              disabled={!custom.trim()}
              onPress={() => {
                addMachine(custom.trim());
                setCustom('');
              }}
            />
            <Button label="Done" kind="secondary" flex onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : (
        <Button label="Add a machine" icon="add" kind="secondary" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
