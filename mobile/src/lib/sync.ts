import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSession, onSessionChange, signOut } from './auth';
import type { Data, Invoice, Job, Lead, Machine, Shop, Supplier } from './model';
import { applyFromCloud, connectSync, getData, rebookAll } from './store';
import { supabase } from './supabase';

/**
 * Keeping the phone and the online database in step.
 *
 * The phone's copy is what the app shows, so everything works offline. Each change made here
 * is queued (the "outbox") and sent a few seconds later; then anything changed elsewhere since
 * the last sync is fetched. The database stamps every row with its own clock, and the phone
 * remembers the latest stamp it has seen per table (the "cursor").
 *
 * Reminders are booked per phone, so their ids never leave the phone.
 */

type Table = 'machines' | 'jobs' | 'leads' | 'invoices' | 'suppliers';
const TABLES: Table[] = ['machines', 'jobs', 'leads', 'invoices', 'suppliers'];
type Row = Machine | Job | Lead | Invoice | Supplier;

type State = {
  userId: string | null; // whose shop this phone is linked to
  shopId: string | null;
  cursor: Record<Table | 'shop', string>;
  outbox: Record<Table, Record<string, number>>; // id → change count, so a change during a push isn't lost
  shopDirty: number;
  lastSynced: string | null;
};

const KEY = 'aiventre:sync';
const fresh = (): State => ({
  userId: null,
  shopId: null,
  cursor: { machines: '', jobs: '', leads: '', invoices: '', suppliers: '', shop: '' },
  outbox: { machines: {}, jobs: {}, leads: {}, invoices: {}, suppliers: {} },
  shopDirty: 0,
  lastSynced: null,
});
let st: State = fresh();

const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(st)).catch(() => {});

/* ---------------- status for the screens ---------------- */

export type Status = {
  state: 'off' | 'syncing' | 'ok' | 'offline' | 'error' | 'choose';
  message?: string;
  lastSynced: string | null;
  cloudShopName?: string; // when the phone and the account both have a shop
};
let status: Status = { state: 'off', lastSynced: null };
const listeners = new Set<() => void>();
const setStatus = (next: Partial<Status>) => {
  status = { ...status, lastSynced: st.lastSynced, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSyncStatus = () => useSyncExternalStore(subscribe, () => status, () => status);
export const getSyncState = () => status.state;

/* ---------------- recording changes made on this phone ---------------- */

const list = (d: Data, t: Table): Row[] => d[t] ?? [];

function recordChanges(prev: Data, next: Data) {
  if (!st.shopId) {
    // Signed in but not linked yet (e.g. just finished setup): link now.
    if (next.shop && getSession()) schedule(1000);
    return;
  }
  for (const t of TABLES) {
    const before = new Map(list(prev, t).map((r) => [r.id, r]));
    const after = new Map(list(next, t).map((r) => [r.id, r]));
    // The store replaces only the objects it changes, so a different object means a change.
    for (const [id, row] of after) if (before.get(id) !== row) st.outbox[t][id] = (st.outbox[t][id] ?? 0) + 1;
    for (const id of before.keys()) if (!after.has(id)) st.outbox[t][id] = (st.outbox[t][id] ?? 0) + 1;
  }
  if (prev.shop !== next.shop && next.shop) st.shopDirty++;
  persist();
  schedule(2500);
}

/** The phone's copy is being thrown away (reset, sample shop): stop syncing it, and sign out. */
function detach() {
  if (!st.shopId && !getSession()) return;
  st = fresh();
  persist();
  setStatus({ state: 'off' });
  signOut().catch(() => {});
}

/* ---------------- talking to the database ---------------- */

// Fields that only make sense on one phone.
const forCloud = (t: Table, r: Row) =>
  t === 'jobs' ? { ...(r as Job), notificationId: null } : t === 'leads' ? { ...(r as Lead), followUpNotificationId: null } : r;
const keepLocal = (t: Table, incoming: Row, local?: Row): Row =>
  !local
    ? incoming
    : t === 'jobs'
      ? { ...(incoming as Job), notificationId: (local as Job).notificationId }
      : t === 'leads'
        ? { ...(incoming as Lead), followUpNotificationId: (local as Lead).followUpNotificationId }
        : incoming;

// A little overlap, so a change saved a moment before the last sync finished isn't skipped.
const since = (cursor: string) => (cursor ? new Date(new Date(cursor).getTime() - 5000).toISOString() : '1970-01-01T00:00:00Z');

async function push() {
  const shopId = st.shopId!;
  const data = getData();
  for (const t of TABLES) {
    const pending = { ...st.outbox[t] };
    const ids = Object.keys(pending);
    if (!ids.length) continue;
    const rows = ids.map((id) => {
      const row = list(data, t).find((r) => r.id === id);
      return row ? { shop_id: shopId, id, data: forCloud(t, row), deleted: false } : { shop_id: shopId, id, data: {}, deleted: true };
    });
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from(t).upsert(rows.slice(i, i + 200), { onConflict: 'shop_id,id' });
      if (error) throw error;
    }
    // Only clear what was sent; anything changed again meanwhile goes next time.
    for (const id of ids) if (st.outbox[t][id] === pending[id]) delete st.outbox[t][id];
  }
  if (st.shopDirty && data.shop) {
    const sent = st.shopDirty;
    const { error } = await supabase.from('shops').update({ data: data.shop }).eq('id', shopId);
    if (error) throw error;
    if (st.shopDirty === sent) st.shopDirty = 0;
  }
  persist();
}

type CloudRow = { id: string; data: Row; deleted: boolean; updated_at: string };

async function fetchChanges(table: Table, cursor: string) {
  const { data, error } = await supabase
    .from(table)
    .select('id,data,deleted,updated_at')
    .eq('shop_id', st.shopId!)
    .gt('updated_at', since(cursor))
    .order('updated_at')
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as CloudRow[];
}

async function pull() {
  let next = getData();
  let changed = false;
  for (const t of TABLES) {
    const rows = await fetchChanges(t, st.cursor[t]);
    if (!rows.length) continue;
    const local = new Map(list(next, t).map((r) => [r.id, r]));
    for (const r of rows) {
      if (st.outbox[t][r.id]) continue; // this phone has a newer change waiting to go up
      if (r.deleted) local.delete(r.id);
      else local.set(r.id, keepLocal(t, r.data, local.get(r.id)));
    }
    next = { ...next, [t]: [...local.values()] };
    st.cursor[t] = rows[rows.length - 1].updated_at;
    changed = true;
  }
  const { data: shopRow, error } = await supabase.from('shops').select('data,updated_at').eq('id', st.shopId!).single();
  if (error) throw error;
  if (shopRow.updated_at > st.cursor.shop) {
    if (!st.shopDirty && JSON.stringify(shopRow.data) !== JSON.stringify(next.shop)) {
      next = { ...next, shop: shopRow.data as Shop };
      changed = true;
    }
    st.cursor.shop = shopRow.updated_at;
  }
  if (changed) applyFromCloud(next);
  persist();
}

/* ---------------- linking a phone to an account ---------------- */

async function cloudShop() {
  const { data, error } = await supabase.from('shop_members').select('shop_id').limit(1);
  if (error) throw error;
  if (!data?.length) return null;
  const { data: shop, error: e2 } = await supabase.from('shops').select('id,data').eq('id', data[0].shop_id).single();
  if (e2) throw e2;
  return shop as { id: string; data: Shop };
}

/** Everything on this phone goes up as a new online shop. */
async function uploadThisPhone(userId: string) {
  const data = getData();
  const { data: created, error } = await supabase.from('shops').insert({ data: data.shop }).select('id').single();
  if (error) throw error;
  st = { ...fresh(), userId, shopId: created.id };
  for (const t of TABLES) for (const r of list(data, t)) st.outbox[t][r.id] = 1;
  persist();
  await push();
}

/** This phone takes the online shop, replacing what it had. */
export async function takeCloudShop() {
  const session = getSession();
  const shop = await cloudShop();
  if (!session || !shop) return;
  st = { ...fresh(), userId: session.user.id, shopId: shop.id };
  applyFromCloud({ version: 1, shop: shop.data, machines: [], jobs: [], leads: [] });
  await pull();
  await rebookAll();
  st.lastSynced = new Date().toISOString();
  persist();
  setStatus({ state: 'ok', cloudShopName: undefined });
}

/** The online shop takes this phone's copy: everything here goes up, anything else there is marked deleted. */
export async function keepThisPhone() {
  const session = getSession();
  const shop = await cloudShop();
  if (!session || !shop) return;
  st = { ...fresh(), userId: session.user.id, shopId: shop.id, shopDirty: 1 };
  const data = getData();
  for (const t of TABLES) {
    for (const r of list(data, t)) st.outbox[t][r.id] = 1;
    const remote = await fetchChanges(t, '');
    for (const r of remote) if (!r.deleted && !st.outbox[t][r.id]) st.outbox[t][r.id] = 1;
  }
  persist();
  await syncNow();
}

/* ---------------- the sync itself ---------------- */

let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => syncNow().catch(() => {}), ms);
}

