import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Data } from './model';
import { backupJson, restoreBackup } from './store';

/** Files that leave the phone: the shop's capability profile (PDF) and backups. */

const esc = (s = '') => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function profileHtml(data: Data) {
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

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; font-size: 13px; line-height: 1.5; }
  header { border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 18px; }
  h1 { font-size: 30px; letter-spacing: -0.5px; margin: 2px 0 2px; }
  .where { color: #5f6368; margin: 0; }
  .summary { font-size: 16px; margin: 10px 0 0; max-width: 560px; }
  h2 { font-size: 13px; font-weight: 600; margin: 0 0 4px; }
  section { margin-bottom: 16px; break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th { text-align: left; color: #5f6368; font-weight: 500; border-bottom: 1px solid #e8e8e8; padding: 6px 0; }
  td { border-bottom: 1px solid #f0f0f0; padding: 7px 0; vertical-align: top; }
  footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e8e8e8; }
</style></head><body>
<header>
  <h1>${esc(s.name)}</h1>
  <p class="where">${esc([s.area, s.city, s.state, s.pincode].filter(Boolean).join(', '))}</p>
  ${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}
</header>
${section('What we do', [...(s.work ?? []).filter((w) => w !== 'Other'), ...(s.capabilities ?? [])])}
<section><h2>Machines</h2>
  <table><tr><th>Machine</th><th>Qty</th><th>Details</th></tr>
  ${[...groups].map(([t, g]) => `<tr><td>${esc(t)}</td><td>${g.count}</td><td>${esc([...g.details].join('; '))}</td></tr>`).join('')}
  </table>
</section>
${section('Materials', s.materials)}
${section('Industries we serve', s.industries)}
${section('Certifications', s.certifications)}
${s.reach ? `<section><h2>Delivery</h2><p>Within about ${s.reach} km of ${esc(s.city)}</p></section>` : ''}
<footer>${contact ? `<h2>Contact</h2><p>${contact}</p>` : ''}</footer>
</body></html>`;
}

/** Makes the one-page PDF and opens the share sheet (WhatsApp, email, Drive…). */
export async function shareProfile(data: Data) {
  const html = profileHtml(data);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${data.shop?.name} — capability profile` });
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
