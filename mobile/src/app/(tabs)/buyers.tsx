import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { LeadRow } from '@/components/lead-card';
import { Box, Button, Chip, Link, Rule, Screen, Section } from '@/components/ui';
import { findWork, useSearches } from '@/lib/find';
import { followUpDue, type Lead } from '@/lib/model';
import { useData } from '@/lib/store';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const FILTERS: { id: string; label: string; test: (l: Lead) => boolean }[] = [
  { id: 'todo', label: 'To do', test: (l) => l.status === 'new' || followUpDue(l) },
  { id: 'contacted', label: 'Contacted', test: (l) => l.status === 'contacted' },
  { id: 'talking', label: 'Talking', test: (l) => l.status === 'replied' || l.status === 'quote_requested' },
  { id: 'done', label: 'Won / not now', test: (l) => l.status === 'won' || l.status === 'lost' },
  { id: 'all', label: 'All', test: () => true },
];

function Stat({ value, label, first }: { value: number; label: string; first?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.stat, !first && s.statDivider]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.meta}>{label}</Text>
    </View>
  );
}

export default function BuyersScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const searches = useSearches();
  const [filter, setFilter] = useState('todo');
  const [q, setQ] = useState('');
  const leads = data.leads ?? [];
  const name = (id: string) => data.machines.find((m) => m.id === id)?.name ?? 'a machine';

  const needle = q.trim().toLowerCase();
  const shown = leads
    .filter(FILTERS.find((f) => f.id === filter)!.test)
    .filter((l) => !needle || [l.company, l.city, l.industry].join(' ').toLowerCase().includes(needle))
    .sort((a, b) => Number(followUpDue(b)) - Number(followUpDue(a)));

  const activity = Object.entries(searches).filter(([id]) => data.machines.some((m) => m.id === id));

  return (
    <Screen title="Buyers" sub="Companies that could send you work">
      <View style={s.row}>
        <Button label="Ask Aiventre" icon="sparkles-outline" small flex onPress={() => router.push('/assistant')} />
        <Button label="Sort a reply" icon="chatbubble-ellipses-outline" kind="secondary" small flex onPress={() => router.push('/reply')} />
      </View>

      {activity.map(([id, st]) =>
        st.state === 'running' ? (
          <Box key={id} style={s.inline}>
            <ActivityIndicator color={c.muted} />
            <View style={{ flex: 1 }}>
              <Text style={s.strong}>Finding work for {name(id)}…</Text>
              <Text style={s.meta}>Usually 1–3 minutes. You can keep using the app.</Text>
            </View>
          </Box>
        ) : st.state === 'failed' ? (
          <Box key={id} style={{ borderColor: c.idle }}>
            <Text style={s.strong}>The search for {name(id)} didn’t finish</Text>
            <Text style={s.meta}>{st.error}</Text>
            <Button label="Try again" kind="secondary" small onPress={() => findWork(id)} />
          </Box>
        ) : (
          <Box key={id}>
            <Text style={s.strong}>
              {st.added ? `${st.added} new buyer${st.added === 1 ? '' : 's'} for ${name(id)}` : `Nothing new for ${name(id)} this time`}
            </Text>
            {!!st.summary && <Text style={s.meta}>{st.summary}</Text>}
          </Box>
        ),
      )}

      {leads.length > 0 && (
        <Box flush style={{ flexDirection: 'row' }}>
          <Stat first value={leads.filter((l) => l.status === 'new').length} label="to message" />
          <Stat value={leads.filter((l) => followUpDue(l)).length} label="to follow up" />
          <Stat value={leads.filter((l) => l.status === 'replied' || l.status === 'quote_requested').length} label="talking to you" />
        </Box>
      )}

      {leads.length === 0 && activity.length === 0 ? (
        <Box>
          <Text style={s.heading}>No buyers yet</Text>
          <Text style={s.body}>
            Tap “Find work” next to a free machine on Today, or ask Aiventre for anything — “find tractor makers within 200 km”, “check
            tenders for machining”. It finds real companies, with the link, and writes the first message. You send it.
          </Text>
          <Button label="Add a buyer I know" kind="secondary" onPress={() => router.push('/buyer/new')} />
        </Box>
      ) : (
        <>
          <Section title="Your list" right={<Link label="+ Add" onPress={() => router.push('/buyer/new')} />} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={{ marginHorizontal: -S.lg }}>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={`${f.label} ${leads.filter(f.test).length}`} selected={filter === f.id} onPress={() => setFilter(f.id)} />
            ))}
          </ScrollView>
          {leads.length > 6 && (
            <TextInput value={q} onChangeText={setQ} placeholder="Search by company, city or industry" placeholderTextColor={c.faint} selectionColor={c.text} style={s.search} />
          )}
          {shown.length === 0 ? (
            <Text style={s.body}>Nothing here right now.</Text>
          ) : (
            <Box flush>
              {shown.map((l, i) => (
                <View key={l.id}>
                  {i > 0 && <Rule />}
                  <LeadRow lead={l} />
                </View>
              ))}
            </Box>
          )}
          <Text style={s.meta}>The AI only lists companies it found on the web, with the link. Check before you send — you send every message yourself.</Text>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: S.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  stat: { flex: 1, paddingVertical: 12, paddingHorizontal: S.md, gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: c.rule },
  statValue: { ...type.value, fontSize: 22, color: c.text },
  filters: { gap: S.sm, paddingHorizontal: S.lg },
  search: {
    minHeight: 44,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: S.lg,
    color: c.text,
    fontSize: 16,
  },
}));
