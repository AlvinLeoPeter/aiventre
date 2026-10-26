import { useSyncExternalStore } from 'react';

import { requestBuyers } from './api';
import { gap, viewMachine } from './model';
import { getPrefs } from './prefs';
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

export async function findWork(machineId: string) {
  if (searches[machineId]?.state === 'running') return;
  const data = getData();
  const machine = data.machines.find((m) => m.id === machineId);
  if (!data.shop || !machine) return;
  if (!getPrefs().accessCode) {
    put(machineId, { state: 'failed', error: 'Add the access code first: My shop → AI.' });
    return;
  }
  put(machineId, { state: 'running' });
  try {
    const free = gap(viewMachine(data, machine));
    const { buyers, summary } = await requestBuyers({
      shop: { ...data.shop, machines: data.machines.map((m) => ({ type: m.type, details: m.details })) },
      machine: { name: machine.name, type: machine.type, details: machine.details },
      gap: free,
      known: (data.leads ?? []).map((l) => l.company),
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
        message: b.message,
      })),
    );
    put(machineId, { state: 'done', added, summary });
  } catch (e) {
    put(machineId, { state: 'failed', error: (e as Error).message });
  }
}
