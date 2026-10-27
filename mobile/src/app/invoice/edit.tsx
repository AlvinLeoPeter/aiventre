import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Box, Button, Chip, Field, Label, Link, Rule, Screen, Section, Segmented } from '@/components/ui';
import {
  amountInWords,
  clearInvoiceDraft,
  DEFAULT_GST,
  DEFAULT_SAC,
  dmy,
  GST_RATES,
  GST_STATES,
  invoiceTotals,
  lineAmount,
  parseDmy,
  peekInvoiceDraft,
  PAY_DAYS,
  stateCode,
  stateLabel,
  UNITS,
  unbilledJobs,
  validGstin,
} from '@/lib/invoice';
import { addDays, daysBetween, type Invoice, type InvoiceLine, jobLabel, today } from '@/lib/model';
import { inr } from '@/lib/quote';
import { addInvoice, getData, updateInvoice, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

type LineForm = { description: string; hsn: string; qty: string; unit: string; rate: string; jobId?: string };
type Buyer = Invoice['buyer'];

const toForm = (l: InvoiceLine): LineForm => ({ ...l, qty: String(l.qty), rate: l.rate ? String(l.rate) : '' });
const toLine = (l: LineForm): InvoiceLine => ({
  description: l.description.trim(),
  hsn: l.hsn.trim(),
  qty: Number(l.qty) || 0,
  unit: l.unit.trim() || 'Nos',
  rate: Number(l.rate) || 0,
  ...(l.jobId && { jobId: l.jobId }),
});
const blankLine = (): LineForm => ({ description: '', hsn: DEFAULT_SAC, qty: '1', unit: 'Nos', rate: '' });
const noBuyer: Buyer = { name: '', gstin: '', address: '', state: '', phone: '', email: '' };

/** Everyone the owner might bill: past invoices first (they have full details), then buyers and job customers. */
function knownBuyers(): Buyer[] {
  const d = getData();
  const seen = new Set<string>();
  const out: Buyer[] = [];
  const add = (b: Buyer) => {
    const k = b.name.trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(b);
    }
  };
  (d.invoices ?? []).forEach((i) => add(i.buyer));
  (d.leads ?? [])
    .filter((l) => ['won', 'quote_requested', 'replied'].includes(l.status))
    .forEach((l) => add({ ...noBuyer, name: l.company, gstin: l.gstin ?? '', state: l.state, address: l.city, phone: l.phone, email: l.email, leadId: l.id }));
  [...d.jobs].reverse().forEach((j) => j.customer && add({ ...noBuyer, name: j.customer }));
  return out;
}

