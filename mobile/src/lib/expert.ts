import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, post } from './api';
import type { PickedDrawing } from './drawing';
import { getData } from './store';

/**
 * "Machine expert": a chat about machining, tools, materials, alarms and maintenance.
 * The whole conversation goes to the server each time (api/expert.js), which runs any web
 * look-ups itself, so there are no tools to run on the phone.
 */

type Block = { type: string; text?: string; name?: string; input?: Record<string, unknown>; source?: unknown };
type ApiMessage = { role: 'user' | 'assistant'; content: string | Block[] };
export type ExpertEntry = { role: 'user' | 'assistant' | 'activity' | 'error'; text: string; photo?: string };
type Chat = { api: ApiMessage[]; log: ExpertEntry[]; busy: boolean; busySince: number };

const KEY = 'aiventre:expert';
// Photos make a chat heavy. Past this size, photos from earlier questions are swapped for a note
// (the answers about them stay). Keeps requests well under the server's 4.5 MB limit and the
// saved chat under what Android's storage handles in one piece (about 2 MB).
const LIGHTEN_AT = 1_000_000;
const EARLIER_PHOTO = '[A photo the owner sent earlier]';

let chat: Chat = { api: [], log: [], busy: false, busySince: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<Chat>) {
  chat = { ...chat, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify({ api: chat.api, log: chat.log })).catch(() => {});
}

export async function loadExpert() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved?.log) chat = { api: saved.api ?? [], log: saved.log, busy: false, busySince: 0 };
  } catch {
    // Start a fresh chat.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useExpert = () => useSyncExternalStore(subscribe, () => chat, () => chat);
export const newExpertChat = () => set({ api: [], log: [] });

/** Keeps the latest question's photo; earlier ones become a short note once the chat gets big. */
export function lighten(api: ApiMessage[]): ApiMessage[] {
  if (JSON.stringify(api).length < LIGHTEN_AT) return api;
  return api.map((m, i) =>
    i === api.length - 1 || m.role !== 'user' || typeof m.content === 'string'
      ? m
      : { ...m, content: m.content.map((b) => (b.type === 'image' ? { type: 'text', text: EARLIER_PHOTO } : b)) },
  );
}

const shopForExpert = () => {
  const d = getData();
  return {
    name: d.shop?.name,
    city: d.shop?.city,
    work: d.shop?.work ?? [],
    materials: d.shop?.materials ?? [],
    machines: d.machines.map((m) => ({ name: m.name, type: m.type, details: m.details })),
  };
};

const describe = (b: Block) => {
  const input = b.input ?? {};
  if (b.name === 'web_search') return `Searched “${String(input.query ?? '')}”`;
  if (b.name === 'web_fetch') return `Read ${String(input.url ?? '').replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}`;
  return `Used ${b.name}`;
};

export async function askExpert(text: string, photo?: PickedDrawing | null) {
  if (chat.busy) return;
  const question = text.trim() || 'What do you see in this photo? What’s wrong, and what should I try first?';
  const content: ApiMessage['content'] = photo
    ? [
        { type: 'image', source: { type: 'base64', media_type: photo.mediaType, data: photo.data } },
        { type: 'text', text: question },
      ]
    : question;
  const api = lighten([...chat.api, { role: 'user', content }]);
  let log: ExpertEntry[] = [...chat.log, { role: 'user', text: text.trim(), photo: photo?.preview }];
  set({ api, log, busy: true, busySince: Date.now() });

  let turn: { content: Block[]; stop_reason: string };
  try {
    turn = await post('/api/expert', { messages: api, shop: shopForExpert() });
  } catch (e) {
    // Drop the unanswered question so it can be asked again.
    const message = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
    set({ api: api.slice(0, -1), log: [...log, { role: 'error', text: message }], busy: false });
    return;
  }

  for (const b of turn.content) if (b.type === 'server_tool_use') log = [...log, { role: 'activity', text: describe(b) }];
  const words = turn.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (turn.stop_reason === 'refusal' || !turn.content.length) {
    // Nothing usable came back: leave the question out of the history so the chat can go on.
    set({ api: api.slice(0, -1), log: [...log, { role: 'error', text: 'The AI declined that. Try asking another way.' }], busy: false });
    return;
  }
  if (words) log = [...log, { role: 'assistant', text: words }];
  if (turn.stop_reason === 'max_tokens') log = [...log, { role: 'error', text: 'The answer was cut off. Ask it to continue.' }];
  set({ api: [...api, { role: 'assistant', content: turn.content }], log, busy: false });
}
