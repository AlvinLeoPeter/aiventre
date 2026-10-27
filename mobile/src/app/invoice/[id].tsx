import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { openUrl, whatsappNumber } from '@/components/lead-card';
import { Box, Button, Chip, Field, Label, Link, Rule, Screen, Section, StatusPill, success } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { balance, dmy, invoiceState, invoiceTitle, invoiceTotals, lineAmount, received, reminderText, shareInvoice, stateLabel } from '@/lib/invoice';
import { today } from '@/lib/model';
import { inr } from '@/lib/quote';
import { addPayment, removePayment, updateInvoice, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

const HOW = ['UPI', 'NEFT / RTGS', 'Cheque', 'Cash'];

export default function InvoiceScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const shop = data.shop!;
  const inv = data.invoices?.find((i) => i.id === id);

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [how, setHow] = useState('UPI');
  const [error, setError] = useState('');

  if (!inv) {
    return (
      <Screen padTop={false}>
        <Text style={s.body}>This invoice isn’t on this phone.</Text>
      </Screen>
    );
  }

  const t = invoiceTotals(inv);
  const state = invoiceState(inv);
  const left = balance(inv);
  const wa = whatsappNumber(inv.buyer.phone);

  const remind = () => {
    const text = reminderText(inv, shop);
    if (wa) openUrl(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`);
    else Share.share({ message: text }).catch(() => {});
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: inv.number }} />

      <Box>
        <View style={{ gap: 2 }}>
          <Text style={s.title}>{inv.buyer.name}</Text>
          <Text style={s.meta}>
            {invoiceTitle(inv, shop)} {inv.number} · {dmy(inv.date)}
          </Text>
        </View>
        <StatusPill status={state.tone} text={state.label} />
        <View style={s.between}>
          <Text style={s.body}>Total</Text>
          <Text style={s.price}>{inr(t.total)}</Text>
        </View>
        {!inv.cancelled && received(inv) > 0 && (
          <>
            <View style={s.between}>
              <Text style={s.meta}>Received</Text>
              <Text style={[s.meta, type.num]}>{inr(received(inv))}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.strong}>Still to come</Text>
              <Text style={[s.strong, type.num]}>{inr(left)}</Text>
            </View>
          </>
        )}
        {!inv.cancelled && left >= 1 && <Text style={s.meta}>Due {dmy(inv.dueDate)}</Text>}
      </Box>

      {!inv.cancelled && (
        <>
          <Button
            label="Send invoice (PDF)"
            icon="document-text-outline"
            onPress={() => {
              setError('');
              shareInvoice(inv, shop).catch((e) => setError((e as Error).message));
            }}
          />
          {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
          {left >= 1 && (
            <View style={s.row}>
              <Button label="Payment received" icon="cash-outline" kind="secondary" flex small onPress={() => (setPaying(true), setAmount(String(left)))} />
              <Button label={wa ? 'Remind on WhatsApp' : 'Send a reminder'} icon={wa ? 'logo-whatsapp' : 'chatbubble-outline'} kind="secondary" flex small onPress={remind} />
            </View>
          )}
        </>
      )}

      {paying && (
        <Box>
          <Field label="Amount received ₹" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
          <Label>How</Label>
          <View style={s.chips}>
            {HOW.map((h) => (
              <Chip key={h} label={h} selected={how === h} onPress={() => setHow(h)} />
            ))}
          </View>
          <View style={s.row}>
            <Button label="Cancel" kind="quiet" flex onPress={() => setPaying(false)} />
            <Button
              label="Save"
              flex
              disabled={!(Number(amount) > 0)}
              onPress={() => {
                addPayment(inv.id, { at: today(), amount: Number(amount), note: how });
                success();
                setPaying(false);
              }}
            />
          </View>
        </Box>
      )}

      <Section title="Items" />
      <Box flush>
        {inv.lines.map((l, i) => (
          <View key={i}>
            {i > 0 && <Rule />}
            <View style={s.line}>
              <View style={{ flex: 1 }}>
                <Text style={s.body}>{l.description}</Text>
                <Text style={s.meta}>
                  {l.qty} {l.unit} × {inr(l.rate)} · HSN/SAC {l.hsn || '—'}
                </Text>
              </View>
              <Text style={[s.body, type.num]}>{inr(lineAmount(l))}</Text>
            </View>
          </View>
        ))}
        <Rule />
        <View style={s.line}>
          <Text style={[s.meta, { flex: 1 }]}>Taxable value</Text>
          <Text style={[s.meta, type.num]}>{inr(t.taxable)}</Text>
        </View>
        {inv.gstRate > 0 && (
          <View style={s.line}>
            <Text style={[s.meta, { flex: 1 }]}>{inv.inter ? `IGST ${inv.gstRate}%` : `CGST + SGST ${inv.gstRate / 2}% each`}</Text>
            <Text style={[s.meta, type.num]}>{inr(t.tax)}</Text>
          </View>
        )}
      </Box>
      <Text style={s.meta}>
        {[inv.buyer.gstin && `GSTIN ${inv.buyer.gstin}`, stateLabel(inv.placeOfSupply) && `Place of supply ${stateLabel(inv.placeOfSupply)}`, inv.ref && `Ref ${inv.ref}`]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {inv.payments.length > 0 && (
        <>
          <Section title="Payments" />
          <Box flush>
            {inv.payments.map((p, i) => (
              <View key={p.id}>
                {i > 0 && <Rule />}
                <View style={s.line}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.body}>{inr(p.amount)}</Text>
                    <Text style={s.meta}>
                      {dmy(p.at)} · {p.note}
                    </Text>
                  </View>
                  <Link label="Remove" onPress={() => confirm('Remove this payment?', `${inr(p.amount)} on ${dmy(p.at)}`, 'Remove', () => removePayment(inv.id, p.id))} />
                </View>
              </View>
            ))}
          </Box>
        </>
      )}

      {inv.cancelled ? (
        <Button label="Undo cancel" kind="secondary" onPress={() => updateInvoice(inv.id, { cancelled: false })} />
      ) : (
        <>
          <Button label="Edit invoice" kind="secondary" icon="create-outline" onPress={() => router.push({ pathname: '/invoice/edit', params: { id: inv.id } })} />
          <Button
            label="Cancel invoice"
            kind="danger"
            onPress={() =>
              confirm(
                'Cancel this invoice?',
                `${inv.number} stays in your list marked cancelled, and its number isn’t reused — that’s how GST expects mistakes to be handled. If you already filed it, tell your accountant.`,
                'Cancel invoice',
                () => updateInvoice(inv.id, { cancelled: true }),
              )
            }
          />
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  title: { ...type.title, fontSize: 22, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  price: { ...type.value, fontSize: 24, color: c.text },
  row: { flexDirection: 'row', gap: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 10 },
}));
