import { type ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Box, Button, Field, Label, Link, Rule, Screen, Section, Segmented, StatusPill, tap } from '@/components/ui';
import { type PlanItem, type QuotePlan, runTask, shopForAI } from '@/lib/api';
import { choosePdf, choosePhoto, type PickedDrawing, takePhoto } from '@/lib/drawing';
import type { Status } from '@/lib/model';
import { useAIReady } from '@/lib/auth';
import { setAccessCode } from '@/lib/prefs';
import { DEFAULT_SAC, setInvoiceDraft } from '@/lib/invoice';
import { DEFAULT_RATE, type Edits, GST, inr, isOutsourced, MATERIAL_RATES, priceItem, type Rates, rateFor, shareQuotation, takeQuoteDraft } from '@/lib/quote';
import { needsFromPlan, setPendingNeeds } from '@/lib/source';
import { updateShop, useData } from '@/lib/store';
import { makeStyles, type Palette, R, S, type, useTheme } from '@/lib/theme';

const num = (s: string) => Number(s) || 0;

const FIT: Record<PlanItem['fits_shop'], { status: Status; text: string }> = {
  yes: { status: 'running', text: 'Your shop can make it' },
  maybe: { status: 'soon', text: 'Check a few things' },
  no: { status: 'idle', text: 'Not with your machines' },
};

const CAPACITY: Record<PlanItem['capacity'][number]['status'], { icon: keyof typeof Ionicons.glyphMap; tone: keyof Palette }> = {
  ok: { icon: 'checkmark-circle', tone: 'running' },
  check: { icon: 'alert-circle', tone: 'soon' },
  missing: { icon: 'close-circle', tone: 'idle' },
};

