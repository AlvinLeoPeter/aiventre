import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { openUrl } from '@/components/lead-card';
import { Box, Button, Field, Link, Screen, Section, StatusPill } from '@/components/ui';
import { useAIReady } from '@/lib/auth';
import { usePrefs } from '@/lib/prefs';
import { addDays, niceDay } from '@/lib/model';
import { daysLeft, dismissJob, type OpenJob, quoteNotes, searchOpenJobs, toggleSaved, useOpenJobs, WATCH_DAYS } from '@/lib/open-jobs';
import { inr, setQuoteDraft } from '@/lib/quote';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

const KIND: Record<OpenJob['kind'], string> = { tender: 'Tender', buy_requirement: 'Buy requirement', rfq: 'Request for quote' };

function closes(j: OpenJob) {
  const left = daysLeft(j);
  if (left === null) return { text: 'Closing date not shown', urgent: false };
  if (left < 0) return { text: 'Closed', urgent: true };
  if (left === 0) return { text: 'Closes today', urgent: true };
  return { text: `Closes ${niceDay(j.closing_date)} · ${left} day${left === 1 ? '' : 's'} left`, urgent: left <= 3 };
}

function JobCard({ j }: { j: OpenJob }) {
  const { c } = useTheme();
  const s = useStyles();
  const when = closes(j);
  const closed = (daysLeft(j) ?? 0) < 0;
  return (
    <Box style={[j.saved && { borderColor: c.text }, closed && { opacity: 0.6 }]}>
      <View style={s.between}>
        <Text style={s.kind}>
          {KIND[j.kind]} · {j.portal}
        </Text>
        <StatusPill status={j.fit === 'good' ? 'running' : 'soon'} text={j.fit === 'good' ? 'Good fit' : 'Check fit'} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={s.title}>{j.title}</Text>
        <Text style={s.meta}>{[j.buyer, j.location || j.state].filter(Boolean).join(' · ')}</Text>
      </View>
      <View style={s.facts}>
        {!!j.quantity && <Fact label="Quantity" value={j.quantity} />}
        {!!j.material && <Fact label="Material" value={j.material} />}
        {j.estimated_value_inr > 0 && <Fact label="Estimated value" value={inr(j.estimated_value_inr)} />}
        {j.emd_inr > 0 && <Fact label="EMD (deposit)" value={inr(j.emd_inr)} />}
      </View>
      <View style={s.line}>
        <Ionicons name="time-outline" size={16} color={when.urgent ? c.idle : c.muted} />
        <Text style={[s.meta, when.urgent && { color: c.idle, fontWeight: '600' }]}>{when.text}</Text>
      </View>
      {!!j.why_fit && <Text style={s.body}>{j.why_fit}</Text>}
      {j.to_apply.length > 0 && (
        <View style={{ gap: 2 }}>
          <Text style={s.label}>To apply</Text>
          {j.to_apply.map((t, i) => (
            <Text key={i} style={s.body}>
              • {t}
            </Text>
          ))}
        </View>
      )}
      <View style={s.line}>
        <Ionicons name={j.check?.page === 'ok' ? 'checkmark-circle' : 'alert-circle'} size={16} color={j.check?.page === 'ok' ? c.running : c.soon} />
        <Text style={s.meta}>{j.check?.page === 'ok' ? 'Page opened just now' : 'The site blocks checks — open it to confirm it’s still live'}</Text>
      </View>
      <View style={s.row}>
        <Button label="Open" icon="open-outline" kind="secondary" small flex onPress={() => openUrl(j.url)} />
        <Button
          label="Quote this"
          icon="calculator-outline"
          kind="secondary"
          small
          flex
          disabled={closed}
          onPress={() => {
            setQuoteDraft(quoteNotes(j));
            router.navigate('/quote');
          }}
        />
        <Button label={j.saved ? 'Saved' : 'Save'} icon={j.saved ? 'bookmark' : 'bookmark-outline'} kind={j.saved ? 'primary' : 'secondary'} small flex onPress={() => toggleSaved(j.id)} />
      </View>
      {!j.saved && <Link label="Not for me" onPress={() => dismissJob(j.id)} />}
    </Box>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.fact}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.strong}>{value}</Text>
    </View>
  );
}

