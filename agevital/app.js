/* ============================================================
   AgeVital · Editorial Infographic — Front-end
   ECharts + D3 + custom SVG (globes / body silhouette / syringe)
   ============================================================ */

// ----------------------------------------------------------
// 0. State + tiny pub/sub
// ----------------------------------------------------------
const state = { year: 2018, region: null, bodyDomain: null };
const listeners = new Set();
function subscribe(fn) { listeners.add(fn); }
function setState(p) { Object.assign(state, p); listeners.forEach(fn => fn(state)); }

// Palette
const PAL = {
  y50:'#FFFBEB', y100:'#FEF3C7', y200:'#FDE68A', y300:'#FCD34D',
  y400:'#FBBF24', y500:'#F59E0B', y600:'#D97706', y700:'#B45309',
  y800:'#92400E', y900:'#78350F',
  ink:'#1C1917', ink2:'#57534E', ink3:'#A8A29E',
  robust:'#FCD34D', prefrail:'#F59E0B', frail:'#B45309',
};
const CAT_COLOR = { 'robust': PAL.robust, 'pre-frail': PAL.prefrail, 'frail': PAL.frail, 'NA': '#D6D3D1' };
const CAT_ORDER = ['robust', 'pre-frail', 'frail'];

const REGION_PROVINCES = {
  East:      ['北京', '天津', '上海', '江苏', '浙江', '福建', '山东', '广东', '河北', '海南'],
  Mid:       ['山西', '安徽', '江西', '河南', '湖北', '湖南'],
  West:      ['内蒙古', '广西', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'],
  Northeast: ['辽宁', '吉林', '黑龙江'],
};
const PROV_TO_REGION = {};
for (const [r, ps] of Object.entries(REGION_PROVINCES)) ps.forEach(p => (PROV_TO_REGION[p] = r));
const REGION_EN = { East: 'East', Mid: 'Mid', West: 'West', Northeast: 'Northeast' };

const DISEASE_EN = {
  hibpe: 'Hypertension', diabe: 'Diabetes',  hearte: 'Heart Dz.',
  stroke: 'Stroke',      cancre: 'Cancer',    arthre: 'Arthritis',
  lunge:  'Lung Dz.',    psyche: 'Psych. Dz.', memrye: 'Memory Dz.',
};
const ADL_ICON = { dressa:'👕', batha:'🛁', eata:'🍚', beda:'🛏️', toilta:'🚽',
                   mealsa:'🍳', shopa:'🛒', moneya:'💰', medsa:'💊',
                   walk1kma:'🚶', chaira:'🪑', climsa:'🪜', stoopa:'🤸', armsa:'💪', lifta:'📦', dimea:'🪙' };
const ADL_EN = {
  dressa:'Dressing', batha:'Bathing', eata:'Eating', beda:'Bed in/out', toilta:'Toileting',
  mealsa:'Cooking',  shopa:'Shopping', moneya:'Money mgmt.', medsa:'Medication',
  walk1kma:'Walk 1 km', chaira:'Rise from chair', climsa:'Climb stairs',
  stoopa:'Stoop/kneel', armsa:'Reach arms', lifta:'Lift 5 kg', dimea:'Pick coin',
};

// ----------------------------------------------------------
// 1. Data load
// ----------------------------------------------------------
const D = {};
async function load() {
  const names = ['overview', 'diseases', 'regions', 'ridgeline', 'sankey',
                 'factors', 'body', 'psu_box', 'age_cohort'];
  await Promise.all(names.map(async n => {
    D[n] = await fetch(`./data/${n}.json`).then(r => r.json());
  }));
  let geoText;
  try { geoText = await fetch('./data/china.geo.json').then(r => { if (!r.ok) throw 0; return r.text(); }); }
  catch (_) { geoText = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json').then(r => r.text()); }
  D.china_geo = JSON.parse(geoText);
  echarts.registerMap('china', D.china_geo);
}

// ----------------------------------------------------------
// 2. Top strip hydration
// ----------------------------------------------------------
function peopleArray(percent, color, total = 50, char = '\u2009\u2666') {
  // diamond '◆' icons. lit by percent. arranged horizontally.
  const litCount = Math.round(total * percent / 100);
  let s = '';
  for (let i = 0; i < total; i++) {
    const lit = i < litCount;
    s += `<span class="${lit ? 'lit' : ''}">${char}</span>`;
  }
  return s;
}

function hydrateTop() {
  document.getElementById('t_total').textContent  = D.overview.global.n_unique_total.toLocaleString();
  document.getElementById('t_tracked').textContent = D.overview.global.n_tracked.toLocaleString();
  document.getElementById('t_prefrail').textContent = D.overview.global.prefrail_rate_2018.toFixed(1) + '%';
  document.getElementById('t_frail').textContent    = D.overview.global.frail_rate_2018.toFixed(1) + '%';
  document.getElementById('cohort-n').textContent = D.sankey.cohort_n.toLocaleString();
}

function hydrateKPI() {
  const w = D.overview.waves.find(w => w.year === state.year);
  document.getElementById('kpi_total').textContent = w.n_total.toLocaleString();
  document.getElementById('kpi_frail').textContent = w.pct.frail.toFixed(1) + '%';
  document.getElementById('kpi_fi').textContent    = (w.FI_mean * 100).toFixed(1) + '%';
}

// ----------------------------------------------------------
// 3. Mini map (top strip)
// ----------------------------------------------------------
let miniMap;
function drawMiniMap() {
  miniMap = miniMap || echarts.init(document.getElementById('strip-mini-map'));
  const wave = D.regions.waves.find(w => w.year === state.year);
  const regionFI = Object.fromEntries(wave.regions.map(r => [r.region, r.mean]));
  const provinceData = Object.entries(PROV_TO_REGION).map(([p, r]) => ({
    name: p, value: (regionFI[r] || 0) * 100, region: r,
  }));
  miniMap.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>Region: ${p.data.region}<br/>FI = ${p.value.toFixed(1)}%` },
    visualMap: { show: false, min: 10, max: 18, inRange: { color: [PAL.y200, PAL.y400, PAL.y600, PAL.y800] } },
    series: [{ type: 'map', map: 'china', roam: false, label: { show: false },
               itemStyle: { borderColor: 'white', borderWidth: 0.4, areaColor: PAL.y100 },
               emphasis: { itemStyle: { areaColor: PAL.y900 }, label: { show: false } },
               data: provinceData }],
  });
}

// ----------------------------------------------------------
// 4. Compliance stripe grid (4-cell mini-bar grid)
// ----------------------------------------------------------
function drawCompliance() {
  const host = document.getElementById('compliance-grid');
  const wave = D.diseases.waves.find(w => w.year === state.year);
  const all  = D.diseases.waves;
  const top4 = [...wave.diseases].sort((a, b) => b.prev - a.prev).slice(0, 4);
  const stripeColors = [PAL.y200, PAL.y400, PAL.y600, PAL.y800];

  host.innerHTML = top4.map(d => {
    const series = all.map(w => w.diseases.find(x => x.key === d.key)?.prev || 0);
    const maxV   = Math.max(...series, d.prev) || 1;
    const stripes = all.map((w, i) => {
      const v   = series[i];
      const pct = (v / maxV) * 100;
      const isCurrent = w.year === state.year;
      const opacity   = isCurrent ? 1 : 0.65;
      return `
        <div class="comp-stripe-row" style="opacity:${opacity}">
          <span class="comp-stripe-yr">${w.year}</span>
          <span class="comp-stripe-flex">
            <span class="comp-stripe" style="width:${pct.toFixed(0)}%;background:${stripeColors[i]};"></span>
          </span>
        </div>`;
    }).join('');
    return `
      <div class="comp-cell">
        <div class="comp-cell-name">${DISEASE_EN[d.key] || d.key}</div>
        <div class="comp-cell-stripes">${stripes}</div>
        <div class="comp-cell-val">${d.prev}%</div>
      </div>`;
  }).join('');
}

// ----------------------------------------------------------
// 5. ADL strip + small bar chart
// ----------------------------------------------------------
function drawADL() {
  const wave = D.diseases.waves.find(w => w.year === state.year);
  const all = [...wave.adl, ...wave.iadl, ...wave.phys];
  const top = [...all].sort((a, b) => b.prev - a.prev).slice(0, 4);
  document.getElementById('adl-icons').innerHTML = top.map(d => `
    <div class="adl-cell">
      <div class="adl-emoji">${ADL_ICON[d.key] || '⚪'}</div>
      <div class="adl-num">${d.prev}%</div>
      <div class="adl-name">${ADL_EN[d.key] || d.key}</div>
    </div>`).join('');

  const chart = echarts.getInstanceByDom(document.getElementById('chart-adl')) || echarts.init(document.getElementById('chart-adl'));
  const phys = [...wave.phys].sort((a, b) => b.prev - a.prev);
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 90, right: 30, top: 4, bottom: 4 },
    tooltip: { trigger: 'item', formatter: p => `${ADL_EN[phys[p.dataIndex].key]}<br/>Impaired = <b>${p.value}%</b>` },
    xAxis: { show: false, max: 50 },
    yAxis: { type: 'category', data: phys.map(d => ADL_EN[d.key] || d.key),
             axisLine: { show: false }, axisTick: { show: false },
             axisLabel: { color: PAL.ink2, fontSize: 10 } },
    series: [{
      type: 'bar', barWidth: 6,
      data: phys.map(d => ({ value: d.prev,
        itemStyle: { color: PAL.y500, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: PAL.y800, fontWeight: 700, fontSize: 10, formatter: '{c}%' },
    }],
  });
}

// ----------------------------------------------------------
// 6. China map — with anchored region labels
// ----------------------------------------------------------
let chartChina;
function drawChina() {
  chartChina = chartChina || echarts.init(document.getElementById('chart-china'));
  const wave = D.regions.waves.find(w => w.year === state.year);
  const regionFI    = Object.fromEntries(wave.regions.map(r => [r.region, r.mean]));
  const regionN     = Object.fromEntries(wave.regions.map(r => [r.region, r.n]));
  const regionFrail = Object.fromEntries(wave.regions.map(r => [r.region, r.frail_rate]));
  const provinceData = Object.entries(PROV_TO_REGION).map(([p, r]) => ({
    name: p, value: (regionFI[r] || 0) * 100, region: r,
  }));

  const regionCenters = {
    East:      [119.5, 33.5],
    Mid:       [112.5, 30.5],
    West:      [101.5, 33.0],
    Northeast: [125.5, 45.5],
  };
  const maxN = Math.max(...wave.regions.map(r => r.n));
  const bubbles = Object.entries(regionCenters).map(([r, c]) => ({
    name: REGION_EN[r],
    region: r,
    value: [...c, regionFrail[r], regionN[r], regionFI[r]],
    sizePx: 32 + 32 * Math.sqrt(regionN[r] / maxN),
  }));

  // Editorial-style region callouts — big bold rate + region name + n
  const labelOffsets = { East: [40, -30], Mid: [-50, -18], West: [-55, -10], Northeast: [40, -36] };
  const labelPoints = Object.entries(regionCenters).map(([r, c]) => {
    const off = labelOffsets[r] || [0, -30];
    return {
      name: r, region: r,
      value: [c[0], c[1]],
      label: { show: true, offset: off,
        formatter: () => `{b|${regionFrail[r]}%}\n{a|${REGION_EN[r]}}\n{c|n = ${regionN[r].toLocaleString()}}` },
    };
  });

  chartChina.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: (p) => {
      if (p.seriesType === 'map') return `<b>${p.name}</b><br/>Region: ${p.data.region}<br/>Regional mean FI = ${p.value.toFixed(1)}%`;
      if (p.seriesType === 'scatter') {
        const [,, frail, n, fi] = p.data.value;
        return `<b>${REGION_EN[p.data.region]}</b><br/>Frail rate <b>${frail}%</b><br/>Mean FI ${(fi*100).toFixed(1)}%<br/>n = ${n.toLocaleString()}`;
      }
    }},
    visualMap: {
      show: true, min: 10, max: 18,
      left: 'right', bottom: 60, orient: 'vertical',
      itemWidth: 10, itemHeight: 80,
      text: ['high\nFI%', 'low\nFI%'], textGap: 4,
      textStyle: { color: PAL.ink2, fontSize: 10, fontFamily: 'Playfair Display', fontStyle: 'italic' },
      inRange: { color: [PAL.y100, PAL.y200, PAL.y400, PAL.y600, PAL.y800] },
    },
    geo: { map: 'china', roam: false, label: { show: false },
           layoutCenter: ['50%', '50%'], layoutSize: '100%',
           itemStyle: { borderColor: PAL.y400, borderWidth: 1, areaColor: PAL.y50 } },
    series: [
      { name: 'FI by region', type: 'map', map: 'china', geoIndex: 0,
        data: provinceData, 
        itemStyle: { areaColor: PAL.y100, borderColor: PAL.y400 } },
      {
        name: 'bubble', type: 'scatter', coordinateSystem: 'geo',
        symbolSize: (_, p) => (p && p.data && p.data.sizePx) || 30, z: 5,
        itemStyle: { color: PAL.y600, opacity: 0.4,
                     borderColor: PAL.y800, borderWidth: 1.5 },
        label: { show: false }, data: bubbles,
      },
      {
        name: 'callouts', type: 'scatter', coordinateSystem: 'geo',
        symbolSize: 10, z: 6,
        itemStyle: { color: PAL.y900, borderColor: 'white', borderWidth: 2 },
        data: labelPoints,
        label: {
          show: true,
          padding: [4, 0], borderRadius: 0,
          rich: {
            a: { fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: 16, color: PAL.y900, lineHeight: 18 },
            b: { fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 36, color: PAL.y700, lineHeight: 36 },
            c: { fontSize: 12, color: PAL.ink2, fontStyle: 'italic', lineHeight: 16 },
          },
        },
      },
    ],
  });

  chartChina.off('click');
  chartChina.on('click', (p) => {
    let target = null;
    if (p.seriesType === 'scatter') target = p.data.region;
    else if (p.seriesType === 'map') target = p.data.region;
    if (target) setState({ region: state.region === target ? null : target });
  });
}

// ----------------------------------------------------------
// 7. Custom-SVG globes row
// ----------------------------------------------------------
function buildGlobeSVG(highlightRegion, frailRate) {
  // Stylized globe: outer circle + 3 latitude curves + a continent blob
  // The continent shape shifts position per region for visual variety.
  const continentByRegion = {
    East:      'M 26 22 Q 32 18 36 22 T 44 28 Q 40 36 32 36 T 22 32 Z',
    Mid:       'M 20 26 Q 26 22 32 26 T 42 32 Q 36 40 28 38 T 18 34 Z',
    West:      'M 16 24 Q 22 20 30 22 T 40 28 Q 34 34 24 34 T 14 30 Z',
    Northeast: 'M 28 18 Q 38 16 44 22 T 48 30 Q 40 32 32 30 T 22 26 Z',
  };
  return `
    <svg class="globe-svg" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="g-${highlightRegion}" cx="35%" cy="30%">
          <stop offset="0%"  stop-color="${PAL.y200}"/>
          <stop offset="55%" stop-color="${PAL.y500}"/>
          <stop offset="100%" stop-color="${PAL.y800}"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#g-${highlightRegion})" stroke="${PAL.y900}" stroke-width="1.4"/>
      <!-- latitudes -->
      <ellipse cx="32" cy="32" rx="28" ry="6"  fill="none" stroke="${PAL.y100}" stroke-width="0.6" opacity="0.7"/>
      <ellipse cx="32" cy="32" rx="28" ry="14" fill="none" stroke="${PAL.y100}" stroke-width="0.6" opacity="0.55"/>
      <ellipse cx="32" cy="32" rx="28" ry="22" fill="none" stroke="${PAL.y100}" stroke-width="0.6" opacity="0.4"/>
      <!-- meridian -->
      <ellipse cx="32" cy="32" rx="8"  ry="28" fill="none" stroke="${PAL.y100}" stroke-width="0.6" opacity="0.55"/>
      <!-- continent -->
      <path d="${continentByRegion[highlightRegion] || continentByRegion.East}" fill="${PAL.y900}" opacity="0.7"/>
      <!-- pin for current region -->
      <circle cx="36" cy="24" r="2.4" fill="white" stroke="${PAL.y900}" stroke-width="1"/>
    </svg>
  `;
}

function drawGlobes() {
  const wave = D.regions.waves.find(w => w.year === state.year);
  const host = document.getElementById('globes-row');
  host.innerHTML = wave.regions.map(r => `
    <div class="globe-wrap ${state.region === r.region ? 'active' : ''}" data-r="${r.region}">
      ${buildGlobeSVG(r.region, r.frail_rate)}
      <div class="globe-stat">${r.frail_rate}%</div>
      <div class="globe-lbl">${REGION_EN[r.region]} · n=${r.n.toLocaleString()}</div>
    </div>`).join('');
  host.querySelectorAll('.globe-wrap').forEach(el => {
    el.addEventListener('click', () => {
      const r = el.dataset.r;
      setState({ region: state.region === r ? null : r });
    });
  });
}

// ----------------------------------------------------------
// 8. Small multiples — Robust/Pre-Frail/Frail composition per region
// ----------------------------------------------------------
function drawSmallMultiples() {
  const wave = D.regions.waves.find(w => w.year === state.year);
  const host = document.getElementById('smm-row');
  host.innerHTML = wave.regions.map(r => `
    <div class="smm-cell" data-r="${r.region}">
      <div class="smm-cell-title">${REGION_EN[r.region]}</div>
      <svg id="smm-${r.region}" class="smm-cell-svg" viewBox="0 0 120 110" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="smm-cell-cap">n = ${r.n.toLocaleString()}</div>
    </div>`).join('');

  wave.regions.forEach(r => {
    // Editorial heuristic — derive Robust / Pre-Frail from observed Frail rate.
    const frail    = r.frail_rate;
    const prefrail = Math.max(15, 32 - (frail - 18) * 1.4);
    const robust   = Math.max(0, 100 - frail - prefrail);
    const cats = [
      { lbl: 'R', name: 'Robust',    val: +robust.toFixed(1),   color: PAL.robust },
      { lbl: 'P', name: 'Pre-Frail', val: +prefrail.toFixed(1), color: PAL.prefrail },
      { lbl: 'F', name: 'Frail',     val: +frail.toFixed(1),    color: PAL.frail },
    ];

    const svg = d3.select(`#smm-${r.region}`);
    svg.selectAll('*').remove();
    const W = 120, H = 110, m = { top: 14, right: 6, bottom: 18, left: 6 };
    const innerW = W - m.left - m.right, innerH = H - m.top - m.bottom;
    const x = d3.scaleBand().domain(cats.map(c => c.lbl)).range([m.left, m.left + innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, 60]).range([m.top + innerH, m.top]);

    cats.forEach(c => {
      svg.append('rect')
        .attr('x', x(c.lbl)).attr('y', y(c.val))
        .attr('width', x.bandwidth()).attr('height', y(0) - y(c.val))
        .attr('rx', 2).attr('fill', c.color);
      svg.append('text')
        .attr('x', x(c.lbl) + x.bandwidth() / 2).attr('y', y(c.val) - 3)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Playfair Display, serif').attr('font-weight', 800)
        .attr('font-size', 10).attr('fill', PAL.y800)
        .text(`${c.val}%`);
      svg.append('text')
        .attr('x', x(c.lbl) + x.bandwidth() / 2).attr('y', y(0) + 11)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Playfair Display, serif').attr('font-weight', 700)
        .attr('font-size', 9.5).attr('fill', PAL.y900)
        .text(c.lbl);
    });
    // baseline
    svg.append('line').attr('x1', m.left).attr('x2', m.left + innerW)
      .attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', PAL.y400).attr('stroke-width', 0.8);
  });
}