function Bullets({ title, items }: { title: string; items: string[] }) {
  const s = useStyles();
  if (!items.length) return null;
  return (
    <View style={{ gap: 4 }}>
      <Label>{title}</Label>
      {items.map((x, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.body}>•</Text>
          <Text style={[s.body, { flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

/** Asked once, the first time: the code that lets this phone use Aiventre's AI. */
function AccessCode() {
  const s = useStyles();
  const [code, setCode] = useState('');
  return (
    <Box>
      <Text style={s.heading}>Connect to Aiventre’s AI</Text>
      <Text style={s.body}>Sign in with your email, or enter the access code (the same one the website asks for).</Text>
      <Button label="Sign in with email" kind="secondary" onPress={() => router.push('/account')} />
      <Field label="Access code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry />
      <Button label="Save code" disabled={!code.trim()} onPress={() => setAccessCode(code)} />
    </Box>
  );
}

/** A section inside an item that opens on tap, so a 9-item RFQ stays readable. */
function Fold({ title, right, children, open: initial = false }: { title: string; right?: string; children: ReactNode; open?: boolean }) {
  const { c } = useTheme();
  const s = useStyles();
  const [open, setOpen] = useState(initial);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tap();
          setOpen((x) => !x);
        }}
        style={s.foldHead}>
        <Text style={[s.strong, { flex: 1 }]}>{title}</Text>
        {!!right && <Text style={s.meta}>{right}</Text>}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </Pressable>
      {open && <View style={{ gap: S.sm, paddingBottom: S.md }}>{children}</View>}
    </View>
  );
}

function ItemCard({
  item,
  edit,
  onEdit,
  rates,
}: {
  item: PlanItem;
  edit: Edits;
  onEdit: (e: Edits) => void;
  rates: Rates;
}) {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const p = priceItem(item, edit, rates, data.machines);
  const weight = item.materials.reduce((sum, m) => sum + m.weight_kg_per_unit, 0);
  // A missing machine means it isn't a clean yes, whatever the summary says.
  const fit = item.fits_shop === 'yes' && item.capacity.some((x) => x.status === 'missing') ? 'maybe' : item.fits_shop;

  return (
    <Box style={item.safety_critical && { borderColor: c.idle }}>
      <View style={s.between}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.heading}>{item.name}</Text>
          <Text style={s.meta}>{[item.drawing_no && `Drg ${item.drawing_no}`, item.size, item.material, item.finish].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <StatusPill status={FIT[fit].status} text={FIT[fit].text} />
      {!!item.fit_reason && <Text style={s.body}>{item.fit_reason}</Text>}

      {item.safety_critical && (
        <View style={[s.note, { backgroundColor: c.idlePill }]}>
          <Text style={[s.strong, { color: c.idleInk }]}>Safety-critical</Text>
          <Text style={[s.body, { color: c.idleInk }]}>{item.safety_note || 'Carries people or loads: certified material, load test and test certificate expected.'}</Text>
        </View>
      )}

      <View style={s.row}>
        <View style={{ width: 96 }}>
          <Field label="Quantity" value={String(edit.qty)} onChangeText={(v) => onEdit({ ...edit, qty: num(v) })} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
          <Text style={s.meta}>Price per unit</Text>
          <Text style={s.price}>{inr(p.unitPrice)}</Text>
          <Text style={s.meta}>
            × {p.qty} = {inr(p.total)}
          </Text>
        </View>
      </View>

      <Rule />
      <Fold title="Can your shop make it?" right={`${item.capacity.filter((x) => x.status === 'ok').length}/${item.capacity.length} ok`}>
        {item.capacity.map((x, i) => (
          <View key={i} style={s.line}>
            <Ionicons name={CAPACITY[x.status].icon} size={18} color={c[CAPACITY[x.status].tone] as string} />
            <View style={{ flex: 1 }}>
              <Text style={s.strong}>{x.need}</Text>
              <Text style={s.meta}>
                {x.machine} — {x.why}
              </Text>
            </View>
          </View>
        ))}
      </Fold>
      <Rule />
      <Fold title="Material" right={`${Math.round(weight * 10) / 10} kg per unit`}>
        {item.materials.map((m, i) => (
          <View key={i} style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.body}>{m.item}</Text>
              <Text style={s.meta}>{m.quantity_per_unit}</Text>
            </View>
            <Text style={[s.meta, type.num]}>{m.weight_kg_per_unit} kg</Text>
          </View>
        ))}
      </Fold>
      <Rule />
      <Fold title="How to make it" right={`${Math.round(p.minutes)} min per unit`}>
        <View style={s.note}>
          <Text style={s.strong}>{item.process_choice.chosen}</Text>
          <Text style={s.body}>{item.process_choice.reason}</Text>
          {item.process_choice.alternatives.map((a, i) => (
            <Text key={i} style={s.meta}>
              Why not {a.process.charAt(0).toLowerCase() + a.process.slice(1)}: {a.why_not}
            </Text>
          ))}
        </View>
        {item.operations.map((op, i) => (
          <View key={i} style={s.op}>
            <View style={s.between}>
              <Text style={[s.strong, { flex: 1 }]}>
                {i + 1}. {op.step}
              </Text>
              {isOutsourced(op) ? (
                <Text style={[s.meta, type.num]}>{inr(op.outsourced_cost_per_part)}/unit</Text>
              ) : (
                <View style={s.minutesRow}>
                  <TextInput
                    accessibilityLabel={`Minutes per unit for ${op.step}`}
                    value={String(edit.minutes[i] ?? op.minutes_per_part)}
                    onChangeText={(v) => onEdit({ ...edit, minutes: Object.assign([...edit.minutes], { [i]: num(v) }) })}
                    keyboardType="decimal-pad"
                    selectionColor={c.text}
                    style={s.minutes}
                  />
                  <Text style={s.meta}>min</Text>
                </View>
              )}
            </View>
            <Text style={s.meta}>
              {op.process} · {isOutsourced(op) ? 'outsourced' : `${op.machine} · ${inr(rateFor(op.machine, data.machines, rates.shopRate))}/hr`}
              {op.setup_minutes ? ` · setup ${op.setup_minutes} min` : ''}
            </Text>
            {op.tools.map((t, j) => (
              <Text key={j} style={s.tool}>
                {[t.tool, t.size, t.type].filter(Boolean).join(' · ')}
                {t.why ? <Text style={s.meta}>{` — ${t.why}`}</Text> : null}
              </Text>
            ))}
          </View>
        ))}
      </Fold>
      <Rule />
      <Fold title="Price breakdown" right={inr(p.cost) + ' cost'}>
        {(
          [
            ['Material', p.material],
            ['Machine time', p.machining],
            ['Outsourced', p.outsourced],
            ['Cost per unit', p.cost],
            [`Margin ${rates.margin}%`, p.unitPrice - p.cost],
          ] as const
        ).map(([k, v]) => (
          <View key={k} style={s.between}>
            <Text style={s.body}>{k}</Text>
            <Text style={[s.body, type.num]}>{inr(v)}</Text>
          </View>
        ))}
      </Fold>
      <Rule />
      <Fold title="Before you quote">
        <Bullets title="Ask the buyer" items={item.questions_for_buyer} />
        <Bullets title="Risks" items={item.risks} />
        <Bullets title="What the AI assumed" items={item.assumptions} />
      </Fold>
    </Box>
  );
}

export default function QuoteScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const aiReady = useAIReady();
  const shop = data.shop!;

  const [drawing, setDrawing] = useState<PickedDrawing | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<QuotePlan | null>(null);
  const [edits, setEdits] = useState<Edits[]>([]);

  const [shopRate, setShopRate] = useState(String(shop.rate ?? DEFAULT_RATE));
  const [margin, setMargin] = useState('15');
  const [matRates, setMatRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries({ ...MATERIAL_RATES, ...shop.materialRates }).map(([k, v]) => [k, String(v)])),
  );
  const [gst, setGst] = useState<'yes' | 'no'>('yes');

  // Opened from an open job: start a fresh quote with its details.
  useFocusEffect(
    useCallback(() => {
      const draft = takeQuoteDraft();
      if (!draft) return;
      setPlan(null);
      setDrawing(null);
      setError('');
      setNotes(draft);
    }, []),
  );
  const [customer, setCustomer] = useState('');
  const [shareError, setShareError] = useState('');

  const rates: Rates = { shopRate: num(shopRate), margin: num(margin), materials: Object.fromEntries(Object.entries(matRates).map(([k, v]) => [k, num(v)])) };

  const pick = async (how: () => Promise<PickedDrawing | null>) => {
    setError('');
    try {
      const d = await how();
      if (d) setDrawing(d);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const profile = { ...shopForAI(data), machines: data.machines.map((m) => ({ name: m.name, type: m.type, details: m.details })) };
      const file = drawing && { mediaType: drawing.mediaType, data: drawing.data };
      const result = await runTask<QuotePlan>('quote_plan', { file, notes, profile });
      setPlan(result);
      setEdits(result.items.map((it) => ({ qty: it.quantity || 1, minutes: it.operations.map((o) => o.minutes_per_part) })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Remember the owner's rates for next time.
  const saveRates = () =>
    updateShop({ ...shop, rate: num(shopRate) || shop.rate, materialRates: Object.fromEntries(Object.entries(matRates).map(([k, v]) => [k, num(v)])) });

  if (!aiReady) {
    return (
      <Screen title="Quote" sub="Drawing or RFQ in — plan and price out">
        <AccessCode />
      </Screen>
    );
  }

  const lines = plan ? plan.items.map((item, i) => ({ item, ...priceItem(item, edits[i], rates, data.machines) })) : [];
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const tax = gst === 'yes' ? subtotal * GST : 0;
  const usedMaterials = [...new Set(plan?.items.flatMap((it) => it.materials.map((m) => m.material_type)) ?? [])];

  return (
    <Screen title="Quote" sub="Drawing or RFQ in — plan and price out">
      <Box>
        <Text style={s.heading}>The drawing</Text>
        {drawing ? (
          <View style={s.file}>
            {drawing.preview ? (
              <Image source={{ uri: drawing.preview }} style={s.thumb} />
            ) : (
              <View style={[s.thumb, s.pdf]}>
                <Text style={s.label}>PDF</Text>
              </View>
            )}
            <Text style={[s.strong, { flex: 1 }]} numberOfLines={2}>
              {drawing.name}
            </Text>
            <Link label="Remove" onPress={() => setDrawing(null)} />
          </View>
        ) : (
          <View style={{ gap: S.sm }}>
            <Button label="Take a photo" icon="camera-outline" onPress={() => pick(takePhoto)} />
            <View style={s.row}>
              <Button label="Photo" icon="image-outline" kind="secondary" flex small onPress={() => pick(choosePhoto)} />
              <Button label="PDF / RFQ" icon="document-outline" kind="secondary" flex small onPress={() => pick(choosePdf)} />
            </View>
          </View>
        )}
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. need in 3 weeks, buyer supplies pipes" />
        <Button label={busy ? 'Planning…' : plan ? 'Plan again' : 'Plan and price it'} disabled={busy || (!drawing && !notes.trim())} onPress={run} />
        {busy && (
          <View style={s.row}>
            <ActivityIndicator color={c.muted} />
            <Text style={s.meta}>Reading every sheet and planning each item — up to two minutes for a big RFQ.</Text>
          </View>
        )}
        {!!error && <Text style={[s.body, { color: c.idle }]}>{error}</Text>}
        {!drawing && !plan && !busy && (
          <Text style={s.meta}>A multi-page RFQ PDF works: each item gets its own plan, and you get one quotation for all of them.</Text>
        )}
      </Box>

      {plan && (
        <>
          <Text style={s.body}>{plan.rfq_summary}</Text>

          {plan.items.map((item, i) => (
            <ItemCard key={i} item={item} edit={edits[i]} rates={rates} onEdit={(e) => setEdits(edits.map((x, j) => (j === i ? e : x)))} />
          ))}

          <Section title="Your rates" />
          <Text style={[s.meta, { marginTop: -S.sm }]}>Set once and they’re remembered. Each machine can have its own hour rate on its page.</Text>
          <Box>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Hour rate ₹" value={shopRate} onChangeText={setShopRate} onBlur={saveRates} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Margin %" value={margin} onChangeText={setMargin} keyboardType="number-pad" />
              </View>
            </View>
            {usedMaterials.length > 0 && <Label>Material price ₹ per kg</Label>}
            <View style={s.grid}>
              {usedMaterials.map((m) => (
                <View key={m} style={s.cell}>
                  <Field label={m} value={matRates[m] ?? ''} onChangeText={(v) => setMatRates({ ...matRates, [m]: v })} onBlur={saveRates} keyboardType="decimal-pad" />
                </View>
              ))}
            </View>
            <Label>GST</Label>
            <Segmented
              options={[
                { value: 'yes', label: 'Add 18% GST' },
                { value: 'no', label: 'GST extra' },
              ]}
              value={gst}
              onChange={setGst}
            />
          </Box>

          <Box flush>
            {lines.map((l, i) => (
              <View key={i}>
                {i > 0 && <Rule />}
                <View style={[s.between, s.totalRow]}>
                  <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>
                    {l.item.name} × {l.qty}
                  </Text>
                  <Text style={[s.body, type.num]}>{inr(l.total)}</Text>
                </View>
              </View>
            ))}
            <Rule />
            {gst === 'yes' && (
              <View style={[s.between, s.totalRow]}>
                <Text style={s.meta}>GST 18%</Text>
                <Text style={[s.meta, type.num]}>{inr(tax)}</Text>
              </View>
            )}
            <View style={[s.between, s.totalRow]}>
              <Text style={s.heading}>Total</Text>
              <Text style={s.price}>{inr(subtotal + tax)}</Text>
            </View>
          </Box>

          <Field label="Quotation for (company)" value={customer} onChangeText={setCustomer} placeholder="e.g. Tata AutoComp, Chennai" />
          <Button
            label="Send quotation (PDF)"
            icon="document-text-outline"
            onPress={() => {
              setShareError('');
              shareQuotation(data, lines, { customer: customer.trim(), gst: gst === 'yes' }).catch((e) => setShareError((e as Error).message));
            }}
          />
          {!!shareError && <Text style={[s.meta, { color: c.idle }]}>{shareError}</Text>}
          <Text style={s.meta}>AI plans and times can be wrong. Check them against your own experience before you send a price.</Text>
          <View style={s.row}>
            <Button
              label="Where to buy"
              icon="cart-outline"
              kind="secondary"
              small
              flex
              onPress={() => {
                setPendingNeeds(needsFromPlan(lines));
                router.push('/buy');
              }}
            />
            <Button
              label="Order won: bill it"
              icon="receipt-outline"
              kind="secondary"
              small
              flex
              onPress={() => {
                setInvoiceDraft({
                  buyerName: customer.trim(),
                  lines: lines.map((l) => ({
                    description: `${l.item.name}${l.item.drawing_no ? `, Drg ${l.item.drawing_no}` : ''}`,
                    hsn: DEFAULT_SAC,
                    qty: l.qty,
                    unit: 'Nos',
                    rate: l.unitPrice,
                  })),
                });
                router.push('/invoice/edit');
              }}
            />
          </View>
          <Button
            label="Start a new quote"
            kind="secondary"
            onPress={() => {
              setPlan(null);
              setDrawing(null);
              setNotes('');
              setCustomer('');
            }}
          />
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  label: { ...type.label, color: c.muted },
  price: { ...type.value, fontSize: 22, color: c.text },
  row: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  line: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' },
  bullet: { flexDirection: 'row', gap: S.sm },
  note: { backgroundColor: c.raised, borderRadius: R.control, padding: S.md, gap: 4 },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44 },
  op: { gap: 3, paddingVertical: S.xs },
  tool: { ...type.meta, color: c.text, paddingLeft: S.md },
  minutesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  minutes: {
    width: 64,
    minHeight: 40,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    paddingHorizontal: 8,
    textAlign: 'right',
    color: c.text,
    fontSize: 16,
    backgroundColor: c.ground,
    ...type.num,
  },
  file: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  thumb: { width: 56, height: 56, borderRadius: R.control, backgroundColor: c.raised },
  pdf: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  cell: { width: '30%', flexGrow: 1 },
  totalRow: { paddingHorizontal: S.lg, paddingVertical: 12 },
}));
