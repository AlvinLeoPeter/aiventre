import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { demoData } from './demo';
import { addDays, type Data, FOLLOW_UP_DAYS, type Job, jobLabel, type Lead, type Machine, type Shop, today } from './model';
import { bookDoneCheck, bookFollowUp, cancelReminder } from './notify';

/**
 * The shop's data, saved on the phone. Screens read it with useData() and change it
 * only through the actions below, which also keep the "is it done?" reminders in sync.
 */

const KEY = 'aiventre:v1';

const empty = (): Data => ({ version: 1, shop: null, machines: [], jobs: [] });

let data: Data = empty();
let ready = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function set(next: Data) {
  data = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {
    // Storage full or unavailable: keep working in memory.
  });
}

export async function loadData() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved?.version === 1) data = { ...saved, leads: (saved.leads ?? []).map(normalizeLead) };
  } catch {
    // Corrupt data: start fresh rather than crash.
  }
  ready = true;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useData = () => useSyncExternalStore(subscribe, () => data, () => data);
export const useReady = () => useSyncExternalStore(subscribe, () => ready, () => ready);
export const getData = () => data;

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- reminders ---------------- */

const machineName = (id: string) => data.machines.find((m) => m.id === id)?.name ?? 'Machine';

/** (Re)book the reminder for a running job after its due date changed. */
async function rebook(jobId: string) {
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job) return;
  await cancelReminder(job.notificationId);
  const id = job.status === 'running' && job.due ? await bookDoneCheck(machineName(job.machineId), jobLabel(job), job.due) : null;
  patchJob(jobId, { notificationId: id });
}

function patchJob(id: string, patch: Partial<Job>) {
  set({ ...data, jobs: data.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
}

/* ---------------- shop & machines ---------------- */

export function finishOnboarding(shop: Shop, machines: { type: string; count: number; details?: string }[]) {
  const named: Machine[] = [];
  for (const { type, count, details = '' } of machines) {
    for (let i = 1; i <= count; i++) {
      named.push({ id: uid(), name: count > 1 ? `${type} ${i}` : type, type, details, maintenance: false });
    }
  }
  set({ ...data, shop, machines: named });
}

export function updateShop(shop: Shop) {
  set({ ...data, shop });
}

export function addMachine(type: string, details = '') {
  const sameType = data.machines.filter((m) => m.type === type).length;
  const name = sameType ? `${type} ${sameType + 1}` : type;
  const machine: Machine = { id: uid(), name, type, details, maintenance: false };
  set({ ...data, machines: [...data.machines, machine] });
  return machine;
}

export function updateMachine(id: string, patch: Partial<Machine>) {
  set({ ...data, machines: data.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
}

export function removeMachine(id: string) {
  data.jobs.filter((j) => j.machineId === id).forEach((j) => cancelReminder(j.notificationId));
  set({ ...data, machines: data.machines.filter((m) => m.id !== id), jobs: data.jobs.filter((j) => j.machineId !== id) });
}

/* ---------------- jobs ---------------- */

export type NewJob = { machineId: string; title: string; customer: string; qty: number | null; days: number };

/** Starts now if the machine is free; otherwise joins the queue behind the current job. */
export function addJob(input: NewJob) {
  const busy = data.jobs.some((j) => j.machineId === input.machineId && j.status === 'running');
  const now = today();
  const job: Job = {
    id: uid(),
    ...input,
    status: busy ? 'queued' : 'running',
    start: busy ? null : now,
    due: busy ? null : addDays(now, input.days),
    doneAt: null,
    notificationId: null,
  };
  set({ ...data, jobs: [...data.jobs, job] });
  if (!busy) rebook(job.id);
  return job;
}

export function updateJob(id: string, patch: Partial<Pick<Job, 'title' | 'customer' | 'qty' | 'days'>>) {
  const job = data.jobs.find((j) => j.id === id);
  if (!job) return;
  const due = job.status === 'running' && patch.days && job.start ? addDays(job.start, patch.days) : job.due;
  patchJob(id, { ...patch, due });
  if (due !== job.due) rebook(id);
}

/** "Job done": close it and start the next one in the queue. */
export function finishJob(id: string) {
  const job = data.jobs.find((j) => j.id === id);
  if (!job) return;
  cancelReminder(job.notificationId);
  const now = today();
  const next = data.jobs.find((j) => j.machineId === job.machineId && j.status === 'queued');
  set({
    ...data,
    jobs: data.jobs.map((j) => {
      if (j.id === id) return { ...j, status: 'done', doneAt: now, notificationId: null };
      if (next && j.id === next.id) return { ...j, status: 'running', start: now, due: addDays(now, j.days) };
      return j;
    }),
  });
  if (next) rebook(next.id);
}

/** "+1 day", "+2 days": push the finish date out (from today if it's already overdue). */
export function extendJob(id: string, days: number) {
  const job = data.jobs.find((j) => j.id === id);
  if (!job?.due) return;
  const now = today();
  const base = job.due < now ? now : job.due;
  patchJob(id, { due: addDays(base, days) });
  rebook(id);
}

/** Start a queued job now (only when the machine has nothing running). */
export function startJob(id: string) {
  const job = data.jobs.find((j) => j.id === id);
  if (!job || data.jobs.some((j) => j.machineId === job.machineId && j.status === 'running')) return;
  const now = today();
  patchJob(id, { status: 'running', start: now, due: addDays(now, job.days) });
  rebook(id);
}

export function removeJob(id: string) {
  const job = data.jobs.find((j) => j.id === id);
  cancelReminder(job?.notificationId ?? null);
  set({ ...data, jobs: data.jobs.filter((j) => j.id !== id) });
}

/* ---------------- shop profile ---------------- */

const uniqueList = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b].map((x) => x.trim()).filter(Boolean))];

/** Adds what the owner told the assistant to the profile; lists are merged, not replaced. */
export function mergeShop(patch: Partial<Shop>) {
  if (!data.shop) return;
  const next: Shop = { ...data.shop };
  for (const k of ['name', 'city', 'state', 'area', 'summary', 'phone', 'email'] as const) {
    if (patch[k]) next[k] = patch[k];
  }
  for (const k of ['capabilities', 'materials', 'industries', 'certifications', 'work'] as const) {
    if (patch[k]?.length) next[k] = uniqueList(data.shop[k], patch[k]);
  }
  set({ ...data, shop: next });
}

/* ---------------- buyers ---------------- */

const stamp = () => new Date().toISOString();
const key = (s = '') => s.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]/g, '');

