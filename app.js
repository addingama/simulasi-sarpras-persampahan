const provinces = [
['Aceh',2499,100,435],['Sumatera Utara',8365,62.24,3555],['Sumatera Barat',2818,80.17,771],['Riau',3818,51.94,1874],['Jambi',1893,54.75,838],['Sumatera Selatan',4400,57.49,1963],['Bengkulu',1007,71.21,384],['Lampung',4667,33.99,3072],['Bangka Belitung',685,100,47],['Kepulauan Riau',1730,94.09,367],['DKI Jakarta',8702,100,0],['Jawa Barat',25660,56.66,10915],['Jawa Tengah',17311,57.18,7653],['DI Yogyakarta',1925,88.64,477],['Jawa Timur',18076,57.95,6408],['Banten',8289,57.79,3194],['Bali',3796,72.83,796],['Nusa Tenggara Barat',2543,64.72,1159],['Nusa Tenggara Timur',2341,73.36,609],['Kalimantan Barat',2793,57.39,1359],['Kalimantan Tengah',1397,85.76,425],['Kalimantan Selatan',2241,100,82],['Kalimantan Timur',2344,100,290],['Kalimantan Utara',358,100,0],['Sulawesi Utara',1341,100,399],['Sulawesi Tengah',1598,69.73,568],['Sulawesi Selatan',4943,100,1436],['Sulawesi Tenggara',1394,100,382],['Gorontalo',576,68.87,242],['Sulawesi Barat',727,59.22,284],['Maluku',1007,65.51,443],['Maluku Utara',691,91.86,163],['Papua',499,100,38],['Papua Barat',252,100,29],['Papua Selatan',244,58.72,107],['Papua Tengah',735,46.78,400],['Papua Pegunungan',599,10.6,546],['Papua Barat Daya',309,100,19]
].map(([name,waste,coverage,gap])=>({name,waste,coverage,gap}));

const fmt=n=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(n);
let rankBy='gap';
function renderRanking(){
  const items=[...provinces].sort((a,b)=>rankBy==='gap'?b.gap-a.gap:a.coverage-b.coverage).slice(0,7);
  const max=Math.max(...items.map(x=>rankBy==='gap'?x.gap:100-x.coverage));
  document.querySelector('#rankList').innerHTML=items.map((p,i)=>`<div class="rank-item"><span class="num">0${i+1}</span><div><div class="rank-name">${p.name}</div><div class="rank-track"><i style="width:${((rankBy==='gap'?p.gap:100-p.coverage)/max)*100}%"></i></div></div><div class="rank-value"><strong>${rankBy==='gap'?fmt(p.gap):p.coverage.toFixed(1)+'%'}</strong><small>${rankBy==='gap'?'ton/hari':'terpenuhi'}</small></div></div>`).join('');
}
function renderChart(metric='gap'){
  const items=[...provinces].sort((a,b)=>b[metric]-a[metric]).slice(0,14).reverse();
  const max=Math.max(...items.map(x=>x[metric]));
  document.querySelector('#barChart').innerHTML=items.map(p=>`<div class="bar" title="${p.name}: ${metric==='coverage'?p[metric].toFixed(1)+'%':fmt(p[metric])}"><i style="height:${(p[metric]/max)*100}%"></i><span>${p.name}</span></div>`).join('');
}
document.querySelector('#sortBtn').addEventListener('click',e=>{rankBy=rankBy==='gap'?'coverage':'gap';e.currentTarget.textContent=rankBy==='gap'?'Pemenuhan ↕':'Gap ↕';renderRanking()});
document.querySelector('#metricSelect').addEventListener('change',e=>renderChart(e.target.value));
document.querySelector('#themeBtn').addEventListener('click',()=>document.body.classList.toggle('light'));
const normalized=s=>s.toLowerCase().replace(/provinsi|kep\.|daerah istimewa|dki|di/g,'').replace(/[^a-z]/g,'');
const provinceByName=new Map(provinces.map(p=>[normalized(p.name),p]));
function lookupProvince(name){return provinceByName.get(normalized(name))}
function mapColor(coverage){return coverage>=90?'#9bda70':coverage>=70?'#e1c45c':coverage>=50?'#e88858':'#e45f54'}
function ringToPath(ring){return ring.map((pt,i)=>{const x=(pt[0]-94)/48*900,y=(7-pt[1])/19*360;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join('')+'Z'}
function geometryToPath(geometry){const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;return polygons.flatMap(poly=>poly.map(ringToPath)).join('')}
async function renderMap(){
  const group=document.querySelector('#provinces'),tooltip=document.querySelector('#mapTooltip'),wrap=document.querySelector('.map-wrap');
  try{const geo=await fetch('indonesia-38-provinces.geojson').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
    geo.features.forEach(feature=>{const name=feature.properties.PROVINSI||feature.properties.provinsi||feature.properties.name,data=lookupProvince(name);const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',geometryToPath(feature.geometry));path.style.fill=mapColor(data?.coverage??0);path.setAttribute('aria-label',name);
      path.addEventListener('pointermove',e=>{const box=wrap.getBoundingClientRect();tooltip.style.left=`${e.clientX-box.left}px`;tooltip.style.top=`${e.clientY-box.top}px`;tooltip.innerHTML=`<strong>${data?.name||name}</strong><span>Pemenuhan <b>${data?data.coverage.toFixed(1):'–'}%</b></span><span>Gap <b>${data?fmt(data.gap):'–'} ton/hari</b></span>`;tooltip.classList.add('show')});path.addEventListener('pointerleave',()=>tooltip.classList.remove('show'));group.appendChild(path)});
  }catch(error){group.innerHTML='<text x="450" y="180" text-anchor="middle" fill="#90a89e">Peta tidak dapat dimuat</text>'}}
renderRanking();renderChart();renderMap();