/** New invoice (optionally from finished jobs, a buyer or a quote), or changes to one. */
export default function InvoiceEditScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string; jobIds?: string; leadId?: string }>();
  const data = useData();
  const shop = data.shop!;
  const existing = data.invoices?.find((i) => i.id === params.id);
  const registered = !!shop.gstin;

  // Where the invoice starts from, worked out once.
  const [start] = useState(() => {
    if (existing) return { buyer: existing.buyer, lines: existing.lines.map(toForm) };
    const draft = peekInvoiceDraft();
    const jobs = (params.jobIds ?? '').split(',').map((id) => getData().jobs.find((j) => j.id === id)).filter((j) => !!j);
    const lead = getData().leads?.find((l) => l.id === params.leadId);
    const name = draft?.buyerName || lead?.company || jobs[0]?.customer || '';
    const known = knownBuyers().find((b) => b.name.toLowerCase() === name.toLowerCase());
    const buyer: Buyer = known ?? { ...noBuyer, name };
    const lines: LineForm[] = draft?.lines?.length
      ? draft.lines.map(toForm)
      : jobs.length
        ? jobs.map((j) => ({ ...blankLine(), description: j.title, qty: String(j.qty ?? 1), jobId: j.id }))
        : [blankLine()];
    return { buyer, lines };
  });

  useEffect(clearInvoiceDraft, []);
  const [buyer, setBuyer] = useState<Buyer>(start.buyer);
  const [lines, setLines] = useState<LineForm[]>(start.lines);
  const [gstRate, setGstRate] = useState(existing?.gstRate ?? (registered ? DEFAULT_GST : 0));
  const [date, setDate] = useState(dmy(existing?.date ?? today()));
  const [payDays, setPayDays] = useState(existing ? Math.max(0, daysBetween(existing.date, existing.dueDate)) : 30);
  const [ref, setRef] = useState(existing?.ref ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [picking, setPicking] = useState(!start.buyer.name);

  const day = parseDmy(date);
  const shopCode = stateCode(shop.gstin, shop.state);
  const buyerCode = stateCode(buyer.gstin, buyer.state);
  const placeOfSupply = buyerCode || shopCode;
  const inter = !!shopCode && !!buyerCode && buyerCode !== shopCode;
  const gstinTyped = buyer.gstin.trim().toUpperCase();
  const gstinBad = gstinTyped.length > 0 && !validGstin(gstinTyped);

  const clean = lines.map(toLine);
  const filled = clean.filter((l) => l.description && l.qty > 0 && l.rate > 0);
  const rate = registered ? gstRate : 0;
  const totals = invoiceTotals({ lines: filled, gstRate: rate, inter });
  const canSave = !!buyer.name.trim() && filled.length > 0 && filled.length === clean.filter((l) => l.description || l.rate).length && !!day;

  const billed = new Set(lines.map((l) => l.jobId).filter(Boolean));
  const jobsToAdd = unbilledJobs(data).filter((j) => !billed.has(j.id));
  const buyers = knownBuyers().filter((b) => !buyer.name || b.name.toLowerCase().includes(buyer.name.trim().toLowerCase()));

  const patchBuyer = (p: Partial<Buyer>) => setBuyer((b) => ({ ...b, ...p }));
  const patchLine = (i: number, p: Partial<LineForm>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  const save = () => {
    if (!day) return;
    const fields = {
      date: day,
      dueDate: addDays(day, payDays),
      buyer: { ...buyer, name: buyer.name.trim(), gstin: gstinTyped, state: buyer.state.trim() || GST_STATES[buyerCode] || '' },
      ref: ref.trim(),
      lines: filled,
      gstRate: rate,
      placeOfSupply,
      inter,
      notes: notes.trim(),
    };
    if (existing) {
      updateInvoice(existing.id, fields);
      router.back();
    } else {
      const inv = addInvoice(fields);
      router.replace({ pathname: '/invoice/[id]', params: { id: inv.id } });
    }
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: existing ? `Edit ${existing.number}` : 'New invoice' }} />

      <Section title="Bill to" right={!picking && buyers.length > 0 ? <Link label="Pick" onPress={() => setPicking(true)} /> : undefined} />
      {picking && buyers.length > 0 && (
        <View style={s.chips}>
          {buyers.slice(0, 8).map((b) => (
            <Chip
              key={b.name}
              label={b.name}
              onPress={() => {
                setBuyer(b);
                setPicking(false);
              }}
            />
          ))}
        </View>
      )}
      <Box>
        <Field label="Company" value={buyer.name} onChangeText={(name) => patchBuyer({ name })} placeholder="Who are you billing?" />
        <Field
          label="Their GSTIN"
          value={buyer.gstin}
          onChangeText={(g) => {
            const gstin = g.toUpperCase().replace(/\s/g, '');
            const code = stateCode(gstin);
            patchBuyer({ gstin, ...(gstin.length === 15 && code && { state: GST_STATES[code] }) });
          }}
          autoCapitalize="characters"
          maxLength={15}
          placeholder="Leave empty if they aren’t registered"
          hint={gstinBad && gstinTyped.length === 15 ? 'This GSTIN doesn’t pass the check — look for a typo.' : undefined}
        />
        <Field label="Address" value={buyer.address} onChangeText={(address) => patchBuyer({ address })} placeholder="Street, area, city" />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="State" value={buyer.state} onChangeText={(state) => patchBuyer({ state })} placeholder={shop.state || 'e.g. Tamil Nadu'} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Phone (for reminders)" value={buyer.phone} onChangeText={(phone) => patchBuyer({ phone })} keyboardType="phone-pad" />
          </View>
        </View>
        {registered && (
          <Text style={s.meta}>
            {placeOfSupply ? `Place of supply ${stateLabel(placeOfSupply)} → ${inter ? 'IGST' : 'CGST + SGST'}` : 'Add the state to work out the GST.'}
          </Text>
        )}
      </Box>

      <Section title="What you’re billing" />
      {jobsToAdd.length > 0 && (
        <View style={{ gap: S.sm }}>
          <Label>Finished jobs not billed yet</Label>
          <View style={s.chips}>
            {jobsToAdd.slice(0, 6).map((j) => (
              <Chip
                key={j.id}
                label={`+ ${jobLabel(j)}${j.customer ? ` · ${j.customer}` : ''}`}
                onPress={() => {
                  const line = { ...blankLine(), description: j.title, qty: String(j.qty ?? 1), jobId: j.id };
                  setLines((ls) => (ls.length === 1 && !ls[0].description && !ls[0].rate ? [line] : [...ls, line]));
                  if (!buyer.name && j.customer) patchBuyer({ name: j.customer });
                }}
              />
            ))}
          </View>
        </View>
      )}
      {lines.map((l, i) => (
        <Box key={i}>
          <View style={s.between}>
            <Label>{`Item ${i + 1}`}</Label>
            {lines.length > 1 && <Link label="Remove" onPress={() => setLines(lines.filter((_, j) => j !== i))} />}
          </View>
          <Field label="Description" value={l.description} onChangeText={(description) => patchLine(i, { description })} placeholder="e.g. Machining of flange, Drg 1234" />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Qty" value={l.qty} onChangeText={(qty) => patchLine(i, { qty })} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Rate ₹" value={l.rate} onChangeText={(r) => patchLine(i, { rate: r })} keyboardType="decimal-pad" placeholder="per unit" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="HSN/SAC" value={l.hsn} onChangeText={(hsn) => patchLine(i, { hsn })} keyboardType="number-pad" maxLength={8} />
            </View>
          </View>
          <View style={s.chips}>
            {UNITS.map((u) => (
              <Chip key={u} label={u} selected={l.unit === u} onPress={() => patchLine(i, { unit: u })} />
            ))}
          </View>
          <Text style={[s.strong, { textAlign: 'right' }]}>{inr(lineAmount(toLine(l)))}</Text>
        </Box>
      ))}
      <Button label="Add another item" icon="add" kind="secondary" small onPress={() => setLines([...lines, blankLine()])} />
      <Text style={s.meta}>Job work on the buyer’s material is SAC 9988. If you sell parts made from your own material, use the part’s HSN code — ask your accountant if unsure.</Text>

      <Section title="GST and payment" />
      <Box>
        {registered ? (
          <>
            <Label>GST rate</Label>
            <Segmented options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))} value={String(gstRate)} onChange={(v) => setGstRate(Number(v))} />
            <Text style={s.meta}>Machining and fabrication job work is 18%.</Text>
          </>
        ) : (
          <Text style={s.body}>
            No GST is added: your GSTIN isn’t in My shop. If you’re registered, add it there to make tax invoices.
          </Text>
        )}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Invoice date" value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" hint={day ? undefined : 'Write it as DD-MM-YYYY'} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="PO / DC no." value={ref} onChangeText={setRef} placeholder="Optional" />
          </View>
        </View>
        <Label>Payment due</Label>
        <View style={s.chips}>
          {PAY_DAYS.map((n) => (
            <Chip key={n} label={n ? `${n} days` : 'On receipt'} selected={payDays === n} onPress={() => setPayDays(n)} />
          ))}
        </View>
        <Field label="Note on the invoice" value={notes} onChangeText={setNotes} placeholder="Optional, e.g. Thank you for your business" />
      </Box>

      <Box flush>
        <View style={s.total}>
          <Text style={s.body}>Taxable value</Text>
          <Text style={[s.body, type.num]}>{inr(totals.taxable)}</Text>
        </View>
        {rate > 0 &&
          (inter ? (
            <View style={s.total}>
              <Text style={s.meta}>IGST {rate}%</Text>
              <Text style={[s.meta, type.num]}>{inr(totals.igst)}</Text>
            </View>
          ) : (
            <>
              <View style={s.total}>
                <Text style={s.meta}>CGST {rate / 2}%</Text>
                <Text style={[s.meta, type.num]}>{inr(totals.cgst)}</Text>
              </View>
              <View style={s.total}>
                <Text style={s.meta}>SGST {rate / 2}%</Text>
                <Text style={[s.meta, type.num]}>{inr(totals.sgst)}</Text>
              </View>
            </>
          ))}
        {totals.roundOff !== 0 && (
          <View style={s.total}>
            <Text style={s.meta}>Round off</Text>
            <Text style={[s.meta, type.num]}>{totals.roundOff > 0 ? '+' : '−'}{inr(Math.abs(totals.roundOff))}</Text>
          </View>
        )}
        <Rule />
        <View style={s.total}>
          <Text style={s.heading}>Total</Text>
          <Text style={s.price}>{inr(totals.total)}</Text>
        </View>
        {totals.total > 0 && <Text style={[s.meta, s.words]}>{amountInWords(totals.total)}</Text>}
      </Box>

      {(!shop.address || !(shop.bank?.upi || shop.bank?.account)) && (
        <Text style={s.meta}>
          Tip: add your address and bank or UPI details in My shop → Billing details, so they print on the invoice.
        </Text>
      )}
      <Button label={existing ? 'Save changes' : 'Save invoice'} disabled={!canSave} onPress={save} />
      {!canSave && (
        <Text style={[s.meta, { color: c.muted }]}>
          {!buyer.name.trim() ? 'Add who you’re billing.' : !day ? 'Fix the invoice date.' : 'Each item needs a description, quantity and rate.'}
        </Text>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  price: { ...type.value, fontSize: 22, color: c.text },
  row: { flexDirection: 'row', gap: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: 10 },
  words: { paddingHorizontal: S.lg, paddingBottom: S.md },
}));
