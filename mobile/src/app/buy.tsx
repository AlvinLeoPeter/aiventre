import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { openUrl, telUrl, whatsappNumber } from '@/components/lead-card';
import { Box, Button, Field, Link, Rule, Screen, Section, Segmented, success } from '@/components/ui';
import { useAIReady } from '@/lib/auth';
import { getKept, keep } from '@/lib/keep';
import { confirm } from '@/lib/confirm';
import { type Supplier, today } from '@/lib/model';
import { inr } from '@/lib/quote';
import { KIND_LABEL, type Need, type Offer, priceAsk, requestSourcing, type SourcingResult, clearPendingNeeds, peekPendingNeeds } from '@/lib/source';
import { getData, removeSupplier, saveSupplier, updateShop, useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

const GST_LABEL: Record<Offer['gst'], string> = { included: 'incl. GST', extra: '+ GST', not_stated: 'GST not stated' };

function priceLine(o: Offer) {
  if (!o.price) return 'Price not listed — ask them';
  return `${inr(o.price)} ${o.unit} · ${GST_LABEL[o.gst]}`;
}

/** What the server could confirm about an offer's page. */
function Checked({ o }: { o: Offer }) {
  const { c } = useTheme();
  const s = useStyles();
  const [icon, tone, text] = o.check.priceSeen
    ? (['checkmark-circle', c.running, 'Price checked on their page'] as const)
    : o.check.page === 'ok'
      ? (['alert-circle', c.soon, o.price ? 'Page opens, but the price wasn’t found on it' : 'Page opens'] as const)
      : o.check.page === 'blocked'
        ? (['alert-circle', c.soon, 'Their site blocks checks — confirm the price with them'] as const)
        : (['close-circle', c.idle, 'Couldn’t open the page'] as const);
  return (
    <View style={s.check}>
      <Ionicons name={icon} size={16} color={tone} />
      <Text style={[s.meta, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

function OfferCard({ o, need }: { o: Offer; need: Need }) {
  const s = useStyles();
  const data = useData();
  const wa = whatsappNumber(o.phone);
  const saved = (data.suppliers ?? []).some((x) => x.name.toLowerCase() === o.supplier.toLowerCase());
  // A checked price per kg can go straight into the quote's material rates.
  const perKg = need.kind === 'material' && need.materialType && o.price > 0 && /kg/i.test(o.unit);
  const current = data.shop?.materialRates?.[need.materialType ?? ''];

  return (
    <Box>
      <View style={{ gap: 2 }}>
        <Text style={s.strong}>{o.product}</Text>
        <Text style={s.meta}>{[o.supplier, KIND_LABEL[o.kind], o.city, o.distance_km ? `~${o.distance_km} km` : ''].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={o.price ? s.price : s.body}>{priceLine(o)}</Text>
      <Checked o={o} />
      {!!o.min_order && <Text style={s.meta}>Minimum order: {o.min_order}</Text>}
      {!!o.note && <Text style={s.meta}>{o.note}</Text>}
      <View style={s.row}>
        {!!o.url && <Button label="Open" icon="open-outline" kind="secondary" small flex onPress={() => openUrl(o.url)} />}
        {wa ? (
          <Button label="Ask price" icon="logo-whatsapp" kind="secondary" small flex onPress={() => openUrl(`https://wa.me/${wa}?text=${encodeURIComponent(priceAsk(data, o, need))}`)} />
        ) : (
          !!o.phone && <Button label="Call" icon="call-outline" kind="secondary" small flex onPress={() => openUrl(telUrl(o.phone))} />
        )}
        <Button
          label={saved ? 'Saved' : 'Save'}
          icon={saved ? 'checkmark' : 'bookmark-outline'}
          kind="secondary"
          small
          flex
          disabled={saved}
          onPress={() => {
            saveSupplier({
              name: o.supplier,
              city: o.city,
              phone: o.phone,
              email: o.email,
              website: o.website,
              sells: [need.item],
              ...(o.price > 0 && { lastPrice: { item: o.product, price: o.price, unit: o.unit, url: o.url, at: today() } }),
            });
            success();
          }}
        />
      </View>
      {perKg && current !== o.price && (
        <Link
          label={`Use ${inr(o.price)}/kg for ${need.materialType} in my quotes${current ? ` (now ${inr(current)})` : ''}`}
          onPress={() => {
            const shop = getData().shop!;
            updateShop({ ...shop, materialRates: { ...shop.materialRates, [need.materialType!]: o.price } });
            success();
          }}
        />
      )}
    </Box>
  );
}

function SupplierRow({ x }: { x: Supplier }) {
  const s = useStyles();
  const wa = whatsappNumber(x.phone);
  return (
    <View style={s.supplier}>
      <View style={s.between}>
        <Text style={[s.strong, { flex: 1 }]}>{x.name}</Text>
        <Link label="Remove" onPress={() => confirm('Remove this supplier?', x.name, 'Remove', () => removeSupplier(x.id))} />
      </View>
      <Text style={s.meta}>{[x.city, x.sells.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</Text>
      {x.lastPrice && (
        <Text style={s.meta}>
          Last seen: {x.lastPrice.item} — {inr(x.lastPrice.price)} {x.lastPrice.unit}
        </Text>
      )}
      <View style={s.row}>
        {wa && <Button label="WhatsApp" icon="logo-whatsapp" kind="secondary" small flex onPress={() => openUrl(`https://wa.me/${wa}`)} />}
        {!!x.phone && <Button label="Call" icon="call-outline" kind="secondary" small flex onPress={() => openUrl(telUrl(x.phone))} />}
        {!!x.website && <Button label="Website" icon="open-outline" kind="secondary" small flex onPress={() => openUrl(/^https?:/.test(x.website) ? x.website : `https://${x.website}`)} />}
      </View>
    </View>
  );
}

/** "Where do I buy this?": tools and material for a job, with prices checked on the supplier's own page. */
export default function BuyScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const aiReady = useAIReady();
  // The last search is kept across app restarts (it cost credits); a new list from a quote replaces it.
  const [kept] = useState(() => (peekPendingNeeds() ? undefined : getKept<{ needs: Need[]; result: { needs: Need[]; found: SourcingResult } | null }>('buy')));
  const [needs, setNeeds] = useState<Need[]>(() => peekPendingNeeds() ?? kept?.needs ?? []);
  useEffect(clearPendingNeeds, []);
  const [kind, setKind] = useState<Need['kind']>('tool');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ needs: Need[]; found: SourcingResult } | null>(kept?.result ?? null);
  useEffect(() => {
    keep('buy', needs.length || result ? { needs, result } : null);
  }, [needs, result]);
  const suppliers = data.suppliers ?? [];

  const add = () => {
    setNeeds([...needs, { kind, item: item.trim(), qty: qty.trim() }]);
    setItem('');
    setQty('');
  };

  const search = async () => {
    setBusy(true);
    setError('');
    try {
      const found = await requestSourcing(data, needs);
      setResult({ needs, found });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Buy tools & material' }} />

      <Section title="What you need" />
      {needs.length > 0 && (
        <Box flush>
          {needs.map((n, i) => (
            <View key={i}>
              {i > 0 && <Rule />}
              <View style={s.need}>
                <Ionicons name={n.kind === 'tool' ? 'construct-outline' : 'cube-outline'} size={18} color={c.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.body}>{n.item}</Text>
                  {!!(n.qty || n.context) && <Text style={s.meta}>{[n.qty, n.context].filter(Boolean).join(' · ')}</Text>}
                </View>
                <Link label="Remove" onPress={() => setNeeds(needs.filter((_, j) => j !== i))} />
              </View>
            </View>
          ))}
        </Box>
      )}
      <Box>
        <Segmented
          options={[
            { value: 'tool', label: 'Tool' },
            { value: 'material', label: 'Material' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Field
          label={kind === 'tool' ? 'Which tool?' : 'Which material?'}
          value={item}
          onChangeText={setItem}
          placeholder={kind === 'tool' ? 'e.g. Ø10 4-flute carbide end mill, TiAlN' : 'e.g. EN8 round bar Ø50'}
        />
        <Field label="How many / how much" value={qty} onChangeText={setQty} placeholder={kind === 'tool' ? 'e.g. 5 pcs' : 'e.g. 120 kg'} />
        <Button label="Add to the list" icon="add" kind="secondary" small disabled={item.trim().length < 3 || needs.length >= 12} onPress={add} />
      </Box>

      {!aiReady ? (
        <Box>
          <Text style={s.body}>Sign in to let Aiventre search suppliers for you.</Text>
          <Button label="Sign in" onPress={() => router.push('/account')} />
        </Box>
      ) : (
        <Button label={busy ? 'Searching…' : 'Find suppliers and prices'} icon="search-outline" disabled={busy || needs.length === 0} onPress={search} />
      )}
      {busy && (
        <View style={s.row}>
          <ActivityIndicator color={c.muted} />
          <Text style={[s.meta, { flex: 1 }]}>
            Searching Indian suppliers near {data.shop?.city || 'you'} and opening each page to check the price — about a minute. Keep Aiventre open
            until it’s done.
          </Text>
        </View>
      )}
      {!!error && <Text style={[s.body, { color: c.idle }]}>{error}</Text>}

      {result && (
        <>
          {!!result.found.summary && <Text style={s.body}>{result.found.summary}</Text>}
          {result.needs.map((n, i) => {
            const offers = result.found.offers.filter((o) => o.need === i);
            return (
              <View key={i} style={{ gap: S.md }}>
                <Section title={n.item} />
                {offers.length === 0 ? (
                  <Text style={s.meta}>Nothing reliable found online — ask your usual dealer.</Text>
                ) : (
                  offers.map((o, j) => <OfferCard key={j} o={o} need={n} />)
                )}
              </View>
            );
          })}
          {result.found.tips.length > 0 && (
            <>
              <Section title="Ways to save" />
              <Box>
                {result.found.tips.map((t, i) => (
                  <Text key={i} style={s.body}>
                    • {t}
                  </Text>
                ))}
              </Box>
            </>
          )}
          {result.found.dropped > 0 && (
            <Text style={s.meta}>
              {result.found.dropped} result{result.found.dropped === 1 ? '' : 's'} hidden: the page and website wouldn’t open.
            </Text>
          )}
          <Text style={s.meta}>Prices change daily and listings can be wrong. Confirm the price, brand and delivery with the supplier before you pay.</Text>
        </>
      )}

      {suppliers.length > 0 && (
        <>
          <Section title="My suppliers" />
          <Box flush>
            {suppliers.map((x, i) => (
              <View key={x.id}>
                {i > 0 && <Rule />}
                <SupplierRow x={x} />
              </View>
            ))}
          </Box>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  price: { ...type.strong, fontSize: 18, color: c.text, ...type.num },
  row: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  need: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12 },
  supplier: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: 12 },
}));
