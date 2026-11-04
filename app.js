const provinces = [
  'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Bangka Belitung','Kepulauan Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'
].map(name => ({ name }));

const fmt = number => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number || 0);
const normalized = value => value.toLowerCase().replace(/^provinsi\s+/, '').replace(/^daerah istimewa\s+/, 'di ').replace(/^daerah khusus ibukota\s+/, 'dki ').replace(/^kepulauan\s+/, '').replace(/[^a-z]/g, '');
const provinceKey = normalized;
const provinceByName = new Map(provinces.map(province => [provinceKey(province.name), province]));

let regionDetails = [];
let activeProvince = '';
let rankBy = 'gap';
let detailsReady;
let mapReady;

function selectedRows() {
  const pusdal = document.querySelector('#pusdalFilter').value;
  const category = document.querySelector('#categoryFilter').value;
  const priority = document.querySelector('#nationalPriorityFilter').value;
  return regionDetails.filter(row =>
    (pusdal === 'all' || row.s === pusdal) &&
    (category === 'all' || row.k === category) &&
    (priority === 'all' || row.q.startsWith(priority))
  );
}

function aggregateRows(rows) {
  const waste = rows.reduce((sum, row) => sum + row.t, 0);
  const existing = rows.reduce((sum, row) => sum + row.e, 0);
  const needed = rows.reduce((sum, row) => sum + row.b, 0);
  const gap = rows.reduce((sum, row) => sum + row.g, 0);
  const trucks = rows.reduce((sum, row) => sum + row.d, 0);
  return { count: rows.length, waste, existing, needed, gap, trucks, coverage: needed ? Math.min(100, existing / needed * 100) : 0 };
}

function provinceAggregates(rows = selectedRows()) {
  return provinces.map(province => {
    const provinceRows = rows.filter(row => provinceKey(row.p) === provinceKey(province.name));
    return { name: province.name, rows: provinceRows, ...aggregateRows(provinceRows) };
  }).filter(province => province.count > 0);
}

function renderNational() {
  const rows = selectedRows();
  const totals = aggregateRows(rows);
  document.querySelector('#kpiRegions').textContent = fmt(totals.count);
  document.querySelector('#kpiWaste').textContent = fmt(totals.waste);
  document.querySelector('#kpiCoverage').textContent = `${totals.coverage.toFixed(1).replace('.', ',')}%`;
  document.querySelector('#kpiGap').textContent = fmt(totals.gap);
  document.querySelector('#kpiTrucks').textContent = fmt(totals.trucks);
  document.querySelector('#filterSummary').textContent = totals.count === 514
    ? 'Menampilkan seluruh 514 kabupaten/kota.'
    : `Menampilkan ${fmt(totals.count)} dari 514 kabupaten/kota.`;
}

function renderRanking() {
  const items = provinceAggregates().sort((a, b) => rankBy === 'gap' ? b.gap - a.gap : a.coverage - b.coverage).slice(0, 7);
  if (!items.length) {
    document.querySelector('#rankList').innerHTML = '<div class="filter-empty">Tidak ada provinsi yang sesuai filter.</div>';
    return;
  }
  const max = Math.max(...items.map(item => rankBy === 'gap' ? item.gap : 100 - item.coverage), 1);
  document.querySelector('#rankList').innerHTML = items.map((province, index) => `<div class="rank-item" data-province="${province.name}" tabindex="0"><span class="num">${String(index + 1).padStart(2, '0')}</span><div><div class="rank-name">${province.name}</div><div class="rank-track"><i style="width:${((rankBy === 'gap' ? province.gap : 100 - province.coverage) / max) * 100}%"></i></div></div><div class="rank-value"><strong>${rankBy === 'gap' ? fmt(province.gap) : province.coverage.toFixed(1) + '%'}</strong><small>${rankBy === 'gap' ? 'ton/hari' : 'terpenuhi'}</small></div></div>`).join('');
  document.querySelectorAll('.rank-item').forEach(element => {
    element.addEventListener('click', () => openProvince(element.dataset.province));
    element.addEventListener('keydown', event => { if (event.key === 'Enter') openProvince(element.dataset.province); });
  });
}

function renderChart() {
  const metric = document.querySelector('#metricSelect').value;
  const items = provinceAggregates().sort((a, b) => b[metric] - a[metric]).slice(0, 14).reverse();
  if (!items.length) {
    document.querySelector('#barChart').innerHTML = '<div class="filter-empty">Tidak ada data untuk divisualisasikan.</div>';
    return;
  }
  const max = Math.max(...items.map(item => item[metric]), 1);
  document.querySelector('#barChart').innerHTML = items.map(province => `<div class="bar" title="${province.name}: ${metric === 'coverage' ? province[metric].toFixed(1) + '%' : fmt(province[metric])}"><i style="height:${(province[metric] / max) * 100}%"></i><span>${province.name}</span></div>`).join('');
}

function mapColor(coverage) {
  return coverage >= 90 ? '#9bda70' : coverage >= 70 ? '#e1c45c' : coverage >= 50 ? '#e88858' : '#e45f54';
}

function updateMap() {
  const aggregates = new Map(provinceAggregates().map(province => [provinceKey(province.name), province]));
  document.querySelectorAll('#provinces path').forEach(path => {
    const data = aggregates.get(path.dataset.province);
    path.classList.toggle('filtered-out', !data);
    path.style.fill = data ? mapColor(data.coverage) : '#496158';
    path.dataset.coverage = data ? data.coverage.toFixed(1) : '';
    path.dataset.gap = data ? String(data.gap) : '';
  });
}

function ringToPath(ring) {
  return ring.map((point, index) => {
    const x = (point[0] - 94) / 48 * 900;
    const y = (7 - point[1]) / 19 * 360;
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('') + 'Z';
}

function geometryToPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.map(ringToPath)).join('');
}

