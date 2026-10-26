import { useState } from 'react';
import { Text, View } from 'react-native';

import { locateShop } from '@/lib/location';
import type { Shop } from '@/lib/model';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

import { Button, Chip, Field, Label } from './ui';

export const REACH = [
  { km: 25, label: '25 km' },
  { km: 50, label: '50 km' },
  { km: 100, label: '100 km' },
  { km: 300, label: '300 km' },
  { km: 0, label: 'All India' },
];
export const DEFAULT_REACH = 100;

type PlaceFields = Pick<Shop, 'city' | 'area' | 'state' | 'pincode' | 'lat' | 'lng' | 'reach'>;

/** Where the shop is and how far it ships — the two things that decide which buyers make sense. */
export function ShopPlace({ value, onChange }: { value: PlaceFields; onChange: (patch: Partial<Shop>) => void }) {
  const { c } = useTheme();
  const s = useStyles();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const locate = async () => {
    setBusy(true);
    setError('');
    try {
      const { accuracy, ...place } = await locateShop();
      // Keep anything the owner already typed if the map has nothing better.
      onChange(Object.fromEntries(Object.entries(place).filter(([, v]) => v !== '' && v !== undefined)));
      setNote(accuracy ? `Pinned within about ${Math.max(10, Math.round(accuracy / 10) * 10)} m. Fix anything below that’s off.` : 'Pinned. Fix anything below that’s off.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reach = value.reach ?? DEFAULT_REACH;

  return (
    <View style={{ gap: S.md }}>
      <Label>Where is your shop?</Label>
      <Button
        label={busy ? 'Finding you…' : value.lat ? 'Update from my location' : 'Use my current location'}
        icon="locate-outline"
        kind="secondary"
        disabled={busy}
        onPress={locate}
      />
      {!!note && <Text style={s.meta}>{note}</Text>}
      {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
      <Field label="Area or industrial estate" value={value.area ?? ''} onChangeText={(area) => onChange({ area })} placeholder="e.g. Chakan MIDC Phase 2" />
      <View style={s.row}>
        <View style={{ flex: 3 }}>
          <Field label="City" value={value.city} onChangeText={(city) => onChange({ city })} placeholder="e.g. Pune" />
        </View>
        <View style={{ flex: 2 }}>
          <Field label="PIN code" value={value.pincode ?? ''} onChangeText={(pincode) => onChange({ pincode })} keyboardType="number-pad" maxLength={6} placeholder="410501" />
        </View>
      </View>
      <Field label="State" value={value.state ?? ''} onChangeText={(state) => onChange({ state })} placeholder="e.g. Maharashtra" />

      <View style={{ gap: S.sm, marginTop: S.xs }}>
        <Label>How far will you send parts?</Label>
        <View style={s.chips}>
          {REACH.map((r) => (
            <Chip key={r.km} label={r.label} selected={reach === r.km} onPress={() => onChange({ reach: r.km })} />
          ))}
        </View>
        <Text style={s.meta}>The AI looks for buyers inside this distance first.</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
}));
