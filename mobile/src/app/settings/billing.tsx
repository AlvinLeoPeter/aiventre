import { Text, View } from 'react-native';

import { SaveButton, useShopForm } from '@/components/shop-form';
import { Box, Field, Label, Screen } from '@/components/ui';
import { makeStyles, S, type } from '@/lib/theme';

const BLANK_BANK = { name: '', account: '', ifsc: '', upi: '' };

/** What gets printed on quotations and invoices: GSTIN, address and where to pay. */
export default function BillingScreen() {
  const s = useStyles();
  const f = useShopForm();
  const { form, patch } = f;
  const bank = (p: Partial<typeof BLANK_BANK>) => patch({ bank: { ...BLANK_BANK, ...form.bank, ...p } });

  return (
    <Screen padTop={false}>
      <Text style={s.meta}>Printed on your quotations and GST invoices.</Text>
      <Box style={{ gap: S.lg }} key={f.key}>
        <Field label="Your GSTIN" value={form.gstin ?? ''} onChangeText={(gstin) => patch({ gstin: gstin.toUpperCase() })} autoCapitalize="characters" maxLength={15} />
        <Field
          label="Address"
          value={form.address ?? ''}
          onChangeText={(address) => patch({ address })}
          placeholder="e.g. Plot 12, SIDCO Industrial Estate, Ambattur"
        />
        <View style={{ gap: S.sm }}>
          <Label>Where buyers pay you</Label>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Bank" value={form.bank?.name ?? ''} onChangeText={(name) => bank({ name })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="IFSC" value={form.bank?.ifsc ?? ''} onChangeText={(ifsc) => bank({ ifsc: ifsc.toUpperCase() })} autoCapitalize="characters" maxLength={11} />
            </View>
          </View>
          <Field label="Account number" value={form.bank?.account ?? ''} onChangeText={(account) => bank({ account })} keyboardType="number-pad" />
          <Field label="UPI ID" value={form.bank?.upi ?? ''} onChangeText={(upi) => bank({ upi: upi.trim() })} autoCapitalize="none" placeholder="e.g. shopname@okicici" />
        </View>
        <SaveButton f={f} />
      </Box>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: S.md },
  meta: { ...type.meta, color: c.muted },
}));
