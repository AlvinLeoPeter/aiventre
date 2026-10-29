import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FreeHighlight } from '@/components/find-work';
import { LeadRow } from '@/components/lead-card';
import { MachineRow } from '@/components/machine-card';
import { NeedsYou } from '@/components/needs-you';
import { Ring } from '@/components/ring';
import { Box, Button, Link, Press, Rule, Screen, StatusPill, Tile } from '@/components/ui';
import { balance, invoiceState } from '@/lib/invoice';
import { addDays, BOARD_DAYS, bookedShare, followUpDue, freeDays, type MachineView, niceDay, parseDay, today } from '@/lib/model';
import { useOpenJobs } from '@/lib/open-jobs';
import { inr } from '@/lib/quote';
import { useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** One number across the top: what it is, the number, a line under it; the whole card opens its page. */
function Kpi({ label, value, sub, to, children, tone }: { label: string; value: string; sub: string; to: Href; children?: ReactNode; tone?: string }) {
  const s = useStyles();
  return (
    <Press label={label} scale={0.98} style={s.kpiWrap} onPress={() => router.navigate(to)}>
      <Box style={s.kpi}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.kpiLabel}>{label}</Text>
          <Text style={[s.kpiValue, tone ? { color: tone } : null]} numberOfLines={1}>
            {value}
          </Text>
          <Text style={s.meta} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {children}
      </Box>
    </Press>
  );
}

