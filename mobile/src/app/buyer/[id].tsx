import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { openUrl, telUrl, whatsappNumber } from '@/components/lead-card';
import { TrustSection } from '@/components/trust';
import { Box, Button, Chip, Field, Link, Screen, Section, StatusPill, success } from '@/components/ui';
import { buyerForAI, runTask, shopForAI } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { followUpDue, LEAD_STATUS, type LeadStatus, niceDay, relativeDay, toDay } from '@/lib/model';
import { markContacted, removeLead, setLeadStatus, updateLead, useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const web = (url: string) => WebBrowser.openBrowserAsync(url.startsWith('http') ? url : `https://${url}`).catch(() => {});

export default function BuyerScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const lead = (data.leads ?? []).find((l) => l.id === id);

  const [subject, setSubject] = useState(lead?.subject ?? '');
  const [message, setMessage] = useState(lead?.message ?? '');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // After opening WhatsApp or email we can't see whether it was sent, so we ask.
  const [asking, setAsking] = useState<string | null>(null);

  if (!lead) {
    return (
      <Screen padTop={false}>
        <Text style={s.muted}>This buyer was removed.</Text>
      </Screen>
    );
  }

  const machine = data.machines.find((m) => m.id === lead.machineId);
  const wa = whatsappNumber(lead.phone);
  const due = followUpDue(lead);
  const followUp = lead.status === 'contacted';
  const where = [lead.city, lead.state, lead.industry, lead.distanceKm ? `~${lead.distanceKm} km away` : ''].filter(Boolean).join(' · ');

  const saveMessage = () => {
    if (subject !== lead.subject || message !== lead.message) updateLead(lead.id, { subject, message }, 'Message edited');
  };

  const write = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await runTask<{ subject: string; body: string }>('draft_email', {
        profile: shopForAI(data),
        buyer: buyerForAI(lead),
        kind: followUp ? 'follow_up' : 'first',
      });
      setSubject(r.subject);
      setMessage(r.body);
      updateLead(lead.id, { subject: r.subject, message: r.body }, followUp ? 'Follow-up written by AI' : 'Message written by AI');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = (how: 'WhatsApp' | 'Email') => {
    saveMessage();
    if (how === 'WhatsApp') openUrl(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`);
    else openUrl(`mailto:${lead.email}?subject=${encodeURIComponent(subject || `Machining capacity from ${data.shop?.name ?? ''}`)}&body=${encodeURIComponent(message)}`);
    setAsking(how);
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: '' }} />

      <View style={{ gap: S.sm }}>
        <StatusPill status={due ? 'check' : LEAD_STATUS[lead.status].tone} text={due ? 'Follow-up due' : LEAD_STATUS[lead.status].label} />
        <Text style={s.title}>{lead.company}</Text>
        {!!where && <Text style={s.muted}>{where}</Text>}
        {!!lead.whyFit && <Text style={s.body}>{lead.whyFit}</Text>}
        {machine && <Text style={s.meta}>Found for {machine.name}’s free days · {relativeDay(lead.foundAt)}</Text>}
      </View>

      <Section title="Can you trust this lead?" />
      <TrustSection lead={lead} />

      {asking && (
        <Box style={{ borderColor: c.text }}>
          <Text style={s.strong}>Did you send it on {asking}?</Text>
          <View style={s.row}>
            <Button
              label="Yes, sent"
              small
              flex
              onPress={() => {
                success();
                markContacted(lead.id, `Sent on ${asking}`);
                setAsking(null);
              }}
            />
            <Button label="Not yet" kind="secondary" small flex onPress={() => setAsking(null)} />
          </View>
        </Box>
      )}

      <Section title={followUp ? 'Follow-up message' : 'Message'} />
      {followUp && lead.followUpAt && (
        <Text style={[s.meta, { marginTop: -S.sm }]}>
          {due ? 'No reply yet — time for a short nudge.' : `If they stay quiet, follow up ${niceDay(lead.followUpAt)}.`}
        </Text>
      )}
      <Box>
        {!!lead.email && <Field label="Email subject" value={subject} onChangeText={setSubject} onBlur={saveMessage} />}
        <TextInput
          value={message}
          onChangeText={setMessage}
          onBlur={saveMessage}
          multiline
          textAlignVertical="top"
          placeholder="Write a message, or let the AI write one"
          placeholderTextColor={c.faint}
          selectionColor={c.text}
          style={s.message}
        />
        <View style={s.row}>
          <Button
            label={busy ? 'Writing…' : followUp ? 'Write a follow-up' : message.trim() ? 'Rewrite with AI' : 'Write with AI'}
            icon="sparkles-outline"
            kind="secondary"
            small
            flex
            disabled={busy}
            onPress={write}
          />
          <Button
            label={copied ? 'Copied' : 'Copy'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            kind="secondary"
            small
            disabled={!message.trim()}
            onPress={() => {
              Clipboard.setStringAsync(subject && lead.email ? `${subject}\n\n${message}` : message).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        </View>
        {busy && <ActivityIndicator color={c.muted} />}
        {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
        <View style={s.row}>
          {wa && <Button label="WhatsApp" icon="logo-whatsapp" small flex disabled={!message.trim()} onPress={() => send('WhatsApp')} />}
          {!!lead.email && (
            <Button label="Email" icon="mail-outline" kind={wa ? 'secondary' : 'primary'} small flex disabled={!message.trim()} onPress={() => send('Email')} />
          )}
          {!!lead.phone && <Button label="Call" icon="call-outline" kind="secondary" small flex onPress={() => openUrl(telUrl(lead.phone))} />}
        </View>
        {!lead.phone && !lead.email && (
          <Text style={s.meta}>No phone or email found yet. Copy the message and use the contact form on their website, or add a number below.</Text>
        )}
        {!wa && !lead.email && !!lead.phone && <Text style={s.meta}>This looks like an office line, so WhatsApp isn’t offered. Call them, or add a mobile number below.</Text>}
        {!asking && <Link label={lead.status === 'new' ? 'I already sent it' : 'I sent it another way'} onPress={() => markContacted(lead.id, 'Sent')} />}
      </Box>

      <Button
        label="They replied — what does it mean?"
        icon="chatbubble-ellipses-outline"
        kind="secondary"
        onPress={() => router.push({ pathname: '/reply', params: { id: lead.id } })}
      />

      <Section title="Where things stand" />
      <View style={s.chips}>
        {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((st) => (
          <Chip key={st} label={LEAD_STATUS[st].label} selected={lead.status === st} onPress={() => setLeadStatus(lead.id, st, LEAD_STATUS[st].label)} />
        ))}
      </View>

      <Section title="Contact" />
      <Box style={{ gap: S.lg }}>
        <Field label="Phone" defaultValue={lead.phone} keyboardType="phone-pad" onEndEditing={(e) => updateLead(lead.id, { phone: e.nativeEvent.text.trim() })} />
        <Field label="Email" defaultValue={lead.email} keyboardType="email-address" autoCapitalize="none" onEndEditing={(e) => updateLead(lead.id, { email: e.nativeEvent.text.trim() })} />
        <Field label="Contact or department" defaultValue={lead.contactRole} placeholder="e.g. Purchase department" onEndEditing={(e) => updateLead(lead.id, { contactRole: e.nativeEvent.text.trim() })} />
        <Field label="Website" defaultValue={lead.website} autoCapitalize="none" onEndEditing={(e) => updateLead(lead.id, { website: e.nativeEvent.text.trim() })} />
        <View style={s.between}>
          {!!lead.website && <Link label="Open website" onPress={() => web(lead.website)} />}
          {!!lead.sourceUrl && <Link label="Where AI found it" onPress={() => web(lead.sourceUrl)} />}
        </View>
        {!!lead.sourceUrl && <Text style={s.meta}>Found by AI — check the link before you contact them.</Text>}
      </Box>

      <Section title="Notes" />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== lead.notes && updateLead(lead.id, { notes })}
        multiline
        textAlignVertical="top"
        placeholder="Calls, who you spoke to, what they make…"
        placeholderTextColor={c.faint}
        selectionColor={c.text}
        style={[s.message, { minHeight: 90, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
      />

      <Section title="History" />
      <Box style={{ gap: S.sm }}>
        {[...lead.history].reverse().map((h, i) => (
          <View key={i} style={s.historyRow}>
            <Text style={[s.meta, s.historyDate]}>{niceDay(toDay(new Date(h.at)))}</Text>
            <Text style={[s.body, { flex: 1 }]}>{h.text}</Text>
          </View>
        ))}
      </Box>

      <Button
        label="Remove buyer"
        kind="danger"
        icon="trash-outline"
        onPress={() =>
          confirm(`Remove ${lead.company}?`, 'They’ll be taken off your buyer list.', 'Remove', () => {
            removeLead(lead.id);
            router.back();
          })
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  title: { ...type.title, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  muted: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', gap: S.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  message: {
    minHeight: 150,
    backgroundColor: c.raised,
    borderRadius: R.control,
    padding: 14,
    color: c.text,
    fontSize: 16,
    lineHeight: 22,
  },
  historyRow: { flexDirection: 'row', gap: S.md },
  historyDate: { width: 92, ...type.num },
}));
