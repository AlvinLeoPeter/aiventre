import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { type Lead, relativeDay } from '@/lib/model';
import { updateLead, useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

import { Box, Button, Link, StatusPill, tap } from './ui';

/** Indian numbers as WhatsApp wants them (91 + 10 digits), only when it looks like a mobile. */
export function whatsappNumber(phone: string) {
  let d = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) d = `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
}

const telUrl = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, '');
  return `tel:${d.startsWith('+') || d.startsWith('0') ? d : d.length === 10 ? `+91${d}` : d}`;
};

const open = (url: string) => Linking.openURL(url).catch(() => {});

export function LeadCard({ lead }: { lead: Lead }) {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const [expanded, setExpanded] = useState(false);
  const machine = data.machines.find((m) => m.id === lead.machineId);
  const wa = whatsappNumber(lead.phone);
  const contacted = () => lead.status === 'new' && updateLead(lead.id, { status: 'contacted' });

  const where = [lead.city, lead.industry].filter(Boolean).join(' · ');

  return (
    <Box style={lead.status === 'not_fit' && { opacity: 0.55 }}>
      <View style={s.top}>
        <Text style={s.company}>{lead.company}</Text>
        {lead.distanceKm > 0 && <Text style={s.meta}>~{lead.distanceKm} km</Text>}
      </View>
      {!!where && <Text style={s.meta}>{where}</Text>}
      <Text style={s.body}>{lead.whyFit}</Text>

      {!!lead.message && (
        <Pressable
          onPress={() => {
            tap();
            setExpanded((x) => !x);
          }}
          style={s.message}>
          <Text style={s.messageText} numberOfLines={expanded ? undefined : 3}>
            {lead.message}
          </Text>
          <Text style={s.more}>{expanded ? 'Show less' : 'Read the message'}</Text>
        </Pressable>
      )}

      <View style={s.actions}>
        {wa && (
          <Button
            label="WhatsApp"
            icon="logo-whatsapp"
            small
            flex
            onPress={() => {
              contacted();
              open(`https://wa.me/${wa}?text=${encodeURIComponent(lead.message)}`);
            }}
          />
        )}
        {!!lead.email && (
          <Button
            label="Email"
            icon="mail-outline"
            kind={wa ? 'secondary' : 'primary'}
            small
            flex
            onPress={() => {
              contacted();
              const subject = `Machining capacity from ${data.shop?.name ?? 'our shop'}`;
              open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lead.message)}`);
            }}
          />
        )}
        {!!lead.phone && (
          <Button label="Call" icon="call-outline" kind={wa || lead.email ? 'secondary' : 'primary'} small flex onPress={() => open(telUrl(lead.phone))} />
        )}
        {!lead.phone && !lead.email && !!lead.website && (
          <Button label="Website" icon="globe-outline" kind="secondary" small flex onPress={() => WebBrowser.openBrowserAsync(lead.website).catch(() => {})} />
        )}
      </View>

      <View style={s.footer}>
        <Text style={[s.meta, { flex: 1 }]} numberOfLines={1}>
          {machine ? `For ${machine.name}` : 'For a machine you removed'} · found {relativeDay(lead.foundAt)}
        </Text>
        {lead.status === 'contacted' && <StatusPill status="running" text="Contacted" />}
      </View>
      <View style={s.links}>
        <Link label="Where AI found it" onPress={() => WebBrowser.openBrowserAsync(lead.sourceUrl).catch(() => {})} />
        {lead.status === 'not_fit' ? (
          <Link label="Undo" onPress={() => updateLead(lead.id, { status: 'new' })} />
        ) : (
          <Pressable
            hitSlop={12}
            onPress={() => {
              tap();
              updateLead(lead.id, { status: 'not_fit' });
            }}>
            <Text style={[s.linkText, { color: c.muted }]}>Not a fit</Text>
          </Pressable>
        )}
      </View>
    </Box>
  );
}

const useStyles = makeStyles((c) => ({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: S.md },
  company: { ...type.heading, color: c.text, flex: 1 },
  meta: { ...type.meta, color: c.muted },
  body: { ...type.body, color: c.text },
  message: { backgroundColor: c.raised, borderRadius: R.control, padding: S.md, gap: 6 },
  messageText: { ...type.body, color: c.muted },
  more: { ...type.meta, color: c.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: S.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' },
}));
