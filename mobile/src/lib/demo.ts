import { addDays, type Data, today } from './model';

/** Kinds of job work, offered as chips during setup. */
export const WORK_TYPES = [
  'CNC / VMC machining',
  'CNC turning',
  'Sheet metal',
  'Fabrication & welding',
  'Injection moulding',
  'Casting',
  'Grinding',
  'Powder coating',
  'Laser cutting',
  'Other',
];

/** Machine types offered as quick-add chips. */
export const MACHINE_TYPES = [
  'VMC',
  'HMC',
  'CNC lathe',
  'Conventional lathe',
  'Milling machine',
  'Drilling machine',
  'Grinder',
  'Press brake',
  'Power press',
  'Laser cutter',
  'Welding station',
  'Moulding machine',
];

/** A realistic sample shop with a machine in every state. Dates are relative to today. */
export function demoData(): Data {
  const t = today();
  const d = (n: number) => addDays(t, n);
  const job = (o: Partial<Data['jobs'][number]> & Pick<Data['jobs'][number], 'id' | 'machineId' | 'title' | 'days' | 'status'>) => ({
    customer: '',
    qty: null,
    start: null,
    due: null,
    doneAt: null,
    notificationId: null,
    ...o,
  });

  return {
    version: 1,
    shop: { name: 'Sharma Precision', owner: 'Rajesh', city: 'Chakan, Pune', work: ['CNC / VMC machining', 'CNC turning'] },
    machines: [
      { id: 'm1', name: 'VMC 1', type: 'VMC', details: 'Haas · 850 mm travel', maintenance: false },
      { id: 'm2', name: 'VMC 2', type: 'VMC', details: 'BFW · 850 mm travel', maintenance: false },
      { id: 'm3', name: 'CNC lathe 1', type: 'CNC lathe', details: 'Ace Jobber XL', maintenance: false },
      { id: 'm4', name: 'CNC lathe 2', type: 'CNC lathe', details: 'Ace Jobber', maintenance: false },
      { id: 'm5', name: 'HMC', type: 'HMC', details: '500 mm pallet', maintenance: true },
    ],
    jobs: [
      job({ id: 'j1', machineId: 'm1', title: 'Gearbox bracket', customer: 'Mahindra vendor, Chakan', qty: 500, days: 7, status: 'running', start: d(-4), due: d(3) }),
      job({ id: 'j2', machineId: 'm1', title: 'Pump housing', customer: 'Kirloskar supplier', qty: 120, days: 5, status: 'queued' }),
      job({ id: 'j3', machineId: 'm2', title: 'Flange', customer: 'Valve maker, Bhosari', qty: 200, days: 4, status: 'running', start: d(-5), due: d(-1) }),
      job({ id: 'j4', machineId: 'm3', title: 'Drive shaft', customer: 'Tractor parts, Nashik', qty: 300, days: 6, status: 'running', start: d(-5), due: d(1) }),
      job({ id: 'j5', machineId: 'm4', title: 'Bush', customer: 'Local trader', qty: 1000, days: 3, status: 'done', start: d(-6), due: d(-3), doneAt: d(-3) }),
    ],
  };
}