/** Work buyers have already posted — tenders and buy requirements — still open, matched to the shop. */
export default function OpenJobsScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const { jobs, last, busy, error } = useOpenJobs();
  const prefs = usePrefs();
  const aiReady = useAIReady();
  const [focus, setFocus] = useState('');

  const saved = jobs.filter((j) => j.saved).sort((a, b) => (a.closing_date || '9').localeCompare(b.closing_date || '9'));
  const fresh = jobs.filter((j) => !j.saved);

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Open jobs' }} />
      <Text style={s.body}>
        Work buyers have already posted and that’s still open: government tenders (GeM, central and state portals) and buy requirements
        on B2B sites — matched to your machines.
      </Text>

      <Box>
        <Field label="Looking for anything in particular? (optional)" value={focus} onChangeText={setFocus} placeholder="e.g. flanges, shafts, fabrication" />
        {aiReady ? (
          <Button label={busy ? 'Searching…' : 'Find open jobs'} icon="search-outline" disabled={busy} onPress={() => searchOpenJobs(focus.trim())} />
        ) : (
          <Button label="Sign in to search" onPress={() => router.push('/account')} />
        )}
        {busy && (
          <View style={s.line}>
            <ActivityIndicator color={c.muted} />
            <Text style={[s.meta, { flex: 1 }]}>Checking tender portals and buy requirements, then opening each one — about 1 to 3 minutes.</Text>
          </View>
        )}
        {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
        <Text style={s.meta}>
          {prefs.watchJobs
            ? `Aiventre also checks by itself every ${WATCH_DAYS} days${prefs.jobsCheckedAt ? ` (next after ${niceDay(addDays(prefs.jobsCheckedAt, WATCH_DAYS))})` : ''} and notifies you only when something new fits.`
            : 'Automatic checks are off — turn them on in My shop.'}
        </Text>
      </Box>

      {saved.length > 0 && (
        <>
          <Section title={`Saved · ${saved.length}`} />
          <Text style={[s.meta, { marginTop: -S.sm }]}>You get a reminder two days before each one closes.</Text>
          {saved.map((j) => (
            <JobCard key={j.id} j={j} />
          ))}
        </>
      )}

      {last && (
        <>
          <Section title={fresh.length ? `Found · ${fresh.length}` : 'Last search'} />
          <Text style={s.body}>{last.summary}</Text>
          {last.widened && <Text style={s.meta}>Not much in your state, so this includes the rest of India.</Text>}
          {last.can_widen && (
            <Button
              label={busy ? 'Searching…' : 'Search the rest of India too'}
              icon="globe-outline"
              kind="secondary"
              small
              disabled={busy}
              onPress={() => searchOpenJobs(focus.trim(), 'india')}
            />
          )}
          {fresh.map((j) => (
            <JobCard key={j.id} j={j} />
          ))}
          {last.dropped > 0 && (
            <Text style={s.meta}>
              {last.dropped} hidden: already closed, or the page no longer exists.
            </Text>
          )}
          {last.next_steps.length > 0 && (
            <Box>
              <Text style={s.strong}>{fresh.length ? 'To get more' : 'Nothing open that fits right now. What to try:'}</Text>
              {last.next_steps.map((t, i) => (
                <Text key={i} style={s.body}>
                  • {t}
                </Text>
              ))}
              <Button label="Find companies to approach instead" icon="people-outline" kind="secondary" small onPress={() => router.navigate('/')} />
            </Box>
          )}
        </>
      )}

      <Text style={s.meta}>
        Tenders usually go to the lowest valid bid and need registration on the portal. Always read the full tender document before you
        bid.
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  title: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  label: { ...type.label, color: c.muted },
  kind: { ...type.meta, color: c.muted, fontWeight: '600', flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  fact: { minWidth: '40%', flexGrow: 1, gap: 1 },
}));
