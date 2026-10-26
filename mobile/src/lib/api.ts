import { getPrefs, setAccessCode } from './prefs';

/**
 * Calls to Aiventre's server (the same one the website uses). The Claude key lives
 * only on the server; the phone sends the access code so strangers can't spend credits.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://aiventre.vercel.app').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': getPrefs().accessCode },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach Aiventre. Check your internet and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Wrong or changed code: forget it so the app asks again.
    setAccessCode('');
    throw new ApiError(401, 'That access code didn’t work. Enter it again.');
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
  message: string;
};

export const requestBuyers = (body: unknown) => post<{ buyers: BuyerResult[]; summary: string }>('/api/find-work', body);
