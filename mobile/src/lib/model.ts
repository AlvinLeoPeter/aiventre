/**
 * The shop's data and the rules that turn it into "what's happening now".
 *
 * The owner only says how long a job will take ("done in 2 days"). Every status —
 * running, free soon, idle, "is it done?" — is worked out from dates, so nothing
 * needs updating day to day.
 */

export type Machine = {
  id: string;
  name: string; // "VMC 1"
  type: string; // "VMC"
  details: string; // "Haas, 850 mm travel"
  maintenance: boolean;
};

export type Job = {
  id: string;
  machineId: string;
  title: string; // "Bracket"
  customer: string;
  qty: number | null;
  days: number; // how long it takes once started
  status: 'queued' | 'running' | 'done';
  start: string | null; // YYYY-MM-DD, set when it starts
  due: string | null; // YYYY-MM-DD, expected finish
  doneAt: string | null;
  notificationId: string | null;
};

export type Shop = {
  name: string;
  owner: string;
  city: string;
  work: string[]; // kinds of job work
  rate?: number; // usual machine hour rate in ₹, for quotes
  // Where the shop is — the AI looks for buyers near here first.
  area?: string; // locality or industrial estate, e.g. Chakan MIDC
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  reach?: number; // how far they'll send parts, in km; 0 = anywhere in India
  // What buyers see in the profile PDF and what the AI uses to pitch the shop.
  summary?: string;
  phone?: string;
  email?: string;
  capabilities?: string[];
  materials?: string[];
  industries?: string[];
  certifications?: string[];
};

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'quote_requested' | 'won' | 'lost';

/** A possible buyer: found by the AI (or added by hand), with the conversation so far. */
export type Lead = {
  id: string;
  machineId: string; // the machine it was found for; '' when added by hand or by the assistant
  company: string;
  city: string;
  state: string;
  distanceKm: number; // rough; 0 = unknown
  industry: string;
  whyFit: string;
  website: string;
  phone: string;
  email: string;
  contactRole: string; // e.g. Purchase department
  sourceUrl: string;
  subject: string; // for email
  message: string; // the next message to send, WhatsApp or email
  status: LeadStatus;
  followUpAt: string | null; // day to nudge them if they haven't replied
  followUpNotificationId: string | null;
  notes: string;
  history: { at: string; text: string }[];
  foundAt: string; // day
  gstin?: string;
  cin?: string;
  checks?: Checks | null; // what the server could confirm about them
  flags?: Flag[]; // what the owner found wrong
};

/** What the server confirmed by opening the company's pages (see server/verify.js). */
export type Checks = {
  at: string;
  link: 'ok' | 'no_mention' | 'broken' | 'none';
  website: 'ok' | 'down' | 'none';
  email: 'official' | 'free' | 'other' | 'none';
  phone: 'on_site' | 'not_found' | 'none';
  registration: { kind: 'GSTIN' | 'CIN'; id: string; state?: string; onSite?: boolean; stateMatches?: boolean; invalid?: boolean } | null;
  passed: number; // 0–3: link, contact, registration
};

export type Flag = 'wrong_number' | 'wrong_email' | 'fake';
export const FLAG_LABEL: Record<Flag, string> = {
  wrong_number: 'Wrong number',
  wrong_email: 'Wrong email',
  fake: 'Closed or not real',
};

export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: Status }> = {
  new: { label: 'New', tone: 'maintenance' },
  contacted: { label: 'Contacted', tone: 'soon' },
  replied: { label: 'Replied', tone: 'running' },
  quote_requested: { label: 'Wants a quote', tone: 'running' },
  won: { label: 'Won', tone: 'running' },
  lost: { label: 'Not now', tone: 'maintenance' },
};

export const FOLLOW_UP_DAYS = 4;
export const followUpDue = (l: Lead, now = today()) => l.status === 'contacted' && !!l.followUpAt && l.followUpAt <= now;

export type Data = {
  version: 1;
  shop: Shop | null; // null until onboarding is done
  machines: Machine[];
  jobs: Job[];
  leads?: Lead[]; // added after v0.2; missing in older saves
};

export const FREE_SOON_DAYS = 2;

/* ---------------- dates (local calendar days) ---------------- */

const pad = (n: number) => String(n).padStart(2, '0');

export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toDay(new Date());

export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return toDay(d);
};

