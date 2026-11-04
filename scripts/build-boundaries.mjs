import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const sourcePath = resolve(process.argv[2] || '/tmp/sarpras-kab-kota.geojson');
const root = new URL('../', import.meta.url);
const outputDir = new URL('boundaries/', root);
const tolerance = 0.002;

function squaredDistance(a, b) {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  return x * x + y * y;
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx || dy) {
    const ratio = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (ratio > 1) {
      x = end[0];
      y = end[1];
    } else if (ratio > 0) {
      x += dx * ratio;
      y += dy * ratio;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function radialSimplify(points, squaredTolerance) {
  let previous = points[0];
  const simplified = [previous];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (squaredDistance(point, previous) > squaredTolerance) {
      simplified.push(point);
      previous = point;
    }
  }
  if (previous !== points.at(-1)) simplified.push(points.at(-1));
  return simplified;
}

function douglasPeucker(points, squaredTolerance) {
  const markers = new Uint8Array(points.length);
  const stack = [0, points.length - 1];
  markers[0] = 1;
  markers[points.length - 1] = 1;
  while (stack.length) {
    const last = stack.pop();
    const first = stack.pop();
    let maxDistance = 0;
    let furthest = 0;
    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredSegmentDistance(points[index], points[first], points[last]);
      if (distance > maxDistance) {
        furthest = index;
        maxDistance = distance;
      }
    }
    if (maxDistance > squaredTolerance) {
      markers[furthest] = 1;
      stack.push(first, furthest, furthest, last);
    }
  }
  return points.filter((_, index) => markers[index]);
}

function simplifyRing(ring) {
  if (ring.length <= 8) return ring;
  const open = ring.slice(0, -1);
  const squaredTolerance = tolerance * tolerance;
  let simplified = radialSimplify(open, squaredTolerance);
  simplified = douglasPeucker(simplified, squaredTolerance);
  if (simplified.length < 3) return ring;
  return [...simplified, simplified[0]];
}

function simplifyGeometry(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const coordinates = polygons.map(polygon => polygon.map(simplifyRing));
  return { type: geometry.type, coordinates: geometry.type === 'Polygon' ? coordinates[0] : coordinates };
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
if (source.type !== 'FeatureCollection' || source.features?.length !== 514) {
  throw new Error('Sumber batas harus berupa FeatureCollection dengan 514 fitur.');
}

const groups = new Map();
for (const feature of source.features) {
  const provinceCode = String(feature.properties.code).split('.')[0];
  if (!groups.has(provinceCode)) groups.set(provinceCode, []);
  groups.get(provinceCode).push({
    type: 'Feature',
    properties: { code: feature.properties.code, name: feature.properties.name, level: feature.properties.level },
    geometry: simplifyGeometry(feature.geometry)
  });
}

await mkdir(outputDir, { recursive: true });
const manifest = {};
for (const [code, features] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const filename = `${code}.geojson`;
  await writeFile(new URL(filename, outputDir), JSON.stringify({ type: 'FeatureCollection', features }));
  manifest[code] = { file: filename, count: features.length };
}
await writeFile(new URL('index.json', outputDir), JSON.stringify(manifest, null, 2) + '\n');

console.log(`Berhasil membangun ${source.features.length} batas kabupaten/kota dari ${basename(sourcePath)} ke ${groups.size} berkas provinsi.`);
