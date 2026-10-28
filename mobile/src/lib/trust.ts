import { validGstin } from './invoice';
import { type Data, deliveryRecord, RECORD_MIN_JOBS } from './model';

/** What a buyer checks before giving work to a shop they've never heard of. */

export const UDYAM = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export function trustSteps(data: Data, photoCount: number) {
  const shop = data.shop;
  return [
    { label: 'GSTIN', why: 'Buyers look it up on the GST website', done: !!shop?.gstin && validGstin(shop.gstin) },
    { label: 'Udyam (MSME) number', why: 'Shows a registered small business', done: !!shop?.udyam && UDYAM.test(shop.udyam) },
    { label: 'Shop address', why: 'So they can visit', done: !!shop?.address?.trim() },
    { label: 'At least 3 photos', why: 'Machines, shop floor, parts you made', done: photoCount >= 3 },
    { label: 'Measuring instruments', why: 'Shows you can check what you make', done: !!shop?.inspection?.length },
    { label: 'On-time record', why: `Builds itself after ${RECORD_MIN_JOBS} finished jobs`, done: deliveryRecord(data.jobs).enough },
  ];
}