/** Whole days from a to b (b later = positive). */
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 30 Oct" */
export const niceDay = (s: string) => {
  const d = parseDay(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "today", "tomorrow", "in 3 days", "Thu 30 Oct" (far away) */
export const relativeDay = (s: string, from = today()) => {
  const n = daysBetween(from, s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1 && n <= 6) return `in ${n} days`;
  if (n < -1 && n >= -6) return `${-n} days ago`;
  return niceDay(s);
};

/* ---------------- derived machine status ---------------- */

export type Status = 'running' | 'soon' | 'check' | 'idle' | 'maintenance';

export type MachineView = {
  machine: Machine;
  status: Status;
  current: Job | null;
  queue: Job[];
  freeFrom: string; // the day it has nothing left to do
  idleDays: number; // only meaningful when idle
  progress: number; // 0..1 through the current job
};

export function viewMachine(data: Data, machine: Machine, now = today()): MachineView {
  const jobs = data.jobs.filter((j) => j.machineId === machine.id);
  const current = jobs.find((j) => j.status === 'running') ?? null;
  const queue = jobs.filter((j) => j.status === 'queued');
  const lastDone = jobs
    .filter((j) => j.status === 'done' && j.doneAt)
    .map((j) => j.doneAt as string)
    .sort()
    .at(-1);

  const currentEnd = current?.due && current.due > now ? current.due : now;
  const freeFrom = addDays(currentEnd, queue.reduce((sum, j) => sum + j.days, 0));

  let status: Status;
  if (machine.maintenance) status = 'maintenance';
  else if (!current) status = 'idle';
  else if (current.due && current.due <= now) status = 'check';
  else if (current.due && daysBetween(now, current.due) <= FREE_SOON_DAYS && queue.length === 0) status = 'soon';
  else status = 'running';

  let progress = 0;
  if (current?.start && current.due) {
    const total = Math.max(1, daysBetween(current.start, current.due));
    progress = Math.min(1, Math.max(0, daysBetween(current.start, now) / total));
  }

  return {
    machine,
    status,
    current,
    queue,
    freeFrom,
    idleDays: lastDone ? Math.max(0, daysBetween(lastDone, now)) : 0,
    progress,
  };
}

/** When each queued job should run: each starts when the one before it ends. */
export function queueSchedule(v: MachineView, now = today()) {
  const first = v.current?.due && v.current.due > now ? v.current.due : now;
  return v.queue.reduce<{ job: Job; start: string; end: string }[]>((plan, job) => {
    const start = plan.at(-1)?.end ?? first;
    return [...plan, { job, start, end: addDays(start, job.days) }];
  }, []);
}

export const viewAll = (data: Data, now = today()) => data.machines.map((m) => viewMachine(data, m, now));

export const BOARD_DAYS = 14;
export type Slot = 'booked' | 'check' | 'free' | 'off';

/** The machine's next two weeks, one slot per day starting today. Free slots are the gaps to sell. */
export function slots(v: MachineView, now = today(), days = BOARD_DAYS): Slot[] {
  return Array.from({ length: days }, (_, i) => {
    if (v.status === 'maintenance') return 'off';
    if (i === 0 && v.status === 'check') return 'check';
    return addDays(now, i) < v.freeFrom ? 'booked' : 'free';
  });
}

/** How full the shop is over the next two weeks: booked machine-days out of all available ones. */
export function bookedShare(views: MachineView[], now = today()) {
  const all = views.flatMap((v) => slots(v, now)).filter((s) => s !== 'off');
  return all.length ? all.filter((s) => s !== 'free').length / all.length : 0;
}

/** Machine-days nobody has booked yet in the next two weeks — what the AI will try to fill. */
export const freeDays = (views: MachineView[], now = today()) =>
  views.reduce((sum, v) => sum + slots(v, now).filter((s) => s === 'free').length, 0);

export const STATUS_LABEL: Record<Status, string> = {
  running: 'Running',
  soon: 'Free soon',
  check: 'Check',
  idle: 'Idle',
  maintenance: 'Maintenance',
};

export const jobLabel = (j: Job) => `${j.title}${j.qty ? ` ×${j.qty}` : ''}`;

/** The first day in the next two weeks a machine has nothing booked, and how many free days it has. */
export function gap(v: MachineView, now = today()) {
  const free = slots(v, now);
  const first = free.indexOf('free');
  return first < 0 ? null : { from: addDays(now, first), days: free.filter((x) => x === 'free').length };
}
