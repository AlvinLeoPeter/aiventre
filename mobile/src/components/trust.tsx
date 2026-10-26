import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type Checks, type Flag, FLAG_LABEL, type Lead } from '@/lib/model';
import { flagLead } from '@/lib/store';
import { makeStyles, type Palette, S, type, useTheme } from '@/lib/theme';
import { checkLeads, useChecking } from '@/lib/verify';

import { Box, Button, Chip, Label, StatusPill } from './ui';

type Mark = 'yes' | 'no' | 'warn' | 'unknown';

/** The three things we try to confirm about a buyer, in plain words. */
function lines(c: Checks): { mark: Mark; title: string; detail: string }[] {
  const link: { mark: Mark; detail: string } =
    c.link === 'ok'
      ? { mark: 'yes', detail: 'The page the AI found them on is real and names this company.' }
      : c.link === 'no_mention'
        ? { mark: 'warn', detail: 'The page opens, but we couldn’t find this company named on it. Check it yourself.' }
        : c.link === 'broken'
          ? { mark: c.website === 'ok' ? 'warn' : 'no', detail: c.website === 'ok' ? 'The source page didn’t open, but their own website did.' : 'Neither the source page nor their website opened.' }
          : { mark: c.website === 'ok' ? 'yes' : 'unknown', detail: c.website === 'ok' ? 'Their website is up.' : 'No link to check.' };

  const contactBits = [
    c.email === 'official' && 'the email is on their own website’s domain',
    c.phone === 'on_site' && 'the phone number is printed on their site',
  ].filter(Boolean);
  const contact: { mark: Mark; detail: string } = contactBits.length
    ? { mark: 'yes', detail: `Confirmed: ${contactBits.join(' and ')}.` }
    : c.email === 'free'
      ? { mark: 'warn', detail: 'The email is a Gmail-type address. Common for small firms, but check it’s really theirs.' }
      : c.phone === 'not_found'
        ? { mark: 'warn', detail: 'We couldn’t find this phone number on their pages. It may be old.' }
        : c.email === 'none' && c.phone === 'none'
          ? { mark: 'unknown', detail: 'No contact details to check yet.' }
          : { mark: 'warn', detail: 'We couldn’t match the contact to their website.' };

  const r = c.registration;
  const registration: { mark: Mark; detail: string } = !r
    ? { mark: 'unknown', detail: 'No GST or company number found on their pages. Many small firms don’t print one.' }
    : r.invalid
      ? { mark: 'no', detail: `The ${r.kind} given (${r.id}) fails the official check. It’s mistyped or not real.` }
      : r.stateMatches === false
        ? { mark: 'warn', detail: `${r.kind} ${r.id} is valid but registered in ${r.state}, not where they’re listed.` }
        : { mark: 'yes', detail: `${r.kind} ${r.id}${r.state ? ` (${r.state})` : ''} is on their site and passes the official check.` };

  return [
    { ...link, title: 'Real company' },
    { ...contact, title: 'Contact is theirs' },
    { ...registration, title: 'Registered business' },
  ];
}

const ICON: Record<Mark, keyof typeof Ionicons.glyphMap> = {
  yes: 'checkmark-circle',
  warn: 'alert-circle',
  no: 'close-circle',
  unknown: 'ellipse-outline',
};
const tone = (c: Palette, m: Mark) => ({ yes: c.running, warn: c.soon, no: c.idle, unknown: c.faint })[m];

/** A small pill for lists: how many of the three checks passed. */
export function TrustPill({ lead }: { lead: Lead }) {
  if (lead.flags?.length) return <StatusPill status="idle" text={FLAG_LABEL[lead.flags[0]]} />;
  const c = lead.checks;
  if (!c) return null;
  if (c.link === 'broken' && c.website !== 'ok') return <StatusPill status="idle" text="Couldn’t confirm" />;
  return <StatusPill status={c.passed >= 2 ? 'running' : c.passed === 1 ? 'soon' : 'maintenance'} text={`${c.passed}/3 checked`} />;
}

const FLAGS: Flag[] = ['wrong_number', 'wrong_email', 'fake'];

/** The buyer page's section: what we confirmed, a re-check, and the owner's own verdict. */
export function TrustSection({ lead }: { lead: Lead }) {
  const { c } = useTheme();
  const s = useStyles();
  const checking = useChecking().has(lead.id);

  return (
    <View style={{ gap: S.md }}>
      <Box>
        {lead.checks ? (
          lines(lead.checks).map((l) => (
            <View key={l.title} style={s.line}>
              <Ionicons name={ICON[l.mark]} size={20} color={tone(c, l.mark)} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.strong}>{l.title}</Text>
                <Text style={s.meta}>{l.detail}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.meta}>Not checked yet. We open their pages to confirm they’re real — no AI, so it costs nothing.</Text>
        )}
        <View style={s.row}>
          {checking && <ActivityIndicator color={c.muted} />}
          <Button
            label={checking ? 'Checking…' : lead.checks ? 'Check again' : 'Check this buyer'}
            icon="shield-checkmark-outline"
            kind="secondary"
            small
            flex
            disabled={checking || (!lead.website && !lead.sourceUrl)}
            onPress={() => checkLeads([lead.id])}
          />
        </View>
      </Box>
      <Label>Something wrong? Tell Aiventre so it avoids it next time</Label>
      <View style={s.chips}>
        {FLAGS.map((f) => (
          <Chip key={f} label={FLAG_LABEL[f]} selected={!!lead.flags?.includes(f)} onPress={() => flagLead(lead.id, f, FLAG_LABEL[f])} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  line: { flexDirection: 'row', gap: S.md, alignItems: 'flex-start' },
  strong: { ...type.strong, color: c.text },
  meta: { ...type.meta, color: c.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
}));
