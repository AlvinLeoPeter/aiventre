import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MachineRow } from '@/components/machine-card';
import { Box, Button, Chip, Field, Label, Press, Rule, Screen } from '@/components/ui';
import { machineTypesFor } from '@/lib/demo';
import { viewAll } from '@/lib/model';
import { addMachine, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

export default function Machines() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const views = viewAll(data);

  return (
    <Screen title="Machines" sub={`${views.length} machine${views.length === 1 ? '' : 's'} · tap one to update its job`}>
      <Press onPress={() => router.push('/expert')} scale={0.98} label="Machine expert">
        <Box style={s.expert}>
          <Ionicons name="construct-outline" size={22} color={c.muted} />
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>Machine expert</Text>
            <Text style={s.meta}>Speeds, feeds, tools, alarms, problems — ask anything, or send a photo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </Box>
      </Press>

      {views.length > 0 && (
        <Box flush>
          {views.map((v, i) => (
            <View key={v.machine.id}>
              {i > 0 && <Rule />}
              <MachineRow view={v} />
            </View>
          ))}
        </Box>
      )}

      {adding ? (
        <Box>
          <Text style={s.heading}>Add a machine</Text>
          <Label>Tap a type once for each machine</Label>
          <View style={s.chips}>
            {machineTypesFor(data.shop?.work ?? []).map((t) => (
              <Chip key={t} label={t} onPress={() => addMachine(t)} />
            ))}
          </View>
          <Field label="Something else?" value={custom} onChangeText={setCustom} placeholder="e.g. Honing machine" />
          <View style={s.row}>
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
        </Box>
      ) : (
        <Button label="Add a machine" icon="add" kind="secondary" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  heading: { ...type.heading, color: c.text },
  meta: { ...type.meta, color: c.muted },
  expert: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
}));