// ----------------------------------------------------------
// 9. Human body — diabetes-poster style (transparent silhouette + organs)
// ----------------------------------------------------------
function bodyOrganIcon(g, type, x, y, scale) {
  const s = scale || 1;
  const icons = {
    brain: 'M0,-5 C-4,-7 -6,-3 -5,0 C-6,4 -3,6 0,5 C3,6 6,4 5,0 C6,-3 4,-7 0,-5 Z',
    heart: 'M0,-4 C-3,-7 -7,-4 -5,0 C-3,4 0,6 0,6 C0,6 3,4 5,0 C7,-4 3,-7 0,-4 Z',
    lung:  'M-6,0 C-6,-5 -1,-6 0,-2 C1,-6 6,-5 6,0 C6,5 0,7 0,7 C0,7 -6,5 -6,0 Z',
    stomach: 'M-5,-3 C-7,2 -4,7 0,7 C4,7 7,2 5,-3 C3,-6 -3,-6 -5,-3 Z',
    limb: 'M0,-6 L4,2 L1,2 L3,8 L-1,8 L1,2 L-4,2 Z',
    whole: 'M0,-5 A5,5 0 1,1 0,5 A5,5 0 1,1 0,-5 M0,-2 L0,2 M-2,0 L2,0',
  };
  const path = icons[type] || icons.whole;
  g.append('g').attr('transform', `translate(${x},${y}) scale(${s})`)
    .append('path').attr('class', 'body-organ').attr('d', path);
}

