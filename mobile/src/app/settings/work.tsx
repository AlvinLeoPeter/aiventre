import { Text, View } from 'react-native';

import { SaveButton, useShopForm } from '@/components/shop-form';
import { Box, Chip, Label, ListField, Screen } from '@/components/ui';
import { WORK_TYPES } from '@/lib/demo';
import { makeStyles, S, type } from '@/lib/theme';

const LISTS = [
  ['capabilities', 'What you can do', 'e.g. 3-axis milling, drilling, tapping'],
  ['materials', 'Materials', 'e.g. MS, EN8, aluminium, SS304'],
  ['industries', 'Industries you serve', 'e.g. tractor parts, pumps, valves'],
  ['certifications', 'Certifications', 'e.g. ISO 9001:2015'],
] as const;

/** The kind of work the shop takes: what the AI searches for and buyers read. */
export default function WorkScreen() {
  const s = useStyles();
  const f = useShopForm();
  const { form, patch } = f;
  const toggle = (w: string) => patch({ work: form.work.includes(w) ? form.work.filter((x) => x !== w) : [...form.work, w] });

  return (
    <Screen padTop={false}>
      <Text style={s.meta}>The AI uses this to find buyers who need your kind of work.</Text>
      <Box style={{ gap: S.lg }} key={f.key}>
        <View style={{ gap: S.sm }}>
          <Label>What work do you do?</Label>
          <View style={s.chips}>
            {WORK_TYPES.map((w) => (
              <Chip key={w} label={w} selected={form.work.includes(w)} onPress={() => toggle(w)} />
            ))}
          </View>
        </View>
        {LISTS.map(([k, label, placeholder]) => (
          <ListField key={k} label={label} placeholder={placeholder} value={form[k]} onChange={(v) => patch({ [k]: v })} />
        ))}
        <SaveButton f={f} />
      </Box>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  meta: { ...type.meta, color: c.muted },
}));
