import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { demoData } from './demo';
import { addDays, type Data, type Job, jobLabel, type Machine, type Shop, today } from './model';
import { bookDoneCheck, cancelDoneCheck } from './notify';

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
    if (saved?.version === 1) data = saved;
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
  await cancelDoneCheck(job.notificationId);
  const id = job.status === 'running' && job.due ? await bookDoneCheck(machineName(job.machineId), jobLabel(job), job.due) : null;
  patchJob(jobId, { notificationId: id });
}

function patchJob(id: string, patch: Partial<Job>) {
  set({ ...data, jobs: data.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
}

/* ---------------- shop & machines ---------------- */

export function finishOnboarding(shop: Shop, machines: { type: string; count: number }[]) {
  const named: Machine[] = [];
  for (const { type, count } of machines) {
    for (let i = 1; i <= count; i++) {
      named.push({ id: uid(), name: count > 1 ? `${type} ${i}` : type, type, details: '', maintenance: false });
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
  data.jobs.filter((j) => j.machineId === id).forEach((j) => cancelDoneCheck(j.notificationId));
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
  cancelDoneCheck(job.notificationId);
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
  cancelDoneCheck(job?.notificationId ?? null);
  set({ ...data, jobs: data.jobs.filter((j) => j.id !== id) });
}

/* ---------------- demo & reset ---------------- */

/** A realistic sample shop, for trying the app or showing it to someone. */
export function loadDemo() {
  set(demoData());
}

export function resetAll() {
  data.jobs.forEach((j) => cancelDoneCheck(j.notificationId));
  set(empty());
}
