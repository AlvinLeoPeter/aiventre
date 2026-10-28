import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { validGstin } from './invoice';
import { type Data, deliveryRecord } from './model';
import { KIND_LABEL, type ShopPhoto } from './photos';
import { backupJson, restoreBackup } from './store';

/** Files that leave the phone: the shop's company profile (PDF) and backups. */

const esc = (s = '') => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function profileHtml(data: Data, photos: ShopPhoto[]) {
  const s = data.shop!;
  const groups = new Map<string, { count: number; details: Set<string> }>();
  for (const m of data.machines) {
    const g = groups.get(m.type) ?? { count: 0, details: new Set<string>() };
    g.count++;
    if (m.details) g.details.add(m.details);
    groups.set(m.type, g);
  }
  const section = (title: string, items?: string[]) =>
    items?.length ? `<section><h2>${esc(title)}</h2><p>${items.map(esc).join(' · ')}</p></section>` : '';
  const contact = [s.owner, s.phone, s.email].filter(Boolean).map((x) => esc(x)).join(' · ');
  const place = [s.address, s.area, s.city, s.state, s.pincode].filter(Boolean).join(', ');
  const record = deliveryRecord(data.jobs);
  const badges = [
    s.gstin && validGstin(s.gstin) && `GST registered · ${s.gstin}`,
    s.udyam && `Udyam (MSME) · ${s.udyam}`,
    ...(s.certifications ?? []),
  ].filter(Boolean) as string[];

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 16mm; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; font-size: 12.5px; line-height: 1.5; }
  header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 14px; }
  h1 { font-size: 28px; letter-spacing: -0.5px; margin: 2px 0 2px; }
  .where { color: #5f6368; margin: 0; }
  .summary { font-size: 15px; margin: 10px 0 0; max-width: 580px; }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .badge { border: 1px solid #c9ccd1; border-radius: 999px; padding: 3px 10px; font-size: 11.5px; font-weight: 600; }
  .record { display: flex; align-items: baseline; gap: 12px; border: 1px solid #d7dbd7; background: #f4f7f4; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; break-inside: avoid; }
  .record b { font-size: 26px; }
  h2 { font-size: 13px; font-weight: 600; margin: 0 0 4px; }
  section { margin-bottom: 14px; break-inside: avoid; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .photos figure { margin: 0; break-inside: avoid; }
  .photos img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; display: block; }
  .photos figcaption { font-size: 10.5px; color: #5f6368; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th { text-align: left; color: #5f6368; font-weight: 500; border-bottom: 1px solid #e8e8e8; padding: 6px 0; }
  td { border-bottom: 1px solid #f0f0f0; padding: 6px 0; vertical-align: top; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e8e8e8; }
  .muted { color: #5f6368; font-size: 11px; }
</style></head><body>
<header>
  <h1>${esc(s.name)}</h1>
  <p class="where">${esc(place)}</p>
  ${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}
  ${badges.length ? `<div class="badges">${badges.map((b) => `<span class="badge">${esc(b)}</span>`).join('')}</div>` : ''}
</header>
${
  record.enough
    ? `<div class="record"><b>${Math.round(record.share * 100)}%</b><span>of jobs finished by the planned date — ${record.onTime} of ${record.jobs} in the last year, tracked in Aiventre</span></div>`
    : ''
}
${
  photos.length
    ? `<div class="photos">${photos
        .map((p) => `<figure><img src="data:image/jpeg;base64,${p.data}" alt="${esc(p.caption || KIND_LABEL[p.kind])}"><figcaption>${esc(p.caption || KIND_LABEL[p.kind])}</figcaption></figure>`)
        .join('')}</div>`
    : ''
}
${section('What we do', [...(s.work ?? []).filter((w) => w !== 'Other'), ...(s.capabilities ?? [])])}
<section><h2>Machines</h2>
  <table><tr><th>Machine</th><th>Qty</th><th>Details</th></tr>
  ${[...groups].map(([t, g]) => `<tr><td>${esc(t)}</td><td>${g.count}</td><td>${esc([...g.details].join('; '))}</td></tr>`).join('')}
  </table>
</section>
${
  s.inspection?.length
    ? `<section><h2>Quality and inspection</h2><p>${s.inspection.map(esc).join(' · ')}</p><p class="muted">Inspection report with each batch on request.</p></section>`
    : ''
}
${section('Materials', s.materials)}
${section('Industries we serve', s.industries)}
${section('Customers we have served', s.customers)}
${s.reach ? `<section><h2>Delivery</h2><p>Within about ${s.reach} km of ${esc(s.city)}</p></section>` : ''}
<footer>
  ${contact ? `<h2>Contact</h2><p>${contact}</p>` : ''}
  ${s.gstin ? `<p class="muted">Check our GST registration: services.gst.gov.in → Search Taxpayer → ${esc(s.gstin)}. You are welcome to visit our shop.</p>` : '<p class="muted">You are welcome to visit our shop.</p>'}
</footer>
</body></html>`;
}

/** Makes the profile PDF and opens the share sheet (WhatsApp, email, Drive…). */
export async function shareProfile(data: Data, photos: ShopPhoto[] = []) {
  const html = profileHtml(data, photos);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${data.shop?.name} — company profile` });
}

/** Everything on this phone in one file, to keep somewhere safe. */
export async function shareBackup() {
  const name = `aiventre-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([backupJson()], { type: 'application/json' }));
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(backupJson());
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Aiventre backup' });
}

/** Picks a backup file and replaces this phone's data with it. Returns false if cancelled. */
export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (result.canceled) return false;
  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  restoreBackup(text);
  return true;
}
