import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, buyerForAI, post, shopForAI } from './api';
import { gap, viewAll } from './model';
import { addLeads, getData, mergeShop, updateLead } from './store';

/**
 * "Ask Aiventre": the same agent as the website's, driven from the phone. Web search runs
 * on Anthropic's side; the other tools read and change this phone's data, so they run here
 * and their results go back with the next request. The agent never sends anything.
 */

type Block = { type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string };
type ApiMessage = { role: 'user' | 'assistant'; content: string | Block[] };
export type Entry = { role: 'user' | 'assistant' | 'activity' | 'error'; text: string };
type Chat = { api: ApiMessage[]; log: Entry[]; busy: string; busySince: number };

const KEY = 'aiventre:chat';
const MAX_STEPS = 15;

let chat: Chat = { api: [], log: [], busy: '', busySince: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<Chat>) {
  chat = { ...chat, ...next };
  listeners.forEach((l) => l());
  // Web search results make the raw history big; keep just the visible log if it gets too large.
  const raw = JSON.stringify({ api: chat.api, log: chat.log });
  AsyncStorage.setItem(KEY, raw.length < 1_500_000 ? raw : JSON.stringify({ api: [], log: chat.log })).catch(() => {});
}

export async function loadChat() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved?.log) chat = { api: saved.api ?? [], log: saved.log, busy: '', busySince: 0 };
  } catch {
    // Start a fresh chat.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useChat = () => useSyncExternalStore(subscribe, () => chat, () => chat);
export const newChat = () => set({ api: [], log: [] });

/* ---------------- tools that run on the phone ---------------- */

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : undefined);

const TOOLS: Record<string, (input: Record<string, unknown>) => unknown> = {
  get_shop_context() {
    const data = getData();
    const leads = data.leads ?? [];
    return {
      profile: shopForAI(data),
      delivery_distance_km: data.shop?.reach || 'anywhere in India',
      machines_with_free_days: viewAll(data)
        .map((v) => ({ machine: v.machine.name, type: v.machine.type, free: gap(v) }))
        .filter((m) => m.free),
      buyers: leads.slice(0, 300).map((l) => ({ id: l.id, ...buyerForAI(l), has_phone: !!l.phone, has_email: !!l.email })),
      buyer_count: leads.length,
    };
  },
  update_shop_profile(i) {
    mergeShop({
      name: str(i.shop_name),
      city: str(i.city),
      state: str(i.state),
      summary: str(i.summary),
      capabilities: list(i.capabilities),
      materials: list(i.materials),
      industries: list(i.industries),
      certifications: list(i.certifications),
    });
    return { saved: true, note: Array.isArray(i.machines) && i.machines.length ? 'Machines are managed by the owner in the Machines tab; ask them to add any that are missing.' : undefined };
  },
  save_buyers(i) {
    if (!Array.isArray(i.buyers)) throw new Error('buyers must be a list');
    const { added, skipped } = addLeads(
      '',
      (i.buyers as Record<string, unknown>[]).map((b) => ({
        company: str(b.company),
        city: str(b.city),
        state: str(b.state),
        industry: str(b.industry),
        website: str(b.website),
        email: str(b.email),
        phone: str(b.phone),
        contactRole: str(b.contact_role),
        whyFit: str(b.why_fit),
        sourceUrl: str(b.source_url),
      })),
    );
    return { added, skipped_duplicates: skipped };
  },
  save_email_draft(i) {
    const id = str(i.buyer_id);
    if (!getData().leads?.some((l) => l.id === id)) throw new Error(`No buyer with id ${id}`);
    updateLead(id, { subject: str(i.subject), message: str(i.body) }, 'Message written by AI');
    return { saved: true };
  },
};

// One line per thing the agent did, for the chat.
function describe(b: Block, result?: unknown) {
  const i = b.input ?? {};
  const r = result as { added?: number; skipped_duplicates?: string[] } | undefined;
  switch (b.name) {
    case 'web_search':
      return `Searched the web: “${str(i.query)}”`;
    case 'web_fetch':
      return `Read ${str(i.url).replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}`;
    case 'get_shop_context':
      return 'Checked your shop and buyer list';
    case 'update_shop_profile':
      return 'Updated your shop profile';
    case 'save_buyers':
      return r?.added != null
        ? `Saved ${r.added} new buyer${r.added === 1 ? '' : 's'}${r.skipped_duplicates?.length ? ` (${r.skipped_duplicates.length} already on your list)` : ''}`
        : 'Tried to save buyers';
    case 'save_email_draft': {
      const l = getData().leads?.find((x) => x.id === str(i.buyer_id));
      return `Wrote a message${l ? ` for ${l.company}` : ''}`;
    }
    default:
      return `Used ${b.name}`;
  }
}

/** Sends one message from the owner and lets the agent work until it's done. */
export async function ask(text: string) {
  if (chat.busy) return;
  let api: ApiMessage[] = [...chat.api, { role: 'user', content: text }];
  let log: Entry[] = [...chat.log, { role: 'user', text }];
  set({ api, log, busy: 'Thinking…', busySince: Date.now() });

  for (let step = 0; step < MAX_STEPS; step++) {
    let turn: { content: Block[]; stop_reason: string };
    try {
      turn = await post('/api/agent', { messages: api });
    } catch (e) {
      // If the first call failed, drop the unanswered message so it can be sent again.
      const message = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
      set({ api: step === 0 ? api.slice(0, -1) : api, log: [...log, { role: 'error', text: message }], busy: '' });
      return;
    }

    api = [...api, { role: 'assistant', content: turn.content }];
    for (const b of turn.content) if (b.type === 'server_tool_use') log = [...log, { role: 'activity', text: describe(b) }];

    const uses = turn.content.filter((b) => b.type === 'tool_use');
    const words = turn.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (turn.stop_reason === 'tool_use' && uses.length) {
      if (words.trim()) log = [...log, { role: 'assistant', text: words }];
      const results: Block[] = [];
      for (const b of uses) {
        try {
          const fn = TOOLS[b.name ?? ''];
          if (!fn) throw new Error(`Unknown tool ${b.name}`);
          const result = fn(b.input ?? {});
          results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(result) } as Block);
          log = [...log, { role: 'activity', text: describe(b, result) }];
        } catch (e) {
          results.push({ type: 'tool_result', tool_use_id: b.id, is_error: true, content: (e as Error).message } as Block);
        }
      }
      // All results for one assistant turn go back together.
      api = [...api, { role: 'user', content: results }];
      set({ api, log, busy: 'Working…' });
      continue;
    }

    if (turn.stop_reason === 'refusal') log = [...log, { role: 'error', text: 'The AI declined that. Try asking another way.' }];
    else {
      if (words.trim()) log = [...log, { role: 'assistant', text: words }];
      if (turn.stop_reason === 'max_tokens') log = [...log, { role: 'error', text: 'The answer was cut off. Ask it to continue.' }];
    }
    set({ api, log, busy: '' });
    return;
  }
  set({ api, log: [...log, { role: 'error', text: 'Stopped after many steps. Ask it to continue if needed.' }], busy: '' });
}
