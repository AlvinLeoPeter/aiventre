import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { MaterialType, PlanItem } from './api';
import type { Data, Machine } from './model';

/**
 * Turning the AI's plan into money. The AI only estimates material and time; every rate
 * here is the owner's, and every number can be changed on screen.
 */

export const DEFAULT_RATE = 800;
export const GST = 0.18;

// Rough Indian market prices per kg, as a starting point only — the owner sets today's.
export const MATERIAL_RATES: Record<MaterialType, number> = {
  MS: 65,
  GI: 75,
  SS: 250,
  aluminium: 300,
  'cast iron': 80,
  brass: 550,
  copper: 850,
  other: 100,
};

export const inr = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const isOutsourced = (op: PlanItem['operations'][number]) => /outsourc/i.test(op.machine) || op.outsourced_cost_per_part > 0;

/** The hour rate for a step: that machine's own rate if set, else the shop's. */
export function rateFor(machineName: string, machines: Machine[], shopRate: number) {
  const n = machineName.toLowerCase();
  const m = machines.find((x) => x.name.toLowerCase() === n) ?? machines.find((x) => n.includes(x.type.toLowerCase()) || x.type.toLowerCase().includes(n));
  return m?.rate || shopRate;
}

export type Edits = { qty: number; minutes: number[] };
export type Rates = { shopRate: number; margin: number; materials: Record<string, number> };

/** Cost and price of one item, per unit and for the quantity. */
export function priceItem(item: PlanItem, edit: Edits, rates: Rates, machines: Machine[]) {
  const qty = Math.max(1, edit.qty);
  const material = item.materials.reduce((sum, m) => sum + m.weight_kg_per_unit * (rates.materials[m.material_type] ?? MATERIAL_RATES[m.material_type] ?? 0), 0);
  let machining = 0;
  let outsourced = 0;
  let minutes = 0;
  item.operations.forEach((op, i) => {
    if (isOutsourced(op)) {
      outsourced += op.outsourced_cost_per_part;
      return;
    }
    const perPart = (edit.minutes[i] ?? op.minutes_per_part) + op.setup_minutes / qty;
    minutes += perPart;
    machining += (perPart / 60) * rateFor(op.machine, machines, rates.shopRate);
  });
  const cost = material + machining + outsourced;
  // Quotations show the unit rate, so the amount must be exactly rate × quantity.
  const unitPrice = Math.round(cost * (1 + rates.margin / 100) * 100) / 100;
  return { qty, material, machining, outsourced, minutes, cost, unitPrice, total: unitPrice * qty };
}

const esc = (s = '') => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export type QuoteLine = { item: PlanItem; qty: number; unitPrice: number; total: number };

/** A plain one-page quotation the buyer can file: who, what, how much, on what terms. */
function quotationHtml(data: Data, lines: QuoteLine[], opts: { customer: string; gst: boolean }) {
  const s = data.shop!;
  const now = new Date();
  const no = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const tax = opts.gst ? subtotal * GST : 0;
  const from = [s.area, s.city, s.state, s.pincode].filter(Boolean).join(', ');
  const contact = [s.phone, s.email].filter(Boolean).join(' · ');

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { margin: 16mm; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; font-size: 12px; line-height: 1.45; margin: 0; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 18px; margin: 0; text-align: right; }
  .muted { color: #5f6368; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; margin-top: 12px; }
  th { text-align: left; color: #5f6368; font-weight: 500; border-bottom: 1px solid #ccc; padding: 6px 4px; }
  td { border-bottom: 1px solid #eee; padding: 7px 4px; vertical-align: top; }
  .r { text-align: right; }
  .totals td { border: none; padding: 3px 4px; }
  .grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 6px; }
  .terms { margin-top: 22px; }
</style></head><body>
<div class="head">
  <div><h1>${esc(s.name)}</h1><div class="muted">${esc(from)}</div><div class="muted">${esc(contact)}</div>${s.gstin ? `<div class="muted">GSTIN ${esc(s.gstin)}</div>` : ''}</div>
  <div><h2>Quotation</h2><div class="muted r">${no}</div><div class="muted r">${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
</div>
${opts.customer ? `<div><span class="muted">To</span><br><strong>${esc(opts.customer)}</strong></div>` : ''}
<table>
  <tr><th>#</th><th>Item</th><th>Material / finish</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
  ${lines
    .map(
      (l, i) => `<tr><td>${i + 1}</td><td><strong>${esc(l.item.name)}</strong>${l.item.drawing_no ? `<br><span class="muted">Drg ${esc(l.item.drawing_no)}</span>` : ''}</td>
  <td>${esc(l.item.material)}${l.item.finish ? `<br><span class="muted">${esc(l.item.finish)}</span>` : ''}</td>
  <td class="r">${l.qty}</td><td class="r">${inr(l.unitPrice)}</td><td class="r">${inr(l.total)}</td></tr>`,
    )
    .join('')}
</table>
<table class="totals">
  <tr><td class="r" style="width:80%">Subtotal</td><td class="r">${inr(subtotal)}</td></tr>
  ${opts.gst ? `<tr><td class="r">GST 18%</td><td class="r">${inr(tax)}</td></tr>` : ''}
  <tr class="grand"><td class="r">Total</td><td class="r">${inr(subtotal + tax)}</td></tr>
</table>
<div class="terms muted">
  <strong style="color:#111">Terms</strong><br>
  Valid for 15 days. ${opts.gst ? 'GST included as shown.' : 'GST extra as applicable.'} Transport and packing extra unless stated.<br>
  Delivery and payment terms to be confirmed on order. Prices are based on the drawings received; changes to drawings may change the price.
</div>
</body></html>`;
}

export async function shareQuotation(data: Data, lines: QuoteLine[], opts: { customer: string; gst: boolean }) {
  const html = quotationHtml(data, lines, opts);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Send the quotation' });
}