function bodyIsotypeGrid(svg, x, y, pct, cols, rows) {
  const total = cols * rows;
  const lit = Math.round(total * pct / 100);
  const cell = 4, gap = 1;
  for (let i = 0; i < total; i++) {
    const cx = x + (i % cols) * (cell + gap);
    const cy = y + Math.floor(i / cols) * (cell + gap);
    svg.append('rect').attr('x', cx).attr('y', cy).attr('width', cell).attr('height', cell)
      .attr('fill', i < lit ? PAL.y700 : PAL.y200).attr('rx', 0.5);
  }
}

function drawBody() {
  document.getElementById('body-year-lbl').textContent = state.year;
  const wave = D.body.waves.find(w => w.year === state.year);
  const dom = Object.fromEntries(wave.domains.map(d => [d.part, d.prev]));

  const host = d3.select('#body-svg').html('');
  const W = 300, H = 280, CX = 150;
  const svg = host.append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('path').attr('class', 'body-fill').attr('d',
    'M 150 28 C 162 28 170 38 170 50 C 170 58 166 64 160 66' +
    ' C 178 70 188 82 192 98 L 196 128 C 198 142 194 154 186 162' +
    ' L 182 178 L 176 228 C 174 238 168 244 160 244 L 154 244' +
    ' L 150 198 L 146 244 L 140 244 C 132 244 126 238 124 228' +
    ' L 118 178 L 114 162 C 106 154 102 142 104 128 L 108 98' +
    ' C 112 82 122 70 140 66 C 134 64 130 58 130 50 C 130 38 138 28 150 28 Z' +
    ' M 140 68 C 128 74 118 88 114 104 L 108 130 C 104 144 108 152 116 152' +
    ' L 120 128 C 124 108 132 92 142 82 Z' +
    ' M 160 68 C 172 74 182 88 186 104 L 192 130 C 196 144 192 152 184 152' +
    ' L 180 128 C 176 108 168 92 158 82 Z');

  const organs = [
    { type: 'brain',   ox: 150, oy: 48,  scale: 0.9 },
    { type: 'heart',   ox: 146, oy: 96,  scale: 0.85 },
    { type: 'lung',    ox: 158, oy: 94,  scale: 0.55 },
    { type: 'stomach', ox: 150, oy: 132, scale: 0.9 },
    { type: 'limb',    ox: 118, oy: 148, scale: 0.75 },
    { type: 'limb',    ox: 182, oy: 148, scale: 0.75 },
    { type: 'whole',   ox: 150, oy: 210, scale: 0.65 },
  ];
  const og = svg.append('g');
  organs.forEach(o => bodyOrganIcon(og, o.type, o.ox, o.oy, o.scale));

  const regions = [
    { part: 'head',    cx: 150, cy: 48,  lbl: 'Cognition',           side: 'right', iso: true  },
    { part: 'chest',   cx: 148, cy: 98,  lbl: 'Heart · Lung',        side: 'left',  iso: true  },
    { part: 'abdomen', cx: 150, cy: 132, lbl: 'Metabolic',           side: 'right', iso: true  },
    { part: 'limbs',   cx: 118, cy: 148, lbl: 'ADL · Musculoskel.',  side: 'left',  iso: false },
    { part: 'whole',   cx: 150, cy: 210, lbl: 'Overall FI',          side: 'right', iso: false },
  ];

  svg.selectAll('circle.body-hotspot').data(regions).enter().append('circle')
    .attr('class', d => 'body-hotspot' + (state.bodyDomain === d.part ? ' active' : ''))
    .attr('cx', d => d.cx).attr('cy', d => d.cy).attr('r', 14)
    .attr('fill', 'transparent').attr('stroke', 'none')
    .on('mouseover', (e, d) => showTip(e, `<b>${d.lbl}</b><br/>${state.year}: <strong>${dom[d.part]}%</strong>`))
    .on('mousemove', moveTip).on('mouseout', hideTip)
    .on('click', (e, d) => setState({ bodyDomain: state.bodyDomain === d.part ? null : d.part }));

  regions.forEach(r => {
    const left = r.side === 'left';
    const edgeX = left ? 8 : W - 8;
    const anchorX = left ? r.cx - 22 : r.cx + 22;
    const midX = left ? 52 : W - 52;
    const pct = dom[r.part];

    svg.append('path').attr('class', 'body-callout-line')
      .attr('d', `M ${anchorX} ${r.cy} L ${midX} ${r.cy} L ${edgeX + (left ? 28 : -28)} ${r.cy}`);
    svg.append('circle').attr('cx', anchorX).attr('cy', r.cy).attr('r', 1.8)
      .attr('fill', PAL.y700);

    const tx = left ? 6 : W - 6;
    svg.append('text').attr('class', 'body-callout-stat')
      .attr('x', tx).attr('y', r.cy - 2)
      .attr('text-anchor', left ? 'start' : 'end')
      .text(`${pct}%`);
    svg.append('text').attr('class', 'body-callout-lbl')
      .attr('x', tx).attr('y', r.cy + 8)
      .attr('text-anchor', left ? 'start' : 'end')
      .text(r.lbl);

    if (r.iso) {
      const gx = left ? 34 : W - 54;
      bodyIsotypeGrid(svg, gx, r.cy - 5, pct, 5, 2);
    }
  });

  if (state.bodyDomain) {
    svg.append('rect').attr('x', CX - 42).attr('y', H - 22).attr('width', 84).attr('height', 14)
      .attr('fill', PAL.y100).attr('stroke', PAL.y500).attr('rx', 2);
    const lbl = regions.find(r => r.part === state.bodyDomain)?.lbl || state.bodyDomain;
    svg.append('text').attr('x', CX).attr('y', H - 12)
      .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', PAL.y800)
      .text(`${lbl}: ${dom[state.bodyDomain]}%`);
  }
}