/** Fills in fields that older saves (or the AI) left out. */
function normalizeLead(l: Partial<Lead> & { company: string }): Lead {
  return {
    id: l.id ?? uid(),
    machineId: l.machineId ?? '',
    company: l.company,
    city: l.city ?? '',
    state: l.state ?? '',
    distanceKm: l.distanceKm ?? 0,
    industry: l.industry ?? '',
    whyFit: l.whyFit ?? '',
    website: l.website ?? '',
    phone: l.phone ?? '',
    email: l.email ?? '',
    contactRole: l.contactRole ?? '',
    sourceUrl: l.sourceUrl ?? '',
    subject: l.subject ?? '',
    message: l.message ?? '',
    status: (l.status as string) === 'not_fit' ? 'lost' : (l.status ?? 'new'),
    followUpAt: l.followUpAt ?? null,
    followUpNotificationId: l.followUpNotificationId ?? null,
    notes: l.notes ?? '',
    history: l.history ?? [{ at: stamp(), text: l.sourceUrl ? 'Found by the AI' : 'Added' }],
    foundAt: l.foundAt ?? today(),
  };
}

export type FoundBuyer = Partial<Omit<Lead, 'id' | 'status' | 'history' | 'foundAt'>> & { company: string };

/** Saves buyers, skipping the shop itself and companies (or websites) already on the list. */
export function addLeads(machineId: string, found: FoundBuyer[]) {
  const leads = data.leads ?? [];
  const seen = new Set([...leads.flatMap((l) => [key(l.company), key(l.website)]), key(data.shop?.name)].filter(Boolean));
  const fresh: Lead[] = [];
  const skipped: string[] = [];
  for (const b of found) {
    const keys = [key(b.company), key(b.website)].filter(Boolean);
    if (!b.company?.trim() || keys.some((k) => seen.has(k))) {
      if (b.company) skipped.push(b.company);
      continue;
    }
    keys.forEach((k) => seen.add(k));
    fresh.push(normalizeLead({ ...b, company: b.company.trim(), machineId: b.machineId ?? machineId }));
  }
  set({ ...data, leads: [...fresh, ...leads] });
  return { added: fresh.length, skipped, ids: fresh.map((l) => l.id) };
}

export function updateLead(id: string, patch: Partial<Lead>, historyText?: string) {
  set({
    ...data,
    leads: (data.leads ?? []).map((l) =>
      l.id === id ? { ...l, ...patch, history: historyText ? [...l.history, { at: stamp(), text: historyText }] : l.history } : l,
    ),
  });
}

/** "I've sent it": remember it, and book a nudge to follow up in a few days if they stay quiet. */
export async function markContacted(id: string, how: string) {
  const lead = data.leads?.find((l) => l.id === id);
  if (!lead) return;
  await cancelReminder(lead.followUpNotificationId);
  const followUpAt = addDays(today(), FOLLOW_UP_DAYS);
  updateLead(
    id,
    { status: ['new', 'contacted'].includes(lead.status) ? 'contacted' : lead.status, followUpAt, followUpNotificationId: null },
    `${how} · follow up in ${FOLLOW_UP_DAYS} days`,
  );
  const notificationId = await bookFollowUp(lead.company, followUpAt, id);
  if (notificationId) updateLead(id, { followUpNotificationId: notificationId });
}

export function setLeadStatus(id: string, status: Lead['status'], label: string) {
  const lead = data.leads?.find((l) => l.id === id);
  if (!lead || lead.status === status) return;
  // Once they answer (or it's settled), the follow-up nudge is no longer needed.
  if (status !== 'contacted') cancelReminder(lead.followUpNotificationId);
  updateLead(id, { status, ...(status !== 'contacted' && { followUpAt: null, followUpNotificationId: null }) }, `Status → ${label}`);
}

export function removeLead(id: string) {
  const lead = data.leads?.find((l) => l.id === id);
  cancelReminder(lead?.followUpNotificationId ?? null);
  set({ ...data, leads: (data.leads ?? []).filter((l) => l.id !== id) });
}

/* ---------------- backup ---------------- */

export const backupJson = () => JSON.stringify(data, null, 2);

export function restoreBackup(text: string) {
  const saved = JSON.parse(text);
  if (saved?.version !== 1 || !Array.isArray(saved.machines)) throw new Error('This isn’t an Aiventre backup file.');
  data.jobs.forEach((j) => cancelReminder(j.notificationId));
  set({ ...saved, leads: (saved.leads ?? []).map(normalizeLead) });
}

/* ---------------- demo & reset ---------------- */

/** A realistic sample shop, for trying the app or showing it to someone. */
export function loadDemo() {
  set(demoData());
}

export function resetAll() {
  data.jobs.forEach((j) => cancelReminder(j.notificationId));
  set(empty());
}
