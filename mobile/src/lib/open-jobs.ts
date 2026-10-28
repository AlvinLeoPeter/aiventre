import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, post } from './api';
import { daysBetween, today } from './model';
import { bookDeadline, cancelReminder } from './notify';
import { getData } from './store';

/**
 * "Open jobs": work buyers have already posted — tenders and buy requirements — that is
 * still open (api/open-jobs.js). The latest results and the jobs the owner saved live on this
 * phone; a saved job gets a reminder before it closes.
 */

export type OpenJob = {
  id: string;
  title: string;
  buyer: string;
  kind: 'tender' | 'buy_requirement' | 'rfq';
  portal: string;
  url: string;
  reference: string;
  location: string;
  state: string;
  quantity: string;
  material: string;
  closing_date: string; // YYYY-MM-DD or ''
  estimated_value_inr: number;
  emd_inr: number;
  fit: 'good' | 'maybe';
  why_fit: string;
  to_apply: string[];
  check?: { page: 'ok' | 'blocked' | 'broken' | 'none' };
  foundAt: string;
  saved: boolean;
  reminderId: string | null;
};

export type SearchResult = { at: string; summary: string; next_steps: string[]; widened: boolean; can_widen?: boolean; dropped: number; found: number };
type State = { jobs: OpenJob[]; seen: string[]; last: SearchResult | null; busy: boolean; error: string };

const KEY = 'aiventre:openjobs';
let state: State = { jobs: [], seen: [], last: null, busy: false, error: '' };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  const { jobs, seen, last } = state;
  AsyncStorage.setItem(KEY, JSON.stringify({ jobs, seen, last })).catch(() => {});
}

export async function loadOpenJobs() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved) state = { ...state, jobs: saved.jobs ?? [], seen: saved.seen ?? [], last: saved.last ?? null };
  } catch {
    // Start empty.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useOpenJobs = () => useSyncExternalStore(subscribe, () => state, () => state);

/** Days until it closes: 0 = today, negative = closed, null = no date given. */
export const daysLeft = (j: OpenJob, now = today()) => (/^\d{4}-\d{2}-\d{2}$/.test(j.closing_date) ? daysBetween(now, j.closing_date) : null);

/** `india`: a follow-up search of the rest of India, added to the results already shown. */
export async function searchOpenJobs(focus = '', scope: 'state' | 'india' = 'state') {
  if (state.busy) return;
  const d = getData();
  if (!d.shop) return;
  set({ busy: true, error: '' });
  try {
    const known = [...new Set([...state.jobs.map((j) => j.url), ...state.seen])].slice(-150);
    const r = await post<Omit<SearchResult, 'at' | 'found'> & { jobs: Omit<OpenJob, 'id' | 'foundAt' | 'saved' | 'reminderId'>[] }>('/api/open-jobs', {
      shop: {
        name: d.shop.name,
        area: d.shop.area,
        city: d.shop.city,
        state: d.shop.state,
        work: d.shop.work,
        materials: d.shop.materials,
        gstin: d.shop.gstin,
        udyam: d.shop.udyam,
        machines: d.machines.filter((m) => !m.maintenance).map((m) => ({ name: m.name, type: m.type, details: m.details })),
      },
      focus,
      scope,
      known,
      today: today(),
    });
    const urls = new Set(state.jobs.map((j) => j.url));
    const fresh: OpenJob[] = r.jobs
      .filter((j) => !urls.has(j.url))
      .map((j) => ({ ...j, id: Math.random().toString(36).slice(2, 10), foundAt: today(), saved: false, reminderId: null }));
    // A new search replaces the results the owner didn't save (saved jobs stay until they close);
    // searching the rest of India adds to what's on screen.
    const widening = scope === 'india';
    const kept = state.jobs.filter((j) => (widening || j.saved) && (daysLeft(j) ?? 0) >= 0);
    const replaced = widening ? [] : state.jobs.filter((j) => !j.saved).map((j) => j.url);
    set({
      jobs: [...fresh, ...kept],
      seen: [...state.seen, ...replaced].slice(-200),
      last: {
        at: new Date().toISOString(),
        summary: r.summary,
        next_steps: r.next_steps,
        widened: r.widened,
        can_widen: r.can_widen,
        dropped: r.dropped,
        found: fresh.length + (widening ? (state.last?.found ?? 0) : 0),
      },
      busy: false,
    });
  } catch (e) {
    set({ busy: false, error: e instanceof ApiError ? e.message : 'Something went wrong. Try again.' });
  }
}

export async function toggleSaved(id: string) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  if (job.saved) {
    await cancelReminder(job.reminderId);
    set({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, saved: false, reminderId: null } : j)) });
    return;
  }
  set({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, saved: true } : j)) });
  const reminderId = job.closing_date ? await bookDeadline(job.title, job.closing_date) : null;
  if (reminderId) set({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, reminderId } : j)) });
}

/** "Not for me": gone from the list, and not shown again. */
export function dismissJob(id: string) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  cancelReminder(job.reminderId);
  set({ jobs: state.jobs.filter((j) => j.id !== id), seen: [...state.seen, job.url].slice(-200) });
}

/** What the quote screen starts from when the owner taps "Quote this". */
export const quoteNotes = (j: OpenJob) =>
  [
    j.title,
    j.quantity && `Quantity: ${j.quantity}`,
    j.material && `Material: ${j.material}`,
    `Buyer: ${j.buyer}${j.location ? `, ${j.location}` : ''}`,
    j.closing_date && `Closes ${j.closing_date}`,
    j.reference && `Ref ${j.reference}`,
  ]
    .filter(Boolean)
    .join('. ');

/** The shop is being replaced (reset, sample shop): its searches go too. */
export function clearOpenJobs() {
  state.jobs.forEach((j) => cancelReminder(j.reminderId));
  set({ jobs: [], seen: [], last: null, error: '' });
}
