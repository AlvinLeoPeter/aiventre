import { nextInvoiceNumber } from './invoice';
import { addDays, type Data, type Invoice, today } from './model';

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

  // Sample invoices (made-up GSTINs that pass the format check): one paid, one overdue and part paid, one to another state.
  const invoices: Invoice[] = [];
  const bill = (o: Omit<Invoice, 'number' | 'cancelled' | 'createdAt' | 'ref' | 'notes' | 'gstRate'> & Partial<Pick<Invoice, 'ref'>>) =>
    invoices.unshift({ ref: '', notes: '', gstRate: 18, cancelled: false, createdAt: `${o.date}T10:00:00.000Z`, number: nextInvoiceNumber(invoices, o.date), ...o });
  const buyer = (name: string, gstin: string, state: string, address: string) => ({ name, gstin, state, address, phone: '', email: '' });
  bill({
    id: 'i1',
    date: d(-40),
    dueDate: d(-10),
    buyer: buyer('Mahindra vendor, Chakan', '27AABCV0000B1ZA', 'Maharashtra', 'Chakan MIDC Phase 2, Pune'),
    ref: 'PO 4471',
    lines: [{ description: 'Machining of gearbox bracket', hsn: '9988', qty: 400, unit: 'Nos', rate: 145 }],
    placeOfSupply: '27',
    inter: false,
    payments: [{ id: 'p1', at: d(-12), amount: 68440, note: 'NEFT / RTGS' }],
  });
  bill({
    id: 'i2',
    date: d(-35),
    dueDate: d(-5),
    buyer: buyer('Valve maker, Bhosari', '', 'Maharashtra', 'Bhosari MIDC, Pune'),
    lines: [
      { description: 'Flange machining, Drg F-220', hsn: '9988', qty: 150, unit: 'Nos', rate: 210 },
      { description: 'Facing and drilling, Drg F-221', hsn: '9988', qty: 150, unit: 'Nos', rate: 95 },
    ],
    placeOfSupply: '27',
    inter: false,
    payments: [{ id: 'p2', at: d(-6), amount: 25000, note: 'UPI' }],
  });
  bill({
    id: 'i3',
    date: d(-8),
    dueDate: d(22),
    buyer: buyer('Pump maker, Coimbatore', '33AAAAA0000A1Z9', 'Tamil Nadu', 'SIDCO Industrial Estate, Kurichi, Coimbatore'),
    lines: [{ description: 'Pump housing machining', hsn: '9988', qty: 60, unit: 'Nos', rate: 640 }],
    placeOfSupply: '33',
    inter: true,
    payments: [],
  });

  return {
    version: 1,
    invoices,
    suppliers: [
      {
        id: 's1',
        name: 'Sample Tools & Traders, Bhosari',
        city: 'Pune',
        phone: '',
        email: '',
        website: '',
        sells: ['Carbide end mills', 'Turning inserts'],
        notes: '',
        savedAt: `${t}T09:00:00.000Z`,
      },
    ],
    shop: {
      name: 'Sharma Precision',
      gstin: '27AAAAA0000A1Z2',
      udyam: 'UDYAM-MH-26-0000001',
      inspection: ['Vernier caliper', 'Micrometer', 'Height gauge', 'Bore gauge', 'Thread gauges'],
      customers: ['Mahindra vendor, Chakan', 'Valve maker, Bhosari'],
      summary: 'CNC turning and VMC machining of tractor, pump and valve parts in EN8, cast iron and aluminium. Batches of 50 to 2,000.',
      phone: '98220 00000',
      address: 'Plot 14, Chakan Industrial Area',
      bank: { name: 'Sample Bank', account: '000012345678', ifsc: 'SMPL0001234', upi: 'sharmaprecision@upi' },
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
      // Older finished jobs, for the on-time record: one ran a day late.
      ...[
        ['j6', 'm1', 'Gearbox bracket', 'Mahindra vendor, Chakan', 400, -40, 7, 0],
        ['j7', 'm2', 'Flange', 'Valve maker, Bhosari', 300, -45, 4, 0],
        ['j8', 'm3', 'Drive shaft', 'Tractor parts, Nashik', 250, -50, 6, 1],
        ['j9', 'm1', 'Pump housing', 'Kirloskar supplier', 120, -60, 5, 0],
        ['j10', 'm4', 'Bush', 'Local trader', 800, -70, 3, 0],
        ['j11', 'm2', 'Valve body', 'Valve maker, Bhosari', 150, -80, 6, 0],
      ].map(([id, machineId, title, customer, qty, end, days, late]) =>
        job({
          id: id as string,
          machineId: machineId as string,
          title: title as string,
          customer: customer as string,
          qty: qty as number,
          days: days as number,
          status: 'done',
          start: d((end as number) - (days as number)),
          due: d((end as number) + (late as number)),
          firstDue: d(end as number),
          doneAt: d((end as number) + (late as number)),
        }),
      ),
    ],
  };
}
