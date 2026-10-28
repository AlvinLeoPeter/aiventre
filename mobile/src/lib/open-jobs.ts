import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, post } from './api';
import { getSession } from './auth';
import { daysBetween, today } from './model';
import { bookDeadline, cancelReminder, notifyNow } from './notify';
import { getPrefs, setPrefs } from './prefs';
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

// Searches wait for the saved list, so an early automatic check can't overwrite it.
let loaded: Promise<void> = Promise.resolve();

export function loadOpenJobs() {
  loaded = (async () => {
    try {
      const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
      if (saved) state = { ...state, jobs: saved.jobs ?? [], seen: saved.seen ?? [], last: saved.last ?? null };
    } catch {
      // Start empty.
    }
    listeners.forEach((l) => l());
  })();
  return loaded;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useOpenJobs = () => useSyncExternalStore(subscribe, () => state, () => state);

/** Days until it closes: 0 = today, negative = closed, null = no date given. */
export const daysLeft = (j: OpenJob, now = today()) => (/^\d{4}-\d{2}-\d{2}$/.test(j.closing_date) ? daysBetween(now, j.closing_date) : null);

/**
 * Searches and shows the results; returns the jobs that are new to this phone, or null if it
 * couldn't search. `india`: a follow-up search of the rest of India, added to what's shown.
 * `quiet`: an automatic check, which doesn't put its errors on screen.
 */
export async function searchOpenJobs(focus = '', scope: 'state' | 'india' = 'state', quiet = false): Promise<OpenJob[] | null> {
  await loaded;
  if (state.busy) return null;
  const d = getData();
  if (!d.shop) return null;
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
    return fresh;
  } catch (e) {
    set({ busy: false, error: quiet ? '' : e instanceof ApiError ? e.message : 'Something went wrong. Try again.' });
    return null;
  }
}

/* ---------------- watching by itself ---------------- */

/** Posted jobs come in waves, so a check every few days catches them without spending much. */
export const WATCH_DAYS = 3;

/**
 * Called when the app opens or comes back: if the last check was WATCH_DAYS or more ago, looks
 * again and notifies only when something new fits well. Quiet otherwise.
 */
export async function autoWatchJobs() {
  await loaded;
  const prefs = getPrefs();
  const d = getData();
  if (!prefs.watchJobs || (!prefs.accessCode && !getSession()) || !d.shop || !d.machines.length || state.busy) return;
  const now = today();
  if (prefs.jobsCheckedAt && daysBetween(prefs.jobsCheckedAt, now) < WATCH_DAYS) return;
  const fresh = await searchOpenJobs('', 'state', true);
  if (!fresh) return; // offline or failed: try again next time the app opens
  setPrefs({ jobsCheckedAt: now });
  const good = fresh.filter((j) => j.fit === 'good' && (daysLeft(j) ?? 0) >= 0);
  if (!good.length) return;
  const first = good[0];
  const left = daysLeft(first);
  await notifyNow(
    good.length === 1 ? `New open job: ${first.title.slice(0, 60)}` : `${good.length} new open jobs fit your machines`,
    good.length === 1 ? `${first.buyer}${left !== null ? ` · closes in ${left} day${left === 1 ? '' : 's'}` : ''}` : good.slice(0, 2).map((j) => j.title.slice(0, 40)).join(' · '),
    '/open-jobs',
  );
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