// ----------------------------------------------------------
// 10. Syringe (factors visualization)
// ----------------------------------------------------------
function drawSyringe() {
  const fs = D.factors.factors;
  // Normalize each factor by (frail_mean - robust_mean) magnitude relative to scale.
  const labels = {
    SES_edu: 'Education',  SES_wealth: 'Wealth(log)',  Sleep_hours: 'Sleep',
    CESD10: 'Depression',  SC_Total: 'Social Capital', SC_Engagement: 'Engagement',
    HC_Satisfact: 'Care Sat.',
  };
  // Compute |gap| normalized 0..1 for segment lengths
  const data = fs.map(f => {
    const fv = f.by_cat['frail']?.mean ?? 0;
    const rv = f.by_cat['robust']?.mean ?? 0;
    return { name: f.name, label: labels[f.name] || f.name, gap: Math.abs(fv - rv), fv, rv, diff: +(fv - rv).toFixed(3) };
  });
  const maxGap = Math.max(...data.map(d => d.gap));
  data.forEach(d => { d.frac = d.gap / (maxGap || 1); });

  const host = d3.select('#syringe').html('');
  const W = 480, H = 72;
  const svg = host.append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const plungerW = 40;
  const barrelX0 = plungerW + 4;
  const barrelX1 = W - 56;
  const needleX1 = W - 12;
  const cy = 38;
  const barrelH = 36;

  svg.append('rect')
    .attr('x', barrelX0).attr('y', cy - barrelH / 2)
    .attr('width', barrelX1 - barrelX0).attr('height', barrelH)
    .attr('fill', '#FFFFFF').attr('stroke', PAL.y800).attr('stroke-width', 1.4)
    .attr('rx', 4);

  svg.append('rect').attr('x', 0).attr('y', cy - 10).attr('width', 10).attr('height', 20)
     .attr('fill', PAL.y800).attr('rx', 2);
  svg.append('rect').attr('x', 10).attr('y', cy - 3).attr('width', plungerW - 14).attr('height', 6)
     .attr('fill', PAL.y700);
  svg.append('rect').attr('x', plungerW - 6).attr('y', cy - barrelH/2 + 3).attr('width', 8).attr('height', barrelH - 6)
     .attr('fill', PAL.y600).attr('rx', 2);

  svg.append('path').attr('d',
    `M ${barrelX1} ${cy - 5} L ${barrelX1 + 8} ${cy - 2.5} L ${needleX1} ${cy - 1} L ${needleX1} ${cy + 1} L ${barrelX1 + 8} ${cy + 2.5} L ${barrelX1} ${cy + 5} Z`)
    .attr('fill', PAL.y800);

  svg.append('line').attr('x1', needleX1).attr('y1', cy).attr('x2', W - 1).attr('y2', cy)
     .attr('stroke', PAL.y900).attr('stroke-width', 2);
  svg.append('polygon').attr('points', `${W-1},${cy-1.5} ${W},${cy} ${W-1},${cy+1.5}`).attr('fill', PAL.y900);

  const inner = { x0: barrelX0 + 3, x1: barrelX1 - 4 };
  const innerW = inner.x1 - inner.x0;
  const totalFrac = data.reduce((s, d) => s + d.frac, 0);
  let cursor = inner.x0;
  const segH = barrelH - 8;
  const segY = cy - segH / 2;
  const segColors = [PAL.y700, PAL.y600, PAL.y500, PAL.y400, PAL.y300, PAL.y600, PAL.y800];
  data.forEach((d, i) => {
    const w = (d.frac / totalFrac) * innerW;
    svg.append('rect').attr('x', cursor).attr('y', segY).attr('width', Math.max(w, 2)).attr('height', segH)
       .attr('fill', segColors[i % segColors.length]);
    if (w > 22) {
      svg.append('text').attr('x', cursor + w/2).attr('y', segY - 4).attr('text-anchor', 'middle')
         .attr('font-size', 8).attr('fill', PAL.y900).attr('font-style', 'italic').text(d.label);
    }
    svg.append('text').attr('x', cursor + w/2).attr('y', segY + segH + 10).attr('text-anchor', 'middle')
       .attr('font-family', 'Playfair Display, serif').attr('font-size', 9).attr('font-weight', 700).attr('fill', PAL.y800)
       .text((d.diff >= 0 ? '+' : '') + d.diff.toFixed(2));
    cursor += w;
  });
}

