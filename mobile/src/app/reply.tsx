import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { openUrl, whatsappNumber } from '@/components/lead-card';
import { Box, Button, Chip, Label, Link, Screen, StatusPill } from '@/components/ui';
import { buyerForAI, runTask, shopForAI } from '@/lib/api';
import { LEAD_STATUS, type LeadStatus, type Status } from '@/lib/model';
import { setLeadStatus, updateLead, useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

type Triage = {
  category: 'quote_request' | 'callback' | 'needs_info' | 'not_interested' | 'out_of_office' | 'other';
  summary: string;
  next_step: string;
  suggested_reply: string;
};

const CATEGORY: Record<Triage['category'], { label: string; tone: Status; status: LeadStatus | null }> = {
  quote_request: { label: 'Wants a quote', tone: 'running', status: 'quote_requested' },
  callback: { label: 'Wants a call', tone: 'running', status: 'replied' },
  needs_info: { label: 'Needs more info', tone: 'soon', status: 'replied' },
  not_interested: { label: 'Not interested', tone: 'maintenance', status: 'lost' },
  out_of_office: { label: 'Out of office', tone: 'maintenance', status: null },
  other: { label: 'Other', tone: 'maintenance', status: 'replied' },
};

/** Paste what a buyer wrote back; the AI says what it means, what to do, and drafts an answer. */
export default function ReplyScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string }>();
  const data = useData();
  const leads = data.leads ?? [];
  const [buyerId, setBuyerId] = useState(params.id ?? '');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Triage | null>(null);
  const [answer, setAnswer] = useState('');
  const [saved, setSaved] = useState(false);

  const buyer = leads.find((l) => l.id === buyerId);
  // People you've already contacted are the likely ones to reply.
  const options = [...leads].sort((a, b) => Number(b.status !== 'new') - Number(a.status !== 'new')).slice(0, 12);

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const r = await runTask<Triage>('triage_reply', { reply, buyer: buyer ? buyerForAI(buyer) : null, profile: shopForAI(data) });
      setResult(r);
      setAnswer(r.suggested_reply);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!buyer || !result) return;
    const cat = CATEGORY[result.category];
    updateLead(buyer.id, { notes: [buyer.notes, `Reply: ${result.summary}`].filter(Boolean).join('\n'), message: answer || buyer.message }, `Reply: ${cat.label}`);
    if (cat.status) setLeadStatus(buyer.id, cat.status, LEAD_STATUS[cat.status].label);
    setSaved(true);
  };

  const cat = result && CATEGORY[result.category];
  const wa = buyer && whatsappNumber(buyer.phone);

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Sort a reply' }} />

      {!params.id && leads.length > 0 && (
        <View style={{ gap: S.sm }}>
          <Label>Who replied?</Label>
          <View style={s.chips}>
            {options.map((l) => (
              <Chip key={l.id} label={l.company} selected={buyerId === l.id} onPress={() => setBuyerId(buyerId === l.id ? '' : l.id)} />
            ))}
          </View>
        </View>
      )}
      {buyer && params.id && <Text style={s.muted}>From {buyer.company}</Text>}

      <View style={{ gap: S.sm }}>
        <View style={s.between}>
          <Label>Their reply</Label>
          <Link
            label="Paste"
            onPress={async () => {
              const text = await Clipboard.getStringAsync().catch(() => '');
              if (text) setReply(text);
            }}
          />
        </View>
        <TextInput
          value={reply}
          onChangeText={setReply}
          multiline
          textAlignVertical="top"
          placeholder="Copy their WhatsApp message or email and paste it here"
          placeholderTextColor={c.faint}
          selectionColor={c.text}
          style={s.input}
        />
      </View>
      <Button label={busy ? 'Reading it…' : 'What does this mean?'} icon="sparkles-outline" disabled={busy || !reply.trim()} onPress={run} />
      {busy && <ActivityIndicator color={c.muted} />}
      {!!error && <Text style={[s.muted, { color: c.idle }]}>{error}</Text>}

      {result && cat && (
        <Box>
          <StatusPill status={cat.tone} text={cat.label} />
          <Text style={s.body}>{result.summary}</Text>
          <View style={s.next}>
            <Text style={s.meta}>Next step</Text>
            <Text style={s.strong}>{result.next_step}</Text>
          </View>

          {!!answer && (
            <View style={{ gap: S.sm }}>
              <Label>Suggested answer — edit before sending</Label>
              <TextInput value={answer} onChangeText={setAnswer} multiline textAlignVertical="top" selectionColor={c.text} style={s.input} />
              <View style={s.row}>
                {wa && <Button label="WhatsApp" icon="logo-whatsapp" small flex onPress={() => openUrl(`https://wa.me/${wa}?text=${encodeURIComponent(answer)}`)} />}
                {!!buyer?.email && (
                  <Button
                    label="Email"
                    icon="mail-outline"
                    kind={wa ? 'secondary' : 'primary'}
                    small
                    flex
                    onPress={() => openUrl(`mailto:${buyer.email}?subject=${encodeURIComponent(`Re: ${buyer.subject || ''}`)}&body=${encodeURIComponent(answer)}`)}
                  />
                )}
                <Button label="Copy" icon="copy-outline" kind="secondary" small flex onPress={() => Clipboard.setStringAsync(answer).catch(() => {})} />
              </View>
            </View>
          )}

          {buyer &&
            (saved ? (
              <Text style={[s.strong, { color: c.running }]}>Saved to {buyer.company}.</Text>
            ) : (
              <Button label="Save to their page" kind="secondary" onPress={save} />
            ))}
          {result.category === 'quote_request' && <Button label="Prepare the quote" icon="calculator-outline" onPress={() => router.navigate('/quote')} />}
        </Box>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  muted: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  next: { backgroundColor: c.raised, borderRadius: R.control, padding: S.md, gap: 2 },
  input: {
    minHeight: 130,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: R.control,
    padding: 14,
    color: c.text,
    fontSize: 16,
    lineHeight: 22,
  },
}));
