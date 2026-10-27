import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { inr } from './quote';
import { addDays, type Data, daysBetween, type Invoice, type InvoiceLine, type Job, parseDay, type Shop, type Status, today } from './model';

/**
 * GST invoices for job work. The rules followed (CGST Rules, rule 46):
 * - one number series per financial year (April–March), unique, at most 16 characters;
 * - CGST + SGST when the buyer is in the shop's state, IGST when they're in another one;
 * - HSN/SAC on every line: 4 digits is enough for shops under ₹5 crore turnover;
 * - e-invoicing (IRN) is only required above ₹5 crore, which this doesn't do.
 * Job work on a buyer's material is a service: SAC 9988, usually 18%.
 */

export const DEFAULT_SAC = '9988';
export const DEFAULT_GST = 18;
export const GST_RATES = [18, 5, 0];
export const PAY_DAYS = [0, 15, 30, 45, 60];
export const UNITS = ['Nos', 'kg', 'hr', 'set', 'm'];

export const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** GSTIN: 2-digit state + PAN + entity + 'Z' + a check character computed from the rest. */
export function validGstin(id: string) {
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(id) || !GST_STATES[id.slice(0, 2)]) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = ALNUM.indexOf(id[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return ALNUM[(36 - (sum % 36)) % 36] === id[14];
}

const plain = (s = '') => s.toLowerCase().replace(/[^a-z]/g, '');

/** The GST state code: from the GSTIN when there is one, else from the state's name. '' when unknown. */
export function stateCode(gstin = '', state = '') {
  const fromId = gstin.trim().slice(0, 2);
  if (/^\d{2}$/.test(fromId) && GST_STATES[fromId]) return fromId;
  const n = plain(state);
  if (!n) return '';
  const aliases: Record<string, string> = { tn: '33', orissa: '21', pondicherry: '34', bombay: '27', ap: '37', up: '09', mp: '23', jk: '01', newdelhi: '07' };
  if (aliases[n]) return aliases[n];
  return Object.entries(GST_STATES).find(([, name]) => plain(name) === n || plain(name).startsWith(n) || n.startsWith(plain(name)))?.[0] ?? '';
}

export const stateLabel = (code: string) => (GST_STATES[code] ? `${GST_STATES[code]} (${code})` : '');

/* ---------------- numbers and dates ---------------- */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "25-26" for any day from 1 April 2025 to 31 March 2026. */
export function financialYear(day: string) {
  const d = parseDay(day);
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** The next number in this financial year's series, counting cancelled ones (their numbers stay used). */
export function nextInvoiceNumber(invoices: Invoice[], day: string) {
  const prefix = `INV/${financialYear(day)}/`;
  const last = invoices.filter((i) => i.number.startsWith(prefix)).reduce((max, i) => Math.max(max, Number(i.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

/** "27-10-2026", the way Indian invoices write dates. */
export const dmy = (day: string) => day.split('-').reverse().join('-');

/** Reads "27-10-2026", "27/10/26" or "27.10.2026"; null when it isn't a real date. */
export function parseDmy(text: string) {
  const m = /^\s*(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})\s*$/.exec(text);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------------- tax ---------------- */

export const lineAmount = (l: InvoiceLine) => round2(l.qty * l.rate);

/** Taxable value, each tax, and the total rounded to the rupee (the round-off is shown, as is usual). */
export function invoiceTotals(inv: Pick<Invoice, 'lines' | 'gstRate' | 'inter'>) {
  const taxable = round2(inv.lines.reduce((sum, l) => sum + lineAmount(l), 0));
  const igst = inv.inter ? round2((taxable * inv.gstRate) / 100) : 0;
  const cgst = inv.inter ? 0 : round2((taxable * inv.gstRate) / 200);
  const sgst = cgst;
  const exact = round2(taxable + igst + cgst + sgst);
  const total = Math.round(exact);
  return { taxable, cgst, sgst, igst, tax: round2(igst + cgst + sgst), roundOff: round2(total - exact), total };
}

export const received = (inv: Invoice) => round2(inv.payments.reduce((sum, p) => sum + p.amount, 0));
export const balance = (inv: Invoice) => (inv.cancelled ? 0 : Math.max(0, round2(invoiceTotals(inv).total - received(inv))));

export type InvoiceState = { key: 'paid' | 'part' | 'due' | 'overdue' | 'cancelled'; label: string; tone: Status };

export function invoiceState(inv: Invoice, now = today()): InvoiceState {
  if (inv.cancelled) return { key: 'cancelled', label: 'Cancelled', tone: 'maintenance' };
  const left = balance(inv);
  // Within a rupee counts as paid: banks and UPI apps round.
  if (left < 1) return { key: 'paid', label: 'Paid', tone: 'running' };
  const late = daysBetween(inv.dueDate, now);
  if (late > 0) return { key: 'overdue', label: `Overdue ${late} day${late === 1 ? '' : 's'}`, tone: 'idle' };
  const part = received(inv) > 0;
  const when = late === 0 ? 'today' : `in ${-late} day${late === -1 ? '' : 's'}`;
  return { key: part ? 'part' : 'due', label: `${part ? 'Part paid · ' : ''}Due ${when}`, tone: 'soon' };
}

/** Finished jobs from the last month that aren't on any invoice yet. */
export function unbilledJobs(data: Data, now = today()): Job[] {
  const billed = new Set((data.invoices ?? []).filter((i) => !i.cancelled).flatMap((i) => i.lines.map((l) => l.jobId).filter(Boolean)));
  return data.jobs.filter((j) => j.status === 'done' && j.doneAt && daysBetween(j.doneAt, now) <= 30 && !billed.has(j.id));
}

/* ---------------- amount in words (Indian system) ---------------- */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const two = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const three = (n: number) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ''}` : two(n));

function words(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1000);
  const rest = n % 1000;
  return [crore && `${words(crore)} Crore`, lakh && `${two(lakh)} Lakh`, thousand && `${two(thousand)} Thousand`, rest && three(rest)].filter(Boolean).join(' ');
}

/** "Rupees One Lakh Twenty Thousand Five Hundred Only" */
export function amountInWords(amount: number) {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  return `Rupees ${words(rupees)}${paise ? ` and ${two(paise)} Paise` : ''} Only`;
}

/* ---------------- the invoice PDF ---------------- */

const esc = (s = '') => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const money = (n: number) => round2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const invoiceTitle = (inv: Invoice, shop: Shop) => (!shop.gstin ? 'Invoice' : inv.gstRate > 0 ? 'Tax Invoice' : 'Bill of Supply');

function invoiceHtml(inv: Invoice, shop: Shop) {
  const t = invoiceTotals(inv);
  const shopCode = stateCode(shop.gstin, shop.state);
  const from = [shop.address, shop.area, shop.city, shop.pincode].filter(Boolean).join(', ');
  const contact = [shop.phone, shop.email].filter(Boolean).join(' · ');
  const b = inv.buyer;
  const bank = shop.bank;
  const half = inv.gstRate / 2;
  const taxRows = inv.gstRate
    ? inv.inter
      ? `<tr><td>IGST ${inv.gstRate}%</td><td class="r">${money(t.igst)}</td></tr>`
      : `<tr><td>CGST ${half}%</td><td class="r">${money(t.cgst)}</td></tr><tr><td>SGST ${half}%</td><td class="r">${money(t.sgst)}</td></tr>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { margin: 14mm; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; font-size: 11.5px; line-height: 1.45; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 17px; margin: 0; text-align: right; }
  .muted { color: #5f6368; }
  .r { text-align: right; }
  .parties { display: flex; gap: 16px; margin: 12px 0; }
  .parties > div { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; }
  .k { color: #5f6368; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .items th { text-align: left; color: #5f6368; font-weight: 500; border-bottom: 1px solid #bbb; padding: 6px 4px; }
  .items th.r { text-align: right; }
  .items td { border-bottom: 1px solid #eee; padding: 6px 4px; vertical-align: top; }
  .sum { width: 46%; margin-left: auto; margin-top: 8px; }
  .sum td { padding: 3px 4px; }
  .grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 6px; }
  .words { margin-top: 8px; }
  .foot { display: flex; justify-content: space-between; gap: 16px; margin-top: 18px; }
  .sign { text-align: right; min-width: 200px; }
  .sign .line { margin-top: 42px; border-top: 1px solid #999; padding-top: 4px; }
</style></head><body>
<div class="top">
  <div>
    <h1>${esc(shop.name)}</h1>
    ${from ? `<div class="muted">${esc(from)}</div>` : ''}
    <div class="muted">${esc(stateLabel(shopCode) || shop.state || '')}</div>
    ${contact ? `<div class="muted">${esc(contact)}</div>` : ''}
    ${shop.gstin ? `<div><strong>GSTIN ${esc(shop.gstin)}</strong></div>` : ''}
  </div>
  <div>
    <h2>${invoiceTitle(inv, shop)}</h2>
    <div class="r muted">Original for recipient</div>
    <div class="r"><strong>${esc(inv.number)}</strong></div>
    <div class="r">Date ${dmy(inv.date)}</div>
    ${inv.dueDate !== inv.date ? `<div class="r muted">Due ${dmy(inv.dueDate)}</div>` : ''}
  </div>
</div>
<div class="parties">
  <div>
    <div class="k">Billed to</div>
    <strong>${esc(b.name)}</strong>
    ${b.address ? `<div>${esc(b.address)}</div>` : ''}
    ${b.gstin ? `<div>GSTIN ${esc(b.gstin)}</div>` : '<div class="muted">Unregistered</div>'}
    <div class="muted">State: ${esc(stateLabel(inv.placeOfSupply) || b.state)}</div>
  </div>
  <div>
    <div class="k">Details</div>
    <div>Place of supply: ${esc(stateLabel(inv.placeOfSupply) || b.state || '—')}</div>
    <div>Reverse charge: No</div>
    ${inv.ref ? `<div>Ref: ${esc(inv.ref)}</div>` : ''}
  </div>
</div>
<table class="items">
  <tr><th>#</th><th>Description</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Rate ₹</th><th class="r">Amount ₹</th></tr>
  ${inv.lines
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${esc(l.hsn)}</td><td class="r">${l.qty} ${esc(l.unit)}</td><td class="r">${money(l.rate)}</td><td class="r">${money(lineAmount(l))}</td></tr>`,
    )
    .join('')}
</table>
<table class="sum">
  <tr><td>Taxable value</td><td class="r">${money(t.taxable)}</td></tr>
  ${taxRows}
  ${t.roundOff ? `<tr><td class="muted">Round off</td><td class="r muted">${t.roundOff > 0 ? '+' : ''}${money(t.roundOff)}</td></tr>` : ''}
  <tr class="grand"><td>Total</td><td class="r">₹${money(t.total)}</td></tr>
</table>
<div class="words"><span class="k">Amount in words</span><br><strong>${amountInWords(t.total)}</strong></div>
${inv.gstRate && t.tax ? `<div class="muted">Tax in words: ${amountInWords(t.tax)}</div>` : ''}
${!shop.gstin ? '<div class="muted">Supplier not registered under GST — no GST charged.</div>' : ''}
<div class="foot">
  <div>
    ${
      bank && (bank.account || bank.upi)
        ? `<div class="k">Pay to</div>
    ${bank.account ? `<div>${esc(bank.name)} · A/c ${esc(bank.account)}${bank.ifsc ? ` · IFSC ${esc(bank.ifsc)}` : ''}</div>` : ''}
    ${bank.upi ? `<div>UPI: ${esc(bank.upi)}</div>` : ''}`
        : ''
    }
    ${inv.notes ? `<div style="margin-top:6px">${esc(inv.notes)}</div>` : ''}
  </div>
  <div class="sign"><div>For ${esc(shop.name)}</div><div class="line muted">Authorised signatory</div></div>
</div>
</body></html>`;
}

export async function shareInvoice(inv: Invoice, shop: Shop) {
  const html = invoiceHtml(inv, shop);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Invoice ${inv.number}` });
}

/** A short, polite WhatsApp reminder. */
export function reminderText(inv: Invoice, shop: Shop, now = today()) {
  const left = balance(inv);
  const late = daysBetween(inv.dueDate, now);
  const pay = shop.bank?.upi ? `\nUPI: ${shop.bank.upi}` : shop.bank?.account ? `\nA/c ${shop.bank.account}, IFSC ${shop.bank.ifsc}` : '';
  return `Dear Sir/Madam,\n\nThis is a gentle reminder that ${inr(left)} is ${late > 0 ? 'pending' : 'due'} against our invoice ${inv.number} dated ${dmy(inv.date)}${
    late > 0 ? ` (due on ${dmy(inv.dueDate)})` : late === 0 ? ', due today' : `, due on ${dmy(inv.dueDate)}`
  }. Kindly arrange the payment.${pay}\n\nThank you,\n${shop.owner}\n${shop.name}`;
}

/* ---------------- for the accountant ---------------- */

const csvCell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** One row per invoice in a month, with each tax — what the accountant needs for GSTR-1. */
export function monthCsv(invoices: Invoice[], month: string) {
  const head = ['Invoice no', 'Date', 'Buyer', 'Buyer GSTIN', 'Place of supply', 'Taxable value', 'GST %', 'CGST', 'SGST', 'IGST', 'Round off', 'Invoice total', 'Received', 'Status'];
  const rows = invoices
    .filter((i) => i.date.startsWith(month))
    .sort((a, b) => a.number.localeCompare(b.number))
    .map((i) => {
      const t = invoiceTotals(i);
      return i.cancelled
        ? [i.number, dmy(i.date), i.buyer.name, i.buyer.gstin, stateLabel(i.placeOfSupply), 0, i.gstRate, 0, 0, 0, 0, 0, 0, 'Cancelled']
        : [i.number, dmy(i.date), i.buyer.name, i.buyer.gstin, stateLabel(i.placeOfSupply), t.taxable, i.gstRate, t.cgst, t.sgst, t.igst, t.roundOff, t.total, received(i), invoiceState(i).label];
    });
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export const thisMonth = (now = today()) => now.slice(0, 7);
export const lastMonth = (now = today()) => addDays(`${now.slice(0, 7)}-01`, -1).slice(0, 7);

export async function shareMonthCsv(invoices: Invoice[], month: string, shopName: string) {
  const name = `invoices-${month}.csv`;
  const text = monthCsv(invoices, month);
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `${shopName} — invoices ${month}` });
}

/* ---------------- starting an invoice from somewhere else ---------------- */

export type InvoiceDraft = { buyerName?: string; lines?: InvoiceLine[] };
let draft: InvoiceDraft | null = null;

/** The quote screen hands its lines over before opening the invoice editor, which clears them once shown. */
export const setInvoiceDraft = (d: InvoiceDraft) => {
  draft = d;
};
export const peekInvoiceDraft = () => draft;
export const clearInvoiceDraft = () => {
  draft = null;
};