// ----------------------------------------------------------
// 11. Section B: Projected-growth area chart
// ----------------------------------------------------------
let chartGrowth;
function drawGrowth() {
  chartGrowth = chartGrowth || echarts.init(document.getElementById('chart-growth'));
  const years = D.overview.waves.map(w => w.year);
  const series = CAT_ORDER.map(c => ({
    name: c, type: 'line', stack: 'cat', smooth: true, symbol: 'none',
    areaStyle: { opacity: 0.92 }, lineStyle: { width: 0 },
    itemStyle: { color: CAT_COLOR[c] },
    data: D.overview.waves.map(w => +(w.pct[c]).toFixed(2)),
  }));
  series.push({
    name: 'Frail %', type: 'line', yAxisIndex: 1, symbol: 'circle', symbolSize: 5,
    lineStyle: { width: 1.5, color: PAL.y900 },
    itemStyle: { color: PAL.y900, borderColor: 'white', borderWidth: 1.5 },
    label: { show: true, position: 'top', color: PAL.y900, fontWeight: 700, fontSize: 8, formatter: '{c}%' },
    data: D.overview.waves.map(w => +(w.pct.frail).toFixed(2)),
  });
  chartGrowth.setOption({
    backgroundColor: 'transparent',
    grid: { left: 32, right: 28, top: 14, bottom: 18 },
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    xAxis: { type: 'category', data: years,
      axisLine: { lineStyle: { color: PAL.y700 } },
      axisLabel: { color: PAL.ink2, fontFamily: 'Playfair Display', fontSize: 11 } },
    yAxis: [
      { type: 'value', max: 100, axisLine: { show: false },
        splitLine: { lineStyle: { color: PAL.y200, type: 'dashed' } },
        axisLabel: { color: PAL.ink2, fontSize: 10, formatter: '{value}%' } },
      { type: 'value', max: 30, axisLine: { show: false }, splitLine: { show: false }, axisLabel: { show: false } },
    ],
    series,
  });
}

