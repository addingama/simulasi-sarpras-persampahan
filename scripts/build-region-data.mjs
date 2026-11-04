import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const raw = JSON.parse(await readFile(new URL('region-details.raw.json', root), 'utf8'));
const provinces = parseCsv(await readFile(new URL('provinces.csv', root), 'utf8'));
const regencies = parseCsv(await readFile(new URL('regencies.csv', root), 'utf8'));
const provinceNames = new Map(provinces.map(row => [row.id, row.name]));

const aliases = new Map([
  ['kabtobasamosir', 'kabtoba'],
  ['kabkepulauanseribu', 'kabkepulauanseribu'],
  ['kabmahakamhulu', 'kabmahakamulu'],
  ['kabpangkajenekepulauan', 'kabpangkajenedankepulauan'],
  ['kabsiautagulandangbiaro', 'kabkepsiautagulandangbiaro'],
  ['kabtanimbar', 'kabkepulauantanimbar'],
]);

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/).map(line => line.split(','));
  return rows.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])));
}

function key(name) {
  return name.toLowerCase()
    .replace(/kabupaten administrasi/g, 'kab')
    .replace(/kota administrasi/g, 'kota')
    .replace(/kabupaten/g, 'kab')
    .replace(/kota/g, 'kota')
    .replace(/kepulauan/g, 'kepulauan')
    .replace(/[^a-z0-9]/g, '');
}

const lookup = new Map(regencies.map(row => [key(row.name), provinceNames.get(row.province_id)]));
for (const [from, to] of aliases) {
  const match = regencies.find(row => key(row.name) === key(to));
  if (match) lookup.set(key(from), provinceNames.get(match.province_id));
}

const enriched = raw.map(item => ({ ...item, p: lookup.get(key(item.n)) ?? null }));
const unmatched = enriched.filter(item => !item.p).map(item => item.n);
if (unmatched.length) {
  console.error(`Wilayah tanpa kecocokan (${unmatched.length}):`, unmatched.join(', '));
  process.exitCode = 1;
} else {
  await writeFile(new URL('region-details.json', root), JSON.stringify(enriched));
  console.log(`Berhasil mencocokkan ${enriched.length} kabupaten/kota.`);
}
