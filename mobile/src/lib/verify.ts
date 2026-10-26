import { useSyncExternalStore } from 'react';

import { requestChecks } from './api';
import { getData, saveChecks } from './store';

/** Asking the server to check buyers that didn't come with checks (added by hand, saved by the assistant). */

let checking = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useChecking = () => useSyncExternalStore(subscribe, () => checking, () => checking);

export async function checkLeads(ids: string[]) {
  const leads = (getData().leads ?? []).filter((l) => ids.includes(l.id) && !checking.has(l.id));
  if (!leads.length) return;
  checking = new Set([...checking, ...leads.map((l) => l.id)]);
  emit();
  try {
    // The server takes 10 at a time.
    for (let i = 0; i < leads.length; i += 10) {
      const batch = leads.slice(i, i + 10);
      const { checks } = await requestChecks(batch);
      saveChecks(batch.map((l, j) => ({ id: l.id, checks: checks[j] ?? null })));
    }
  } catch {
    // Unchecked buyers just stay unchecked; the owner can try again from the buyer's page.
  } finally {
    checking = new Set([...checking].filter((id) => !leads.some((l) => l.id === id)));
    emit();
  }
}