// ----------------------------------------------------------
// 12. Cohort stacked bar
// ----------------------------------------------------------
let chartCohort;
function drawCohort() {
  chartCohort = chartCohort || echarts.init(document.getElementById('chart-cohort'));
  const bands = D.age_cohort.bands;
  const years = D.age_cohort.by_year.map(d => d.year);
  const colors = [PAL.y200, PAL.y300, PAL.y500, PAL.y600, PAL.y800];
  const series = bands.map((b, i) => ({
    name: b, type: 'bar', stack: 's', barWidth: '52%',
    itemStyle: { color: colors[i] },
    data: D.age_cohort.by_year.map(d => d.counts[i]),
  }));
  chartCohort.setOption({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 12, top: 22, bottom: 16 },
    tooltip: { trigger: 'axis' },
    legend: { show: true, top: 0, right: 0, icon: 'rect', itemWidth: 8, itemHeight: 5,
              textStyle: { color: PAL.ink2, fontSize: 8 } },
    xAxis: { type: 'category', data: years,
             axisLine: { lineStyle: { color: PAL.y700 } },
             axisLabel: { color: PAL.ink2, fontFamily: 'Playfair Display', fontSize: 11 } },
    yAxis: { type: 'value', axisLine: { show: false },
             splitLine: { lineStyle: { color: PAL.y200, type: 'dashed' } },
             axisLabel: { color: PAL.ink2, fontSize: 9 } },
    series,
  });
}

