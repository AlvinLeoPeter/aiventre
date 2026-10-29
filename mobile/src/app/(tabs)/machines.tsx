import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MachineCard } from '@/components/machine-card';
import { Box, Button, Chip, Field, Label, Press, Screen } from '@/components/ui';
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
      {views.map((v) => (
        <MachineCard key={v.machine.id} view={v} />
      ))}
      {views.length > 0 && (
        <View style={s.legend}>
          <View style={[s.key, { backgroundColor: c.booked }]} />
          <Text style={s.meta}>Booked</Text>
          <View style={[s.key, { backgroundColor: c.free, marginLeft: S.md }]} />
          <Text style={s.meta}>Free</Text>
          <View style={[s.key, { backgroundColor: c.control, marginLeft: S.md }]} />
          <Text style={s.meta}>Off</Text>
        </View>
      )}

      <Press onPress={() => router.push('/expert')} scale={0.98} label="Machine expert" style={s.expert}>
        <View style={s.expertIcon}>
          <Ionicons name="construct" size={22} color="#15171c" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.expertTitle}>Machine expert</Text>
          <Text style={s.expertSub}>Tool chipping? Feeds and speeds? Ask, or send a photo.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.onPrimary} />
      </Press>

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
  expert: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.primary, borderRadius: 24, padding: S.lg },
  expertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffc93c', alignItems: 'center', justifyContent: 'center' },
  expertTitle: { fontSize: 16, fontWeight: '800', color: c.onPrimary },
  expertSub: { ...type.meta, color: c.onPrimary, opacity: 0.75 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -S.xs },
  key: { width: 12, height: 12, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
}));
