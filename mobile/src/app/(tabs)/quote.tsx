import { useState } from 'react';
import { ActivityIndicator, Image, Share, Text, TextInput, View } from 'react-native';

import { Box, Button, Field, Label, Link, Rule, Screen, Section, StatusPill } from '@/components/ui';
import { type QuoteEstimate, runTask } from '@/lib/api';
import { choosePdf, choosePhoto, type PickedDrawing, takePhoto } from '@/lib/drawing';
import type { Status } from '@/lib/model';
import { setAccessCode, usePrefs } from '@/lib/prefs';
import { updateShop, useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const DEFAULT_RATE = 800;
const inr = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (s: string) => Number(s) || 0;

const FIT: Record<QuoteEstimate['fits_shop'], { status: Status; text: string }> = {
  yes: { status: 'running', text: 'Fits your machines' },
  maybe: { status: 'soon', text: 'Might fit' },
  no: { status: 'idle', text: 'Probably not a fit' },
};

function Bullets({ title, items }: { title: string; items: string[] }) {
  const s = useStyles();
  if (!items.length) return null;
  return (
    <View style={{ gap: 6 }}>
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
      <Text style={s.body}>Enter the access code — the same one the Aiventre website asks for. You only do this once on this phone.</Text>
      <Field label="Access code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry />
      <Button label="Save code" disabled={!code.trim()} onPress={() => setAccessCode(code)} />
    </Box>
  );
}

export default function QuoteScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const { accessCode } = usePrefs();
  const shop = data.shop!;

  const [drawing, setDrawing] = useState<PickedDrawing | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [est, setEst] = useState<QuoteEstimate | null>(null);
  const [minutes, setMinutes] = useState<string[]>([]);
  const [setup, setSetup] = useState('0');
  const [rate, setRate] = useState(String(shop.rate ?? DEFAULT_RATE));
  const [material, setMaterial] = useState('0');
  const [margin, setMargin] = useState('15');

  const pick = async (how: () => Promise<PickedDrawing | null>) => {
    setError('');
    try {
      const d = await how();
      if (d) setDrawing(d);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const estimate = async () => {
    setBusy(true);
    setError('');
    try {
      const profile = {
        shop_name: shop.name,
        city: shop.city,
        work: shop.work,
        machines: data.machines.map((m) => ({ name: m.name, type: m.type, details: m.details })),
        hour_rate: num(rate),
      };
      const file = drawing && { mediaType: drawing.mediaType, data: drawing.data };
      const result = await runTask<QuoteEstimate>('quote_assist', { file, notes, quantity: Math.max(1, num(quantity)), profile });
      setEst(result);
      setMinutes(result.operations.map((o) => String(o.minutes_per_part)));
      setSetup(String(result.setup_minutes));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setEst(null);
    setDrawing(null);
    setNotes('');
    setError('');
  };

  // The owner's numbers turn the AI's minutes into a price.
  const qty = Math.max(1, num(quantity));
  const cycle = minutes.reduce((sum, m) => sum + num(m), 0);
  const machinePerPart = ((cycle + num(setup) / qty) * num(rate)) / 60;
  const costPerPart = machinePerPart + num(material);
  const pricePerPart = costPerPart * (1 + num(margin) / 100);

  const share = () => {
    if (!est) return;
    const lines = [
      `Quote from ${shop.name}`,
      `Part: ${est.part_summary}`,
      `Material: ${est.material}`,
      `Quantity: ${qty}`,
      `Price per part: ${inr(pricePerPart)}`,
      `Total: ${inr(pricePerPart * qty)}`,
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  if (!accessCode) {
    return (
      <Screen title="Quote" sub="Drawing in, machining time and price out">
        <AccessCode />
      </Screen>
    );
  }

  return (
    <Screen title="Quote" sub="Drawing in, machining time and price out">
      <Box>
        <Text style={s.heading}>The drawing</Text>
        {drawing ? (
          <View style={s.file}>
            {drawing.preview ? (
              <Image source={{ uri: drawing.preview }} style={s.thumb} />
            ) : (
              <View style={[s.thumb, s.pdf]}>
                <Text style={s.pdfText}>PDF</Text>
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
              <Button label="PDF" icon="document-outline" kind="secondary" flex small onPress={() => pick(choosePdf)} />
            </View>
          </View>
        )}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="e.g. EN8" />
          </View>
        </View>
        <Button
          label={busy ? 'Reading the drawing…' : est ? 'Estimate again' : 'Estimate time and price'}
          disabled={busy || (!drawing && !notes.trim())}
          onPress={estimate}
        />
        {busy && (
          <View style={s.row}>
            <ActivityIndicator color={c.muted} />
            <Text style={s.meta}>This can take up to a minute.</Text>
          </View>
        )}
        {!!error && <Text style={[s.body, { color: c.idle }]}>{error}</Text>}
        {!drawing && !est && !busy && <Text style={s.meta}>No drawing? Describe the part in Notes instead.</Text>}
      </Box>

      {est && (
        <>
          <Box>
            <StatusPill status={FIT[est.fits_shop].status} text={FIT[est.fits_shop].text} />
            <View style={{ gap: 2 }}>
              <Text style={s.heading}>{est.part_summary}</Text>
              <Text style={s.body}>{est.material}</Text>
            </View>
            {!!est.fit_reason && <Text style={s.body}>{est.fit_reason}</Text>}
            <Bullets title="Key features" items={est.key_features} />
            <Bullets title="Tight tolerances" items={est.critical_tolerances} />
          </Box>

          <Section title="Time and price" />
          <Text style={[s.meta, { marginTop: -S.sm }]}>Change any number — the price updates as you type.</Text>
          <Box flush>
            {est.operations.map((o, i) => (
              <View key={i}>
                {i > 0 && <Rule />}
                <View style={s.op}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.strong}>{o.operation}</Text>
                    <Text style={s.meta}>{o.machine}</Text>
                  </View>
                  <TextInput
                    accessibilityLabel={`Minutes per part for ${o.operation}`}
                    value={minutes[i]}
                    onChangeText={(v) => setMinutes(minutes.map((m, j) => (j === i ? v : m)))}
                    keyboardType="decimal-pad"
                    selectionColor={c.text}
                    style={s.minutes}
                  />
                  <Text style={s.meta}>min</Text>
                </View>
              </View>
            ))}
          </Box>

          <View style={s.grid}>
            <View style={s.cell}>
              <Field label="Setup, minutes" value={setup} onChangeText={setSetup} keyboardType="number-pad" />
            </View>
            <View style={s.cell}>
              <Field
                label="Machine ₹ / hour"
                value={rate}
                onChangeText={setRate}
                keyboardType="number-pad"
                onBlur={() => num(rate) && updateShop({ ...shop, rate: num(rate) })}
              />
            </View>
            <View style={s.cell}>
              <Field label="Material ₹ / part" value={material} onChangeText={setMaterial} keyboardType="decimal-pad" />
            </View>
            <View style={s.cell}>
              <Field label="Margin %" value={margin} onChangeText={setMargin} keyboardType="number-pad" />
            </View>
          </View>

          <Box flush>
            <View style={s.totals}>
              <View style={s.total}>
                <Text style={s.meta}>Cycle time</Text>
                <Text style={s.value}>{Math.round(cycle * 10) / 10} min</Text>
              </View>
              <View style={[s.total, s.divider]}>
                <Text style={s.meta}>Cost per part</Text>
                <Text style={s.value}>{inr(costPerPart)}</Text>
              </View>
            </View>
            <Rule />
            <View style={s.totals}>
              <View style={s.total}>
                <Text style={s.meta}>Price per part</Text>
                <Text style={s.value}>{inr(pricePerPart)}</Text>
              </View>
              <View style={[s.total, s.divider]}>
                <Text style={s.meta}>Total × {qty}</Text>
                <Text style={s.value}>{inr(pricePerPart * qty)}</Text>
              </View>
            </View>
          </Box>
          <Button label="Share quote" icon="share-outline" onPress={share} />

          <Box>
            <Bullets title="Ask the buyer before quoting" items={est.questions_for_buyer} />
            <Bullets title="Risks" items={est.risks} />
            <Bullets title="What the AI assumed" items={est.assumptions} />
            <Text style={s.meta}>AI estimates can be wrong. Check the times against your own experience before you send a price.</Text>
          </Box>
          <Button label="Start a new quote" kind="secondary" onPress={reset} />
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  bullet: { flexDirection: 'row', gap: S.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  thumb: { width: 56, height: 56, borderRadius: R.control, backgroundColor: c.raised },
  pdf: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  pdfText: { ...type.label, color: c.muted },
  op: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md },
  minutes: {
    width: 72,
    minHeight: 44,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    paddingHorizontal: 10,
    textAlign: 'right',
    color: c.text,
    fontSize: 16,
    backgroundColor: c.ground,
    ...type.num,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  cell: { width: '47%', flexGrow: 1 },
  totals: { flexDirection: 'row' },
  total: { flex: 1, padding: S.lg, gap: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: c.rule },
  value: { ...type.value, fontSize: 22, color: c.text },
}));