async function renderMap() {
  const group = document.querySelector('#provinces');
  const tooltip = document.querySelector('#mapTooltip');
  const wrap = document.querySelector('.map-wrap');
  try {
    const geojson = await fetch('indonesia-38-provinces.geojson').then(response => {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    });
    geojson.features.forEach(feature => {
      const sourceName = feature.properties.PROVINSI || feature.properties.provinsi || feature.properties.name;
      const province = provinceByName.get(provinceKey(sourceName));
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', geometryToPath(feature.geometry));
      path.setAttribute('aria-label', province?.name || sourceName);
      path.dataset.province = provinceKey(province?.name || sourceName);
      path.addEventListener('pointermove', event => {
        if (path.classList.contains('filtered-out')) return;
        const box = wrap.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - box.left}px`;
        tooltip.style.top = `${event.clientY - box.top}px`;
        tooltip.innerHTML = `<strong>${province?.name || sourceName}</strong><span>Pemenuhan <b>${path.dataset.coverage}%</b></span><span>Gap <b>${fmt(Number(path.dataset.gap))} ton/hari</b></span><span>Klik untuk drill-down</span>`;
        tooltip.classList.add('show');
      });
      path.addEventListener('pointerleave', () => tooltip.classList.remove('show'));
      path.addEventListener('click', () => openProvince(province?.name || sourceName));
      group.appendChild(path);
    });
    updateMap();
  } catch (error) {
    group.innerHTML = '<text x="450" y="180" text-anchor="middle" fill="#90a89e">Peta tidak dapat dimuat</text>';
  }
}

function renderDashboard() {
  renderNational();
  renderRanking();
  renderChart();
  updateMap();
}

async function openProvince(name) {
  await detailsReady;
  const province = provinceAggregates().find(item => provinceKey(item.name) === provinceKey(name));
  if (!province) return;
  activeProvince = province.name;
  const rows = province.rows;
  document.querySelector('#detailTitle').textContent = activeProvince;
  document.querySelector('#detailSubtitle').textContent = `${rows.length} kabupaten/kota sesuai filter nasional`;
  document.querySelector('#detailCoverage').textContent = `${province.coverage.toFixed(1)}%`;
  document.querySelector('#detailKpis').innerHTML = `<article><span>Timbulan</span><strong>${fmt(province.waste)}</strong><small>ton/hari</small></article><article><span>Gap kapasitas</span><strong>${fmt(province.gap)}</strong><small>ton/hari</small></article><article><span>Tambahan armada</span><strong>${fmt(province.trucks)}</strong><small>dump truck</small></article><article><span>Wilayah kritis</span><strong>${rows.filter(row => row.q.startsWith('P1')).length}</strong><small>kabupaten/kota</small></article>`;
  document.querySelector('#regionSearch').value = '';
  document.querySelector('#priorityFilter').value = 'all';
  renderRegionRows();
  const overlay = document.querySelector('#detailOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderRegionRows() {
  const query = document.querySelector('#regionSearch').value.toLowerCase();
  const priority = document.querySelector('#priorityFilter').value;
  const rows = selectedRows().filter(row => provinceKey(row.p) === provinceKey(activeProvince) && row.n.toLowerCase().includes(query) && (priority === 'all' || row.q.startsWith(priority))).sort((a, b) => b.g - a.g);
  document.querySelector('#regionRows').innerHTML = rows.length ? rows.map(row => `<tr><td><strong>${row.n}</strong><br><small>${row.k}</small></td><td><span class="priority-pill ${row.q.slice(0, 2).toLowerCase()}">${row.q}</span></td><td>${fmt(row.t)} t/hari</td><td>${row.c.toFixed(1)}%</td><td>${fmt(row.g)} t/hari</td><td>${fmt(row.d)} unit</td></tr>`).join('') : '<tr class="empty-row"><td colspan="6">Tidak ada daerah yang cocok.</td></tr>';
}

function closeDetails() {
  const overlay = document.querySelector('#detailOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function loadDetails() {
  regionDetails = await fetch('region-details.json').then(response => response.json());
  const categories = [...new Set(regionDetails.map(row => row.k))].sort();
  document.querySelector('#categoryFilter').insertAdjacentHTML('beforeend', categories.map(category => `<option>${category}</option>`).join(''));
  renderDashboard();
}

document.querySelector('#sortBtn').addEventListener('click', event => {
  rankBy = rankBy === 'gap' ? 'coverage' : 'gap';
  event.currentTarget.textContent = rankBy === 'gap' ? 'Pemenuhan ↕' : 'Gap ↕';
  renderRanking();
});
document.querySelector('#metricSelect').addEventListener('change', renderChart);
document.querySelector('#themeBtn').addEventListener('click', () => document.body.classList.toggle('light'));
['pusdalFilter', 'categoryFilter', 'nationalPriorityFilter'].forEach(id => document.querySelector(`#${id}`).addEventListener('change', renderDashboard));
document.querySelector('#resetFilters').addEventListener('click', () => {
  ['pusdalFilter', 'categoryFilter', 'nationalPriorityFilter'].forEach(id => { document.querySelector(`#${id}`).value = 'all'; });
  renderDashboard();
});
document.querySelector('#detailClose').addEventListener('click', closeDetails);
document.querySelector('#detailOverlay').addEventListener('click', event => { if (event.target.id === 'detailOverlay') closeDetails(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetails(); });
document.querySelector('#regionSearch').addEventListener('input', renderRegionRows);
document.querySelector('#priorityFilter').addEventListener('change', renderRegionRows);

detailsReady = loadDetails();
mapReady = renderMap();
Promise.all([detailsReady, mapReady]).then(renderDashboard);
