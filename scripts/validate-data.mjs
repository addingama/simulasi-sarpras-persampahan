import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const details = JSON.parse(await readFile(new URL('region-details.json', root), 'utf8'));
const geojson = JSON.parse(await readFile(new URL('indonesia-38-provinces.geojson', root), 'utf8'));
const provincesCsv = await readFile(new URL('provinces.csv', root), 'utf8');
const regenciesCsv = await readFile(new URL('regencies.csv', root), 'utf8');

const errors = [];
const allowedPriority = new Set(['P1', 'P2', 'P3', 'P4']);
const allowedPusdal = new Set(['Sumatera', 'Jawa', 'Kalimantan', 'Sulawesi & Maluku', 'Bali & Nusa Tenggara', 'Papua']);
const numericFields = ['t', 'e', 'b', 'g', 'c', 'd'];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function approximately(actual, expected, tolerance, label) {
  assert(Math.abs(actual - expected) <= tolerance, `${label}: diharapkan sekitar ${expected}, ditemukan ${actual}`);
}

assert(Array.isArray(details), 'region-details.json harus berupa array.');
assert(details.length === 514, `Jumlah daerah harus 514, ditemukan ${details.length}.`);
assert(new Set(details.map(row => row.n)).size === 514, 'Nama kabupaten/kota harus unik.');
assert(new Set(details.map(row => row.p)).size === 38, 'Dataset harus mencakup 38 provinsi.');
assert(new Set(details.map(row => row.s)).size === 6, 'Dataset harus mencakup 6 wilayah Pusdal.');

details.forEach((row, index) => {
  const position = `Baris ${index + 1} (${row.n || 'tanpa nama'})`;
  assert(typeof row.n === 'string' && row.n.length > 0, `${position}: nama daerah kosong.`);
  assert(typeof row.p === 'string' && row.p.length > 0, `${position}: provinsi kosong.`);
  assert(allowedPusdal.has(row.s), `${position}: Pusdal tidak dikenal: ${row.s}.`);
  assert(typeof row.k === 'string' && row.k.length > 0, `${position}: kategori wilayah kosong.`);
  assert(allowedPriority.has(String(row.q).slice(0, 2)), `${position}: prioritas tidak valid: ${row.q}.`);
  numericFields.forEach(field => assert(Number.isFinite(row[field]), `${position}: ${field} bukan angka valid.`));
  ['t', 'e', 'b', 'g', 'd'].forEach(field => assert(row[field] >= 0, `${position}: ${field} tidak boleh negatif.`));
  assert(row.c >= 0 && row.c <= 100, `${position}: persentase pemenuhan di luar rentang 0–100.`);
});

const sum = field => details.reduce((total, row) => total + row[field], 0);
approximately(sum('t'), 144574.65, 1, 'Total timbulan');
approximately(sum('e'), 92959.80, 0.1, 'Kapasitas angkut eksisting');
approximately(sum('b'), 125789.78, 0.1, 'Kebutuhan kapasitas angkut');
approximately(sum('g'), 51729.61, 0.1, 'Gap kapasitas angkut');
approximately(sum('d'), 9755, 0, 'Tambahan dump truck');

assert(geojson.type === 'FeatureCollection', 'GeoJSON harus berupa FeatureCollection.');
assert(geojson.features?.length === 38, `GeoJSON harus memiliki 38 fitur provinsi, ditemukan ${geojson.features?.length ?? 0}.`);
assert(provincesCsv.trim().split(/\r?\n/).length - 1 === 38, 'provinces.csv harus memiliki 38 baris data.');
assert(regenciesCsv.trim().split(/\r?\n/).length - 1 === 514, 'regencies.csv harus memiliki 514 baris data.');

if (errors.length) {
  console.error(`Validasi gagal dengan ${errors.length} masalah:`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Validasi data berhasil: 514 daerah, 38 provinsi, 6 Pusdal, dan agregat nasional konsisten.');
