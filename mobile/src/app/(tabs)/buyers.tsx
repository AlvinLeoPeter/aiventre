import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';

import { LeadCard } from '@/components/lead-card';
import { Box, Button, Screen, Segmented } from '@/components/ui';
import { findWork, useSearches } from '@/lib/find';
import type { Lead } from '@/lib/model';
import { useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

type Filter = 'new' | 'contacted' | 'all';

export default function BuyersScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const searches = useSearches();
  const [filter, setFilter] = useState<Filter>('new');
  const leads = data.leads ?? [];
  const name = (id: string) => data.machines.find((m) => m.id === id)?.name ?? 'a machine';

  const shown = leads.filter((l) => (filter === 'all' ? true : filter === 'new' ? l.status === 'new' : l.status === 'contacted'));
  const count = (st: Lead['status']) => leads.filter((l) => l.status === st).length;

  const activity = Object.entries(searches).filter(([id]) => data.machines.some((m) => m.id === id));

  return (
    <Screen title="Buyers" sub="Companies the AI found for your free machines">
      {activity.map(([id, st]) =>
        st.state === 'running' ? (
          <Box key={id} style={s.row}>
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
        <Segmented
          options={[
            { value: 'new', label: `New · ${count('new')}` },
            { value: 'contacted', label: `Contacted · ${count('contacted')}` },
            { value: 'all', label: 'All' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      )}

      {leads.length === 0 && activity.length === 0 && (
        <Box>
          <Text style={s.heading}>No buyers yet</Text>
          <Text style={s.body}>
            When a machine has free days coming, tap “Find work” next to it on Today. The AI searches for real companies near you that
            buy that kind of work, and writes a first message for each one. You decide who to send it to.
          </Text>
          <Button label="Go to Today" kind="secondary" onPress={() => router.navigate('/')} />
        </Box>
      )}

      {leads.length > 0 && shown.length === 0 && (
        <Text style={s.body}>{filter === 'new' ? 'You’ve gone through every new buyer.' : 'Nobody contacted yet.'}</Text>
      )}

      {shown.map((l) => (
        <LeadCard key={l.id} lead={l} />
      ))}

      {leads.length > 0 && (
        <Text style={s.meta}>
          The AI only lists companies it found on the web, with the link. Check before you send — and you send every message yourself.
        </Text>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
}));
