import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';

import { followUpDue, type Lead, LEAD_STATUS } from '@/lib/model';
import { useData } from '@/lib/store';
import { makeStyles, S, TILES, type, useTheme } from '@/lib/theme';

import { TrustPill } from './trust';
import { Press, StatusPill } from './ui';

/** Indian numbers as WhatsApp wants them (91 + 10 digits), only when it looks like a mobile. */
export function whatsappNumber(phone: string) {
  let d = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) d = `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
}

export const telUrl = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, '');
  return `tel:${d.startsWith('+') || d.startsWith('0') ? d : d.length === 10 ? `+91${d}` : d}`;
};

export const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

/** One buyer in the list: who, where, why, and what's next. Tap for everything else. */
export function LeadRow({ lead }: { lead: Lead }) {
  const { c, scheme } = useTheme();
  const s = useStyles();
  const data = useData();
  const machine = data.machines.find((m) => m.id === lead.machineId);
  const where = [lead.city, lead.industry, lead.distanceKm ? `~${lead.distanceKm} km` : ''].filter(Boolean).join(' · ');
  const due = followUpDue(lead);
  const tile = TILES[scheme][TONES[lead.company.length % TONES.length]];

  return (
    <Press
      scale={0.985}
      onPress={() => router.push({ pathname: '/buyer/[id]', params: { id: lead.id } })}
      style={s.row}
      pressedStyle={{ backgroundColor: c.raised }}>
      <View style={s.top}>
        <View style={[s.initials, { backgroundColor: tile.bg }]}>
          <Text style={[s.initialsText, { color: tile.ink }]}>{initials(lead.company)}</Text>
        </View>
        <Text style={s.company} numberOfLines={1}>
          {lead.company}
        </Text>
        <StatusPill status={due ? 'check' : LEAD_STATUS[lead.status].tone} text={due ? 'Follow up' : LEAD_STATUS[lead.status].label} />
      </View>
      {!!where && <Text style={s.meta}>{where}</Text>}
      <TrustPill lead={lead} />
      {!!lead.whyFit && (
        <Text style={s.body} numberOfLines={2}>
          {lead.whyFit}
        </Text>
      )}
      <Text style={s.faint} numberOfLines={1}>
        {[machine && `For ${machine.name}`, !lead.phone && !lead.email && 'No contact yet'].filter(Boolean).join(' · ') || ' '}
      </Text>
    </Press>
  );
}

const TONES = ['blue', 'orange', 'pink', 'green'] as const;
// Two letters from the company's name, for its little coloured badge: "Lavin Enterprises" → LE.
const initials = (name: string) =>
  name
    .replace(/\b(pvt|private|ltd|limited|llp|the|and|&)\b\.?/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

const useStyles = makeStyles((c) => ({
  initials: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 15, fontWeight: '800' },
  row: { paddingHorizontal: S.lg, paddingVertical: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  company: { ...type.strong, fontSize: 16, color: c.text, flex: 1 },
  meta: { ...type.meta, color: c.muted },
  body: { ...type.body, color: c.text },
  faint: { ...type.meta, color: c.faint },
}));
