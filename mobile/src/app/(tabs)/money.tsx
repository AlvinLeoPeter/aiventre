import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Box, Button, Press, Rule, Screen, Section, Segmented, StatusPill } from '@/components/ui';
import { balance, dmy, invoiceState, invoiceTotals, lastMonth, shareMonthCsv, thisMonth, unbilledJobs } from '@/lib/invoice';
import { jobLabel } from '@/lib/model';
import { inr } from '@/lib/quote';
import { useData } from '@/lib/store';
import { makeStyles, S, type, useTheme } from '@/lib/theme';

type Filter = 'open' | 'paid' | 'all';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Money: every invoice, who still owes what, and the monthly list for the accountant. */
export default function MoneyScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const [filter, setFilter] = useState<Filter>('open');
  const [error, setError] = useState('');

  const invoices = data.invoices ?? [];
  const live = invoices.filter((i) => !i.cancelled);
  const states = new Map(invoices.map((i) => [i.id, invoiceState(i)]));
  const toCollect = live.reduce((sum, i) => sum + balance(i), 0);
  const overdue = live.filter((i) => states.get(i.id)!.key === 'overdue');
  const month = thisMonth();
  const billedThisMonth = live.filter((i) => i.date.startsWith(month)).reduce((sum, i) => sum + invoiceTotals(i).total, 0);
  const unbilled = unbilledJobs(data);

  const shown = invoices
    .filter((i) => {
      const k = states.get(i.id)!.key;
      return filter === 'all' || (filter === 'paid' ? k === 'paid' : k !== 'paid' && k !== 'cancelled');
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));

  const csv = (m: string) => {
    setError('');
    shareMonthCsv(invoices, m, data.shop!.name).catch((e) => setError((e as Error).message));
  };

  return (
    <Screen title="Money">
      <Box style={{ gap: S.sm }}>
        <Text style={s.meta}>To collect</Text>
        <Text style={s.price}>{inr(toCollect)}</Text>
        {overdue.length > 0 && (
          <View style={s.between}>
            <Text style={[s.strong, { color: c.idle }]}>Overdue · {overdue.length}</Text>
            <Text style={[s.strong, type.num, { color: c.idle }]}>{inr(overdue.reduce((sum, i) => sum + balance(i), 0))}</Text>
          </View>
        )}
        <View style={s.between}>
          <Text style={s.meta}>Billed in {monthName(month)}</Text>
          <Text style={[s.meta, type.num]}>{inr(billedThisMonth)}</Text>
        </View>
      </Box>

      <Button label="New invoice" icon="add" onPress={() => router.push('/invoice/edit')} />

      {unbilled.length > 0 && (
        <Box style={{ borderColor: c.soon }}>
          <Text style={s.strong}>
            {unbilled.length} finished job{unbilled.length === 1 ? '' : 's'} not billed yet
          </Text>
          <Text style={s.meta}>{unbilled.slice(0, 3).map((j) => `${jobLabel(j)}${j.customer ? ` (${j.customer})` : ''}`).join(', ')}</Text>
          <Button
            label="Bill them"
            kind="secondary"
            small
            onPress={() => {
              // One invoice per customer: start with the first customer's jobs.
              const first = unbilled[0].customer;
              const ids = unbilled.filter((j) => j.customer === first).map((j) => j.id);
              router.push({ pathname: '/invoice/edit', params: { jobIds: ids.join(',') } });
            }}
          />
        </Box>
      )}

      {invoices.length > 0 && (
        <>
          <Segmented
            options={[
              { value: 'open', label: 'To collect' },
              { value: 'paid', label: 'Paid' },
              { value: 'all', label: 'All' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {shown.length === 0 ? (
            <Text style={s.meta}>{filter === 'open' ? 'Nothing waiting — everyone has paid.' : 'No invoices here yet.'}</Text>
          ) : (
            <Box flush>
              {shown.map((inv, i) => {
                const st = states.get(inv.id)!;
                return (
                  <View key={inv.id}>
                    {i > 0 && <Rule />}
                    <Press onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: inv.id } })} scale={0.99} style={s.row}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.strong} numberOfLines={1}>
                          {inv.buyer.name}
                        </Text>
                        <Text style={s.meta}>
                          {inv.number} · {dmy(inv.date)}
                        </Text>
                        <StatusPill status={st.tone} text={st.label} />
                      </View>
                      <Text style={[s.amount, inv.cancelled && { textDecorationLine: 'line-through', color: c.faint }]}>
                        {inr(st.key === 'paid' || inv.cancelled ? invoiceTotals(inv).total : balance(inv))}
                      </Text>
                    </Press>
                  </View>
                );
              })}
            </Box>
          )}

          <Section title="For your accountant" />
          <Text style={[s.meta, { marginTop: -S.sm }]}>A spreadsheet of the month’s invoices with each tax — what they need to file GSTR-1.</Text>
          <View style={s.buttons}>
            <Button label={monthName(month)} icon="document-outline" kind="secondary" small flex onPress={() => csv(month)} />
            <Button label={monthName(lastMonth())} icon="document-outline" kind="secondary" small flex onPress={() => csv(lastMonth())} />
          </View>
          {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
        </>
      )}

      <Text style={s.meta}>
        Invoices follow GST rules for shops under ₹5 crore turnover. Above that, the government’s e-invoice portal (IRN) is needed, which
        Aiventre doesn’t do yet.
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  price: { ...type.value, fontSize: 38, letterSpacing: -1.2, color: c.text },
  amount: { ...type.strong, fontSize: 16, color: c.text, ...type.num },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12 },
  buttons: { flexDirection: 'row', gap: S.sm },
}));