/** A card with a title, an optional link on the right, and its contents. */
function Panel({ title, right, children, flush }: { title: string; right?: ReactNode; children: ReactNode; flush?: boolean }) {
  const s = useStyles();
  return (
    <Box flush={flush} style={flush ? { overflow: 'hidden' } : { gap: S.md }}>
      <View style={[s.panelHead, flush && { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm }]}>
        <Text style={s.panelTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </Box>
  );
}

/**
 * The desktop dashboard: the whole shop on one screen. Across the top, the numbers that matter;
 * then every machine's next two weeks, the buyers, what needs you and the money.
 */
export function Dashboard({ views }: { views: MachineView[] }) {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const openJobs = useOpenJobs();
  const now = today();
  const shop = data.shop!;

  const booked = bookedShare(views, now);
  const free = freeDays(views, now);
  const idle = views.filter((v) => v.status === 'idle').length;
  const leads = data.leads ?? [];
  const toMessage = leads.filter((l) => l.status === 'new').length;
  const followUps = leads.filter((l) => followUpDue(l, now)).length;
  const talking = leads.filter((l) => l.status === 'replied' || l.status === 'quote_requested').length;
  const won = leads.filter((l) => l.status === 'won').length;
  const invoices = (data.invoices ?? []).filter((i) => !i.cancelled);
  const toCollect = invoices.reduce((sum, i) => sum + balance(i), 0);
  const open = invoices.filter((i) => balance(i) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = open.filter((i) => invoiceState(i, now).key === 'overdue');
  const savedJobs = openJobs.jobs.filter((j) => j.saved).length;
  const topLeads = [...leads]
    .filter((l) => l.status !== 'lost')
    .sort((a, b) => Number(followUpDue(b, now)) - Number(followUpDue(a, now)) || (b.checks?.passed ?? -1) - (a.checks?.passed ?? -1))
    .slice(0, 5);

  return (
    <Screen maxWidth={1320}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.meta}>
            {greeting()}
            {shop.owner ? `, ${shop.owner}` : ''} · {niceDay(now)}
          </Text>
          <Text style={s.title}>{shop.name}</Text>
        </View>
        <Button label="Ask Aiventre" icon="sparkles" kind="accent" onPress={() => router.push('/assistant')} />
        <Button label="Quote a drawing" icon="calculator-outline" kind="secondary" onPress={() => router.navigate('/quote')} />
      </View>

      <View style={s.kpis}>
        <Kpi label="Booked · 2 weeks" value={`${Math.round(booked * 100)}%`} sub={`${views.length} machine${views.length === 1 ? '' : 's'}`} to="/machines">
          <Ring value={booked} size={64} stroke={9} label="booked" bare />
        </Kpi>
        <Kpi label="Free machine-days" value={String(free)} sub={idle ? `${idle} machine${idle === 1 ? '' : 's'} idle now` : 'nothing idle now'} to="/machines" tone={idle ? c.idle : undefined} />
        <Kpi label="To collect" value={inr(toCollect)} sub={overdue.length ? `${overdue.length} overdue` : `${open.length} invoice${open.length === 1 ? '' : 's'} open`} to="/money" />
        <Kpi label="Buyers to message" value={String(toMessage)} sub={followUps ? `${followUps} follow-up${followUps === 1 ? '' : 's'} due` : `${talking} talking to you`} to="/buyers" />
        <Kpi label="Open jobs" value={String(savedJobs)} sub={openJobs.last ? 'saved tenders and requests' : 'tenders and buy requests'} to="/open-jobs" />
      </View>

      <View style={s.columns}>
        <View style={s.main}>
          <Panel title={`Machines · next ${BOARD_DAYS} days`} right={<Link label="+ Add job" onPress={() => router.push('/job')} />} flush>
            {views.length === 0 ? (
              <View style={{ padding: S.lg, gap: S.md }}>
                <Text style={s.body}>No machines yet. Add the ones on your floor and Aiventre keeps track of when each one is free.</Text>
                <Button label="Add machines" onPress={() => router.navigate('/machines')} />
              </View>
            ) : (
              <>
                <View style={s.days}>
                  {Array.from({ length: BOARD_DAYS }, (_, i) => (
                    <Text key={i} style={[s.day, i === 0 && { color: c.text, fontWeight: '800' }]}>
                      {parseDay(addDays(now, i)).getDate()}
                    </Text>
                  ))}
                </View>
                {views.map((v) => (
                  <View key={v.machine.id}>
                    <Rule />
                    <MachineRow view={v} />
                  </View>
                ))}
              </>
            )}
          </Panel>

          <Panel title="Buyers" right={<Link label="See all →" onPress={() => router.navigate('/buyers')} />}>
            <View style={s.tiles}>
              <Tile tone="blue" icon="paper-plane" value={toMessage} label="To message" basis="22%" />
              <Tile tone="green" icon="chatbubbles" value={talking} label="Talking to you" basis="22%" />
              <Tile tone="orange" icon="time" value={followUps} label="Follow up today" basis="22%" />
              <Tile tone="pink" icon="checkmark-done" value={won} label="Orders won" basis="22%" />
            </View>
            {topLeads.length === 0 ? (
              <Text style={s.body}>No buyers yet. Use Find work on a free machine, or ask Aiventre — it finds real companies and writes the first message.</Text>
            ) : (
              <View style={s.inner}>
                {topLeads.map((l, i) => (
                  <View key={l.id}>
                    {i > 0 && <Rule />}
                    <LeadRow lead={l} />
                  </View>
                ))}
              </View>
            )}
          </Panel>
        </View>

        <View style={s.side}>
          <FreeHighlight views={views} />
          <NeedsYou views={views} />

          <Panel title="Money" right={<Link label="Open →" onPress={() => router.navigate('/money')} />}>
            <View style={{ gap: 2 }}>
              <Text style={s.meta}>To collect</Text>
              <Text style={s.money}>{inr(toCollect)}</Text>
            </View>
            {open.slice(0, 4).map((i) => {
              const st = invoiceState(i, now);
              return (
                <Press key={i.id} label={i.buyer.name} scale={0.99} style={s.invoice} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: i.id } })}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.strong} numberOfLines={1}>
                      {i.buyer.name}
                    </Text>
                    <StatusPill status={st.tone} text={st.label} />
                  </View>
                  <Text style={s.amount}>{inr(balance(i))}</Text>
                </Press>
              );
            })}
            <Button label="New invoice" icon="add" kind="secondary" small onPress={() => router.push('/invoice/edit')} />
          </Panel>

          <Press onPress={() => router.push('/expert')} scale={0.98} label="Machine expert" style={s.expert}>
            <View style={s.expertIcon}>
              <Ionicons name="construct" size={20} color="#15171c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.expertTitle}>Machine expert</Text>
              <Text style={s.expertSub}>Tools, feeds and speeds, alarms — ask, or send a photo.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.onPrimary} />
          </Press>
        </View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, flexWrap: 'wrap' },
  title: { ...type.title, fontSize: 34, color: c.text },
  meta: { ...type.meta, color: c.muted },
  body: { ...type.body, color: c.muted },
  strong: { ...type.strong, color: c.text },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  kpiWrap: { flexGrow: 1, flexBasis: 200 },
  kpi: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 108 },
  kpiLabel: { ...type.meta, fontWeight: '600', color: c.muted },
  kpiValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: c.text, ...type.num },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: S.lg, alignItems: 'flex-start' },
  main: { flexGrow: 1.7, flexBasis: 560, gap: S.lg, minWidth: 0 },
  side: { flexGrow: 1, flexBasis: 320, gap: S.lg, minWidth: 0 },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: S.md },
  panelTitle: { ...type.heading, color: c.text },
  days: { flexDirection: 'row', gap: 3, paddingHorizontal: S.lg, paddingBottom: S.sm },
  day: { flex: 1, textAlign: 'center', fontSize: 12, color: c.faint, ...type.num },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inner: { marginHorizontal: -S.lg, marginBottom: -S.lg },
  money: { ...type.value, fontSize: 34, color: c.text },
  invoice: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 6 },
  amount: { ...type.strong, fontSize: 16, color: c.text, ...type.num },
  expert: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.primary, borderRadius: 24, padding: S.lg },
  expertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffc93c', alignItems: 'center', justifyContent: 'center' },
  expertTitle: { fontSize: 16, fontWeight: '800', color: c.onPrimary },
  expertSub: { ...type.meta, color: c.onPrimary, opacity: 0.75 },
}));
