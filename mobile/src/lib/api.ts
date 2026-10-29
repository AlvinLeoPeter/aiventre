import type { Checks, Data, Lead } from './model';
import { getPrefs, setAccessCode } from './prefs';
import { accessToken } from './supabase';

/**
 * Calls to Aiventre's server (the same one the website uses). The Claude key lives
 * only on the server; the phone sends the access code so strangers can't spend credits.
 */

// Opened on the Aiventre website (at /app), the server is the same site, so its own address
// works — including on preview deployments. The phone app always calls the live server.
const onSite = typeof window !== 'undefined' && typeof window.location?.pathname === 'string' && window.location.pathname.startsWith('/app');
export const API_URL = onSite ? '' : (process.env.EXPO_PUBLIC_API_URL || 'https://aiventre.vercel.app').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  const code = getPrefs().accessCode;
  // Signed in: the login token is enough (for approved emails). Otherwise the shared code.
  const token = await accessToken().catch(() => null);
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(code && { 'x-access-code': code }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach Aiventre. Check your internet and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Wrong or changed code: forget it so the app asks again.
    if (code) setAccessCode('');
    throw new ApiError(401, code ? 'That access code didn’t work. Enter it again.' : 'Sign in, or enter the access code: My shop → AI.');
  }
  if (!res.ok) throw new ApiError(res.status, data.error || `Something went wrong (${res.status}). Try again.`);
  return data as T;
}

export const runTask = <T>(task: string, input: unknown) => post<T>('/api/task', { task, input });

/* ---------------- quote from a drawing ---------------- */

export type QuoteEstimate = {
  part_summary: string;
  material: string;
  key_features: string[];
  critical_tolerances: string[];
  operations: { operation: string; machine: string; minutes_per_part: number }[];
  setup_minutes: number;
  fits_shop: 'yes' | 'maybe' | 'no';
  fit_reason: string;
  risks: string[];
  questions_for_buyer: string[];
  assumptions: string[];
};

export type Drawing = { name: string; mediaType: string; data: string };

/* ---------------- find work for a free machine ---------------- */

export type BuyerResult = {
  company: string;
  city: string;
  distance_km: number;
  industry: string;
  why_fit: string;
  website: string;
  phone: string;
  email: string;
  source_url: string;
  state?: string;
  gstin?: string;
  cin?: string;
  message: string;
  checks?: Checks | null;
};

export const requestBuyers = (body: unknown) =>
  post<{ buyers: BuyerResult[]; summary: string; dropped?: number; tooFar?: number }>('/api/find-work', body);

/** Re-checks buyers that didn't come from Find work (added by hand, saved by the assistant). No AI, no credits. */
export const requestChecks = (buyers: Lead[]) =>
  post<{ checks: (Checks | null)[] }>('/api/verify', {
    buyers: buyers.map((l) => ({
      company: l.company,
      website: l.website,
      source_url: l.sourceUrl,
      email: l.email,
      phone: l.phone,
      state: l.state,
      gstin: l.gstin,
      cin: l.cin,
    })),
  });

/* ---------------- what the AI is told about the shop and a buyer ---------------- */


export const shopForAI = (data: Data) => {
  const s = data.shop;
  return {
    shop_name: s?.name ?? '',
    owner: s?.owner ?? '',
    location: [s?.area, s?.city, s?.state].filter(Boolean).join(', '),
    summary: s?.summary ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    kinds_of_work: s?.work ?? [],
    machines: data.machines.map((m) => `${m.name} (${m.type}${m.details ? `, ${m.details}` : ''})`),
    capabilities: s?.capabilities ?? [],
    materials: s?.materials ?? [],
    industries: s?.industries ?? [],
    certifications: s?.certifications ?? [],
    hour_rate: s?.rate ?? null,
  };
};

export const buyerForAI = (l: Lead) => ({
  company: l.company,
  city: l.city,
  industry: l.industry,
  website: l.website,
  why_fit: l.whyFit,
  contact_role: l.contactRole,
  status: l.status,
  notes: l.notes,
  recent_history: l.history.slice(-6).map((h) => h.text),
  last_message_sent: l.message,
});

/** What the AI reads out of the owner's own description of the shop. */
export type SetupResult = {
  shop_name: string;
  owner_name: string;
  area: string;
  city: string;
  state: string;
  work: string[];
  machines: { type: string; count: number; details: string }[];
  summary: string;
  phone: string;
  email: string;
  capabilities: string[];
  materials: string[];
  industries: string[];
  certifications: string[];
  missing: string[];
};

/* ---------------- quote 2.0: plan and price a drawing or RFQ ---------------- */

export type MaterialType = 'MS' | 'GI' | 'SS' | 'aluminium' | 'cast iron' | 'brass' | 'copper' | 'other';

export type PlanItem = {
  name: string;
  drawing_no: string;
  quantity: number;
  material: string;
  finish: string;
  size: string;
  fits_shop: 'yes' | 'maybe' | 'no';
  fit_reason: string;
  capacity: { need: string; machine: string; status: 'ok' | 'check' | 'missing'; why: string }[];
  materials: { item: string; material_type: MaterialType; quantity_per_unit: string; weight_kg_per_unit: number }[];
  operations: {
    step: string;
    process: string;
    machine: string;
    tools: { tool: string; size: string; type: string; why: string }[];
    setup_minutes: number;
    minutes_per_part: number;
    outsourced_cost_per_part: number;
  }[];
  process_choice: { chosen: string; reason: string; alternatives: { process: string; why_not: string }[] };
  safety_critical: boolean;
  safety_note: string;
  risks: string[];
  questions_for_buyer: string[];
  assumptions: string[];
};

export type QuotePlan = { rfq_summary: string; items: PlanItem[] };
