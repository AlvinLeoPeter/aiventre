import { addDays, type Data, today } from './model';

/** Kinds of job work, and the machines each one usually runs on. Setup suggests machines from the work picked. */
export const WORK: Record<string, string[]> = {
  'CNC / VMC machining': ['VMC', 'HMC', 'CNC milling', 'Drilling machine', 'Tapping machine'],
  'CNC turning': ['CNC lathe', 'Turn-mill centre', 'Conventional lathe', 'Traub / auto lathe'],
  'Sheet metal': ['Press brake', 'Shearing machine', 'Turret punch', 'Power press', 'Rolling machine'],
  'Fabrication & welding': ['MIG welder', 'TIG welder', 'Arc welder', 'Plasma cutter', 'Bandsaw'],
  'Injection moulding': ['Injection moulding machine', 'Mould dryer', 'Granulator'],
  Casting: ['Induction furnace', 'Moulding line', 'Core shooter', 'Shot blasting', 'Fettling station'],
  Grinding: ['Surface grinder', 'Cylindrical grinder', 'Centreless grinder', 'Tool & cutter grinder'],
  'Powder coating': ['Powder booth', 'Curing oven', 'Pretreatment line'],
  'Laser cutting': ['Fiber laser', 'CO2 laser', 'Tube laser'],
  'Gear cutting': ['Hobbing machine', 'Gear shaper', 'Gear grinder'],
  'EDM / wire cut': ['Wire EDM', 'Spark EDM', 'Hole drilling EDM'],
  'Heat treatment': ['Hardening furnace', 'Induction hardening', 'Tempering furnace'],
};

export const WORK_TYPES = [...Object.keys(WORK), 'Other'];

const ALL_MACHINES = [...new Set(Object.values(WORK).flat())];

/** Machines to offer as quick-add chips: those for the work the shop does, else every one we know. */
export const machineTypesFor = (work: string[]) => {
  const picked = [...new Set(work.flatMap((w) => WORK[w] ?? []))];
  return picked.length ? picked : ALL_MACHINES;
};

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
    shop: {
      name: 'Sharma Precision',
      owner: 'Rajesh',
      area: 'Chakan MIDC',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '410501',
      reach: 100,
      work: ['CNC / VMC machining', 'CNC turning'],
    },
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