// ----------------------------------------------------------
// 13. Sankey
// ----------------------------------------------------------
let chartSankey;
function drawSankey() {
  chartSankey = chartSankey || echarts.init(document.getElementById('chart-sankey'));
  const data = D.sankey;
  const nodes = data.nodes.map(n => ({
    name: n.name,
    label: { formatter: n.label, color: PAL.y900, fontSize: 10, fontFamily: 'Playfair Display' },
    itemStyle: { color: CAT_COLOR[n.cat] || '#D6D3D1' },
  }));
  chartSankey.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [{
      type: 'sankey',
      data: nodes, links: data.links,
      left: 8, right: 48, top: 4, bottom: 4,
      nodeAlign: 'left', nodeWidth: 10, nodeGap: 4,
      lineStyle: { curveness: 0.48, color: 'gradient', opacity: 0.38 },
      label: { color: PAL.y900, fontSize: 9, fontFamily: 'Playfair Display' },
    }],
  });
}

// ----------------------------------------------------------
// 14. Box plot
// ----------------------------------------------------------
let chartBox;
function drawBox() {
  chartBox = chartBox || echarts.init(document.getElementById('chart-box'));
  const categories = [], boxes = [], outliers = [];
  const showYears = [2011, 2018];
  D.psu_box.waves.filter(w => showYears.includes(w.year)).forEach(w => {
    w.boxes.forEach(b => {
      categories.push(`${REGION_EN[b.region] || b.region} ${w.year}`);
      boxes.push([b.min, b.q1, b.median, b.q3, b.max]);
      b.outliers.slice(0, 20).forEach(o => outliers.push([categories.length - 1, o]));
    });
  });
  chartBox.setOption({
    backgroundColor: 'transparent',
    grid: { left: 72, right: 14, top: 6, bottom: 22 },
    tooltip: { trigger: 'item',
      formatter: p => p.seriesName === 'box' ?
        `<b>${p.name}</b><br/>median=${p.data[3]}` :
        `outlier FI = ${p.data[1]}` },
    yAxis: { type: 'category', data: categories,
             axisLine: { show: false }, axisTick: { show: false },
             axisLabel: { fontSize: 9, color: PAL.y900, fontWeight: 600 },
             splitLine: { show: true, lineStyle: { color: PAL.y100 } } },
    xAxis: { type: 'value', min: 0, max: 0.5,
             axisLine: { show: false },
             splitLine: { lineStyle: { color: PAL.y200, type: 'dashed' } },
             axisLabel: { color: PAL.ink2, fontSize: 8 },
             name: 'FI', nameLocation: 'middle', nameGap: 16,
             nameTextStyle: { color: PAL.y900, fontSize: 9 } },
    series: [
      { name: 'box', type: 'boxplot', data: boxes,
        itemStyle: { color: PAL.y200, borderColor: PAL.y700, borderWidth: 1.2 },
        boxWidth: [6, 12] },
      { name: 'outliers', type: 'scatter', data: outliers,
        symbolSize: 3, itemStyle: { color: PAL.y600, opacity: 0.35 } },
    ],
  });
}

