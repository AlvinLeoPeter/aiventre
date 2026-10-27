import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { requestBuyers } from './api';
import { addDays, gap, type Lead, relativeDay, today, viewAll, viewMachine } from './model';
import { getSession } from './auth';
import { notifyNow } from './notify';
import { getPrefs, setPrefs } from './prefs';
import { addLeads, getData } from './store';

/**
 * "Find work": runs the AI's buyer search for one machine. The search keeps going if the
 * owner leaves the screen; anything that shows progress reads it with useSearches().
 */

export type Search = { state: 'running' } | { state: 'done'; added: number; summary: string } | { state: 'failed'; error: string };

let searches: Record<string, Search> = {};
const listeners = new Set<() => void>();
const put = (machineId: string, s: Search) => {
  searches = { ...searches, [machineId]: s };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSearches = () => useSyncExternalStore(subscribe, () => searches, () => searches);

/** Hides a finished search's note. */
export function clearSearch(machineId: string) {
  if (searches[machineId]?.state === 'running') return;
  const { [machineId]: _, ...rest } = searches;
  searches = rest;
  listeners.forEach((l) => l());
}

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].toLowerCase();

/** Sites that gave the owner a fake company or a wrong contact. */
const badSources = (leads: Lead[]) => [...new Set(leads.filter((l) => l.flags?.length && l.sourceUrl).map((l) => host(l.sourceUrl)))];

/** `auto`: started by the app itself, so tell the owner with a notification when buyers turn up. */
export async function findWork(machineId: string, auto = false) {
  if (searches[machineId]?.state === 'running') return;
  const data = getData();
  const machine = data.machines.find((m) => m.id === machineId);
  if (!data.shop || !machine) return;
  if (!getPrefs().accessCode && !getSession()) {
    put(machineId, { state: 'failed', error: 'Sign in or add the access code first: My shop.' });
    return;
  }
  put(machineId, { state: 'running' });
  try {
    const free = gap(viewMachine(data, machine));
    if (free) setPrefs({ searched: { ...getPrefs().searched, [machineId]: free.from } });
    const { buyers, summary, dropped, tooFar } = await requestBuyers({
      shop: { ...data.shop, machines: data.machines.map((m) => ({ type: m.type, details: m.details })) },
      machine: { name: machine.name, type: machine.type, details: machine.details },
      gap: free,
      known: (data.leads ?? []).map((l) => l.company),
      // What the owner marked wrong: skip those companies, and distrust the sites they came from.
      avoid: (data.leads ?? []).filter((l) => l.flags?.length).map((l) => l.company),
      bad_sources: badSources(data.leads ?? []),
    });
    const { added } = addLeads(
      machineId,
      buyers.map((b) => ({
        company: b.company,
        city: b.city,
        distanceKm: b.distance_km || 0,
        industry: b.industry,
        whyFit: b.why_fit,
        website: b.website,
        phone: b.phone,
        email: b.email,
        sourceUrl: b.source_url,
        state: b.state ?? '',
        gstin: b.gstin || undefined,
        cin: b.cin || undefined,
        checks: b.checks ?? null,
        message: b.message,
      })),
    );
    const note = [
      dropped ? `${dropped} more couldn’t be confirmed (their pages didn’t open), so they were left out.` : '',
      tooFar ? `${tooFar} were too far away for your delivery distance, so they were left out.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    put(machineId, { state: 'done', added, summary: `${summary} ${note}`.trim() });
    if (added && (auto || AppState.currentState !== 'active')) {
      const when = free && free.from > today() ? ` from ${relativeDay(free.from)}` : '';
      notifyNow(
        `Found ${added} possible buyer${added === 1 ? '' : 's'} for ${machine.name}`,
        `${machine.name} is free${when}. Tap to see them — a message is ready for each.`,
        '/buyers',
      );
    }
  } catch (e) {
    put(machineId, { state: 'failed', error: (e as Error).message });
  }
}

/* ---------------- searching by itself ---------------- */

const AUTO_WINDOW_DAYS = 3; // free now, or finishing within this many days
const AUTO_PER_DAY = 3; // each search costs credits, so keep a lid on it

/**
 * When the app opens: for each machine that's free or about to be, and not yet searched
 * for this free spell, start a search. Runs a few a day at most.
 */
export function autoFind() {
  const prefs = getPrefs();
  const data = getData();
  if (!prefs.autoFind || (!prefs.accessCode && !getSession()) || !data.shop) return;
  const now = today();
  let count = prefs.autoDay === now ? prefs.autoCount : 0;
  const due = viewAll(data, now)
    .filter((v) => v.status !== 'maintenance')
    .map((v) => ({ id: v.machine.id, free: gap(v, now) }))
    .filter((x) => x.free && x.free.from <= addDays(now, AUTO_WINDOW_DAYS) && prefs.searched[x.id] !== x.free.from)
    .sort((a, b) => a.free!.from.localeCompare(b.free!.from));
  for (const { id } of due) {
    if (count >= AUTO_PER_DAY) break;
    if (searches[id]?.state === 'running') continue;
    count++;
    findWork(id, true);
  }
  setPrefs({ autoDay: now, autoCount: count });
}