export function syncNow(): Promise<void> {
  if (running) return running.then(() => syncNow());
  running = run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  const session = getSession();
  if (!session) return setStatus({ state: 'off' });
  const userId = session.user.id;
  // A different person signed in on this phone: link afresh.
  if (st.userId && st.userId !== userId) {
    st = fresh();
    persist();
  }
  setStatus({ state: 'syncing' });
  try {
    if (!st.shopId) {
      const data = getData();
      const shop = await cloudShop();
      if (shop && data.shop) return setStatus({ state: 'choose', cloudShopName: shop.data?.name ?? 'your shop' });
      if (shop) return await takeCloudShop();
      if (!data.shop) return setStatus({ state: 'ok' }); // nothing anywhere yet: link after setup
      await uploadThisPhone(userId);
    }
    await push();
    await pull();
    st.lastSynced = new Date().toISOString();
    persist();
    setStatus({ state: 'ok', message: undefined });
  } catch (e) {
    const raw = (e as Error).message ?? String(e);
    const message = /could not find the table|relation .* does not exist/i.test(raw)
      ? 'The online database needs an update: run the newest file in supabase/migrations in the Supabase SQL Editor.'
      : raw;
    const offline = /network|fetch|failed to fetch|timed? ?out/i.test(message);
    setStatus({ state: offline ? 'offline' : 'error', message: offline ? undefined : message });
  }
}

/** Called once at start-up, after the phone's data has loaded. */
export async function startSync() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    // Saves from before a table existed lack its cursor and outbox.
    if (saved) st = { ...fresh(), ...saved, cursor: { ...fresh().cursor, ...saved.cursor }, outbox: { ...fresh().outbox, ...saved.outbox } };
  } catch {
    // Start unlinked; the next sign-in links again.
  }
  connectSync(recordChanges, detach);
  onSessionChange(() => schedule(300));
  AppState.addEventListener('change', (s) => s === 'active' && schedule(500));
  // Pick up changes from other devices now and then while the app is open.
  setInterval(() => AppState.currentState === 'active' && getSession() && schedule(0), 120_000);
  schedule(800);
}
