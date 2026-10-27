import { post, type PlanItem } from './api';
import type { Data } from './model';

/** Finding where to buy the tools and material a job needs (api/source.js). */

export type Need = { kind: 'tool' | 'material'; item: string; qty: string; context?: string; materialType?: string };

export type Offer = {
  need: number;
  supplier: string;
  product: string;
  price: number; // 0 = not shown on their page
  unit: string;
  gst: 'included' | 'extra' | 'not_stated';
  min_order: string;
  city: string;
  distance_km: number;
  url: string;
  website: string;
  phone: string;
  email: string;
  kind: 'online_store' | 'distributor' | 'local_dealer' | 'manufacturer' | 'marketplace' | 'price_list';
  note: string;
  check: { page: 'ok' | 'blocked' | 'broken' | 'none'; website: 'ok' | 'down' | 'none' | 'unchecked'; priceSeen: boolean };
};

export type SourcingResult = { offers: Offer[]; summary: string; tips: string[]; dropped: number };

export const KIND_LABEL: Record<Offer['kind'], string> = {
  online_store: 'Online store',
  distributor: 'Distributor',
  local_dealer: 'Local dealer',
  manufacturer: 'Manufacturer',
  marketplace: 'Marketplace',
  price_list: 'Market price',
};

export const requestSourcing = (data: Data, needs: Need[]) =>
  post<SourcingResult>('/api/source', {
    shop: { area: data.shop?.area, city: data.shop?.city, state: data.shop?.state, pincode: data.shop?.pincode },
    needs: needs.map(({ kind, item, qty, context }) => ({ kind, item, qty, context })),
  });

/** The tools and stock a quote plan calls for, one line each, with total quantities for the order. */
export function needsFromPlan(items: { item: PlanItem; qty: number }[]): Need[] {
  const tools = new Map<string, Need>();
  const materials = new Map<string, Need & { kg: number }>();
  for (const { item, qty } of items) {
    for (const m of item.materials) {
      const key = m.item.toLowerCase();
      const prev = materials.get(key);
      const kg = (prev?.kg ?? 0) + m.weight_kg_per_unit * qty;
      materials.set(key, { kind: 'material', item: m.item, qty: `about ${Math.ceil(kg)} kg`, kg, context: item.name, materialType: m.material_type });
    }
    for (const op of item.operations) {
      for (const t of op.tools) {
        const text = [t.tool, t.size, t.type].filter(Boolean).join(' ');
        const key = text.toLowerCase();
        if (!tools.has(key)) tools.set(key, { kind: 'tool', item: text, qty: '', context: `${op.step} — ${item.material}` });
      }
    }
  }
  return [...[...materials.values()].map(({ kg: _kg, ...n }) => n), ...tools.values()].slice(0, 12);
}

/* The quote screen hands its list over before opening the buy screen. The screen reads it while
   rendering (which can happen more than once before it settles) and clears it once it's on screen. */
let pending: Need[] | null = null;
export const setPendingNeeds = (n: Need[]) => {
  pending = n;
};
export const peekPendingNeeds = () => pending;
export const clearPendingNeeds = () => {
  pending = null;
};

/** A message asking a supplier for their best price. */
export function priceAsk(data: Data, offer: Offer, need: Need) {
  const s = data.shop!;
  return `Hello, this is ${s.owner} from ${s.name}, ${s.city}. Please share your best price for:\n${offer.product || need.item}${need.qty ? `\nQuantity: ${need.qty}` : ''}\n\nPrice with GST, delivery to ${s.city}${s.pincode ? ` ${s.pincode}` : ''}, and how soon you can supply. Thank you.`;
}