// ----------------------------------------------------------
// 15. Ridgeline (D3)
// ----------------------------------------------------------
function drawRidge() {
  const host = document.getElementById('chart-ridge');
  host.innerHTML = '';
  const W = host.clientWidth || 600, H = host.clientHeight || 180;
  const svg = d3.select(host).append('svg').attr('width', W).attr('height', H);
  const data = D.ridgeline.waves, bins = D.ridgeline.bins;
  const margin = { top: 8, right: 52, bottom: 20, left: 36 };
  const inner = { w: W - margin.left - margin.right, h: H - margin.top - margin.bottom };
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const x = d3.scaleLinear().domain([0, 1]).range([0, inner.w]);
  const yBand = d3.scaleBand().domain(data.map(d => d.year)).range([0, inner.h]).paddingInner(0.06);
  const allMax = d3.max(data, d => d3.max(d.density));
  const yWave = d3.scaleLinear().domain([0, allMax]).range([0, yBand.bandwidth() * 1.35]);
  const area  = d3.area().curve(d3.curveBasis)
    .x((d, i) => x(bins[i])).y0(0).y1(d => -yWave(d));

  data.forEach((d, i) => {
    const yBase = yBand(d.year) + yBand.bandwidth();
    const fillColors = [PAL.y200, PAL.y300, PAL.y500, PAL.y700];
    const edgeColors = [PAL.y600, PAL.y700, PAL.y800, PAL.y900];
    g.append('path').datum(d.density)
      .attr('transform', `translate(0,${yBase})`)
      .attr('fill', fillColors[i]).attr('fill-opacity', 0.85)
      .attr('stroke', edgeColors[i]).attr('stroke-width', 1.1).attr('d', area);
    g.append('text').attr('x', -6).attr('y', yBase - yBand.bandwidth() / 2)
      .attr('text-anchor', 'end').attr('fill', PAL.y900)
      .attr('font-family', 'Playfair Display').attr('font-weight', 800).attr('font-size', 12)
      .text(d.year);
  });
  const xAxis = d3.axisBottom(x).ticks(5).tickFormat(v => v.toFixed(1));
  g.append('g').attr('transform', `translate(0,${inner.h + 2})`).call(xAxis)
    .call(s => s.selectAll('text').attr('fill', PAL.ink2).attr('font-size', 8))
    .call(s => s.selectAll('line').attr('stroke', PAL.y300))
    .call(s => s.selectAll('path').attr('stroke', PAL.y400));
}

// ----------------------------------------------------------
// 16. Controls + tooltip + resize
// ----------------------------------------------------------
function wireControls() {
  document.querySelectorAll('.year-slider .yr').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.year-slider .yr').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setState({ year: +btn.dataset.y });
    });
  });
}

const tip = document.getElementById('ttip');
function showTip(evt, html) { tip.innerHTML = html; tip.classList.add('show'); moveTip(evt); }
function moveTip(evt)       { tip.style.left = (evt.clientX + 12) + 'px'; tip.style.top = (evt.clientY + 12) + 'px'; }
function hideTip()          { tip.classList.remove('show'); }

window.addEventListener('resize', () => {
  [miniMap, chartChina, chartGrowth, chartCohort, chartSankey, chartBox]
    .forEach(c => c && c.resize());
  const adl = echarts.getInstanceByDom(document.getElementById('chart-adl'));
  if (adl) adl.resize();
  drawRidge();
  drawSyringe();
  drawGlobes();
  drawSmallMultiples();
  drawBody();
});

// ----------------------------------------------------------
// 17. Boot
// ----------------------------------------------------------
async function boot() {
  await load();
  hydrateTop();
  hydrateKPI();
  wireControls();

  drawMiniMap();
  drawCompliance();
  drawADL();
  drawChina();
  drawGlobes();
  drawSmallMultiples();
  drawBody();
  drawSyringe();

  drawGrowth();
  drawCohort();
  drawSankey();
  drawBox();
  drawRidge();

  subscribe(() => {
    hydrateKPI();
    drawMiniMap();
    drawCompliance();
    drawADL();
    drawChina();
    drawGlobes();
    drawSmallMultiples();
    drawBody();
  });
}

boot().catch(err => {
  console.error('Boot failed:', err);
  document.body.insertAdjacentHTML('afterbegin',
    `<div style="background:#FEE; color:#900; padding:12px; margin:10px; border-radius:8px; font-family:monospace;">
       Initialization failed: ${err.message}<br/>
       Hint: please serve via a local HTTP server (e.g. <code>python -m http.server 8765</code>);
       opening the HTML file by double-clicking will fail due to CORS.
     </div>`);
});
