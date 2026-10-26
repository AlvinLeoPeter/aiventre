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
};

export type Data = {
  version: 1;
  shop: Shop | null; // null until onboarding is done
  machines: Machine[];
  jobs: Job[];
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
