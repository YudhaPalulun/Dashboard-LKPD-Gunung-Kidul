/* Dashboard Belanja dan Beban Daerah — Kabupaten Gunungkidul
   Data: js/data.js (window.LKPD). Grafik: Chart.js (js/chart.umd.js). Tanpa proses build. */
(function () {
  'use strict';
  const D = window.LKPD, YRS = D.tahun, PREV = D.tahunPembanding, B = D.belanja, L = D.beban;
  const ALLY = [PREV].concat(YRS);
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const VIEWS = ['ringkasan', 'belanja', 'beban', 'semua', 'lembar', 'unduh', 'tentang'];
  const TITLES = {
    ringkasan: ['Ringkasan', 'Belanja dan Beban Daerah'],
    belanja: ['Belanja (LRA)', 'Laporan Realisasi Anggaran'],
    beban: ['Beban (LO)', 'Laporan Operasional'],
    semua: ['Semua Tahun', 'Data lengkap 2023–2025'],
    lembar: ['Lembar Kerja', 'Nilai dan rumus tiap sel'],
    unduh: ['Unduh Laporan', 'Laporan Excel per tahun'],
    tentang: ['Tentang Data', 'Sumber, metode, dan catatan']
  };
  const GB = ['Belanja Operasi', 'Belanja Modal', 'Belanja Tidak Terduga', 'Belanja Transfer'];
  const GL = ['Beban Operasi', 'Beban Penyusutan dan Amortisasi', 'Beban Transfer', 'Beban Tak Terduga'];
  const CB = { 'Belanja Operasi': '--c-op', 'Belanja Modal': '--c-mod', 'Belanja Tidak Terduga': '--c-tt', 'Belanja Transfer': '--c-tr' };
  const CL = { 'Beban Operasi': '--c-op', 'Beban Penyusutan dan Amortisasi': '--c-pen', 'Beban Transfer': '--c-tr', 'Beban Tak Terduga': '--c-tt' };

  /* ---------- state ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  };
  const state = {
    view: 'ringkasan',
    year: +store.get('gk.year', YRS[YRS.length - 1]),
    unit: store.get('gk.unit', 'miliar'),
    theme: store.get('gk.theme', 'light'),
    sheet: 'Rincian LRA'
  };
  if (YRS.indexOf(state.year) < 0) state.year = YRS[YRS.length - 1];
  if (state.unit !== 'miliar' && state.unit !== 'penuh') state.unit = 'miliar';

  /* ---------- format ---------- */
  const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const F0 = nf(0), F1 = nf(1), F2 = nf(2);
  const pct = (f, d) => nf(d == null ? 2 : d).format(f * 100) + '%';
  const rpShort = (v) => {
    const a = Math.abs(v);
    if (a >= 1e12) return 'Rp ' + F2.format(v / 1e12) + ' triliun';
    if (a >= 1e9) return 'Rp ' + F2.format(v / 1e9) + ' miliar';
    return 'Rp ' + F0.format(v);
  };
  const money = (v) => (state.unit === 'miliar' ? F2.format(v / 1e9) : F0.format(v));
  const signed = (v) => (v < 0 ? '−' : '+') + money(Math.abs(v));
  const strip = (s) => s.replace(/^Belanja /, '');
  const wrap = (s, n) => { const out = []; let cur = ''; s.split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out; };
  const fileOf = (y) => 'downloads/Laporan-Belanja-dan-Beban-Gunungkidul-' + y + '.xlsx';

  /* ---------- data helper ---------- */
  const sumB = (f, y, g) => B.filter((r) => !g || r.kelompok === g).reduce((s, r) => s + (r[f][y] || 0), 0);
  const sumL = (y, g) => L.filter((r) => !g || r.kelompok === g).reduce((s, r) => s + (r.nilai[y] || 0), 0);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const alpha = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  /* ---------- Chart.js ---------- */
  let charts = [], regs = [], io = null;
  const valueLabels = {
    id: 'valueLabels',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.format) return;
      const p = chart.$p == null ? 1 : chart.$p, a = Math.max(0, (p - 0.75) / 0.25);
      if (a <= 0) return;
      const ctx = chart.ctx, horiz = chart.options.indexAxis === 'y';
      ctx.save();
      ctx.font = '600 11.5px Poppins, system-ui, sans-serif';
      ctx.fillStyle = css('--text'); ctx.globalAlpha = a;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
          const v = ds.data[i];
          if (v == null || isNaN(v)) return;
          const t = opts.format(v);
          if (horiz) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, bar.x + 7, bar.y); }
          else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(t, bar.x, bar.y - 6); }
        });
      });
      ctx.restore();
    }
  };
  function anim() {
    if (reduce) return false;
    return {
      duration: 1500, easing: 'easeOutQuart',
      delay: (c) => (c.type === 'data' && c.mode === 'default' ? c.dataIndex * 130 + c.datasetIndex * 90 : 0),
      onProgress: (a) => { a.chart.$p = a.currentStep / a.numSteps; },
      onComplete: (a) => { a.chart.$p = 1; }
    };
  }
  function tip(extra) {
    return Object.assign({
      backgroundColor: '#1f2a40', titleColor: '#fff', bodyColor: '#e6ecf5', footerColor: '#ffb27a',
      padding: 11, cornerRadius: 9, boxPadding: 5, titleFont: { weight: '600' }, footerFont: { weight: '600' }
    }, extra || {});
  }
  function themeChart() {
    Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = css('--muted');
    Chart.defaults.borderColor = css('--grid');
  }
  const legendTop = () => ({ position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, boxHeight: 9, padding: 14 } });
  const yAxisM = (title) => ({ beginAtZero: true, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: (v) => F0.format(v) }, title: { display: !!title, text: title } });
  function box(id, cls, label) { return '<div class="chart-wrap ' + (cls || '') + '"><canvas id="' + id + '" role="img" aria-label="' + label + '"></canvas></div>'; }
  function reg(id, factory) { regs.push({ id, factory }); }

  /* --- grafik: ringkasan --- */
  function chTrend(cv) {
    const y = state.year;
    const ang = YRS.map((t) => sumB('anggaran', t) / 1e9), rea = YRS.map((t) => sumB('realisasi', t) / 1e9);
    const hi = (c, a) => YRS.map((t) => (t === y || state.view === 'semua' ? c : alpha(c, a)));
    return new Chart(cv, {
      type: 'bar',
      data: {
        labels: YRS.map(String),
        datasets: [
          { label: 'Anggaran', data: ang, backgroundColor: hi(css('--bar-muted'), 0.55), borderRadius: 7, borderSkipped: false, maxBarThickness: 54 },
          { label: 'Realisasi', data: rea, backgroundColor: hi(css('--c-op'), 0.5), borderRadius: 7, borderSkipped: false, maxBarThickness: 54 }
        ]
      },
      plugins: [valueLabels],
      options: {
        responsive: true, maintainAspectRatio: false, animation: anim(),
        layout: { padding: { top: 18 } },
        onClick: (e, els) => { if (els.length) setYear(YRS[els[0].index]); },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
        scales: { x: { grid: { display: false }, border: { display: false } }, y: yAxisM('Rp miliar') },
        plugins: {
          legend: legendTop(), valueLabels: { format: (v) => F0.format(v) },
          tooltip: tip({
            callbacks: {
              label: (c) => ' ' + c.dataset.label + ': Rp ' + F2.format(c.parsed.y) + ' M',
              afterBody: (items) => ['Capaian: ' + pct(rea[items[0].dataIndex] / ang[items[0].dataIndex])],
              footer: () => 'Klik batang untuk memilih tahun'
            }
          })
        }
      }
    });
  }
  function chGauge(cv) {
    const y = state.year, cap = sumB('realisasi', y) / sumB('anggaran', y);
    return new Chart(cv, {
      type: 'doughnut',
      data: {
        labels: ['Terealisasi', 'Sisa'],
        datasets: [{
          data: [cap * 100, (1 - cap) * 100], borderWidth: 0, borderRadius: 10,
          backgroundColor: (c) => {
            if (c.dataIndex === 1) return css('--grid');
            const a = c.chart.chartArea; if (!a) return css('--g1');
            const g = c.chart.ctx.createLinearGradient(a.left, 0, a.right, 0);
            g.addColorStop(0, css('--t1')); g.addColorStop(1, css('--g1')); return g;
          }
        }]
      },
      options: {
        rotation: -90, circumference: 180, cutout: '78%', responsive: true, maintainAspectRatio: false,
        animation: reduce ? false : { duration: 1800, easing: 'easeOutQuart', animateRotate: true },
        events: [], plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }
  function chDonut(cv, labels, vals, colors, unitDiv) {
    const tot = vals.reduce((a, b) => a + b, 0);
    return new Chart(cv, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderColor: css('--card'), borderWidth: 3, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        animation: reduce ? false : { duration: 1600, easing: 'easeOutQuart', animateRotate: true, animateScale: true },
        plugins: {
          legend: { display: false },
          tooltip: tip({ callbacks: { label: (c) => ' Rp ' + F2.format(c.parsed / (unitDiv || 1e9)) + ' M (' + pct(c.parsed / tot) + ')' } })
        }
      }
    });
  }
  function chVs(cv) {
    const y = state.year, hi = (c) => YRS.map((t) => (t === y || state.view === 'semua' ? c : alpha(c, 0.5)));
    const bel = YRS.map((t) => sumB('realisasi', t) / 1e9), beb = YRS.map((t) => sumL(t) / 1e9);
    return new Chart(cv, {
      type: 'bar',
      data: {
        labels: YRS.map(String),
        datasets: [
          { label: 'Realisasi Belanja (LRA)', data: bel, backgroundColor: hi(css('--c-op')), borderRadius: 7, borderSkipped: false, maxBarThickness: 44 },
          { label: 'Total Beban (LO)', data: beb, backgroundColor: hi(css('--c-pen')), borderRadius: 7, borderSkipped: false, maxBarThickness: 44 }
        ]
      },
      plugins: [valueLabels],
      options: {
        responsive: true, maintainAspectRatio: false, animation: anim(), layout: { padding: { top: 18 } },
        scales: { x: { grid: { display: false }, border: { display: false } }, y: yAxisM('Rp miliar') },
        plugins: { legend: legendTop(), valueLabels: { format: (v) => F0.format(v) }, tooltip: tip({ callbacks: { label: (c) => ' ' + c.dataset.label + ': Rp ' + F2.format(c.parsed.y) + ' M' } }) }
      }
    });
  }
  function chHBar(cv, labels, vals, colors, fmt, tipFn, xopts) {
    return new Chart(cv, {
      type: 'bar',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 6, borderSkipped: false, maxBarThickness: 22 }] },
      plugins: [valueLabels],
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: anim(), layout: { padding: { right: 56 } },
        scales: {
          x: Object.assign({ beginAtZero: true, grid: { color: css('--grid') }, border: { display: false } }, xopts || {}),
          y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, font: { size: 11.5 } } }
        },
        plugins: { legend: { display: false }, valueLabels: { format: fmt }, tooltip: tip({ callbacks: { label: tipFn } }) }
      }
    });
  }
  function chTop(cv) {
    const y = state.year;
    const items = B.slice().sort((a, b) => b.realisasi[y] - a.realisasi[y]).slice(0, 6);
    return chHBar(cv, items.map((r) => wrap(strip(r.uraian), 20)), items.map((r) => r.realisasi[y] / 1e9),
      items.map((r) => css(CB[r.kelompok])), (v) => F1.format(v), (c) => ' Rp ' + F2.format(c.parsed.x) + ' M');
  }
  function chStack(cv, groups, colorMap, getter) {
    return new Chart(cv, {
      type: 'bar',
      data: {
        labels: YRS.map(String),
        datasets: groups.map((g) => ({ label: g.replace(/^(Belanja|Beban) /, ''), data: YRS.map((t) => getter(t, g) / 1e9), backgroundColor: css(colorMap[g]), borderRadius: 4, borderSkipped: false, maxBarThickness: 74 }))
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: anim(),
        onClick: (e, els) => { if (els.length) setYear(YRS[els[0].index]); },
        scales: { x: { stacked: true, grid: { display: false }, border: { display: false } }, y: Object.assign(yAxisM('Rp miliar'), { stacked: true }) },
        plugins: {
          legend: legendTop(),
          tooltip: tip({
            mode: 'index', intersect: false,
            callbacks: {
              label: (c) => ' ' + c.dataset.label + ': Rp ' + F2.format(c.parsed.y) + ' M',
              footer: (items) => 'Total: Rp ' + F2.format(items.reduce((s, i) => s + i.parsed.y, 0)) + ' M'
            }
          })
        }
      }
    });
  }
  function chCapaian(cv) {
    const y = state.year, items = B.filter((r) => r.anggaran[y] > 0);
    return chHBar(cv, items.map((r) => wrap(strip(r.uraian).replace(/^Modal /, ''), 18)), items.map((r) => (r.realisasi[y] / r.anggaran[y]) * 100),
      items.map((r) => css(CB[r.kelompok])), (v) => F1.format(v) + '%',
      (c) => ' Capaian: ' + F2.format(c.parsed.x) + '%', { max: 110, ticks: { callback: (v) => (v <= 100 ? v + '%' : '') } });
  }

  /* ---------- komponen HTML ---------- */
  const ICON = {
    up: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>'
  };
  function chgBadge(cur, prev) {
    if (!prev) return '<span class="chg na">—</span>';
    const p = cur / prev - 1, a = Math.abs(p * 100);
    const t = a >= 1000 ? '>1.000' : (a >= 100 ? F0.format(a) : F1.format(a));
    return '<span class="chg ' + (p >= 0 ? 'up' : 'dn') + '">' + (p >= 0 ? '▲' : '▼') + ' ' + t + '%</span>';
  }
  function spark(vals, color) {
    const w = 92, h = 30, p = 4, mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rg = mx - mn || 1;
    const pts = vals.map((v, i) => [p + (i * (w - 2 * p)) / (vals.length - 1), h - p - ((v - mn) / rg) * (h - 2 * p)]);
    const d = 'M' + pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L');
    const l = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><path d="' + d + '" pathLength="1" style="stroke:' + color + '"/><circle cx="' + l[0].toFixed(1) + '" cy="' + l[1].toFixed(1) + '" r="3" fill="' + color + '"/></svg>';
  }
  const pbar = (f) => '<span class="pbar" style="--w:' + Math.min(100, f * 100).toFixed(1) + '%"><span><i></i></span><b>' + pct(f) + '</b></span>';
  function kpi(cls, label, val, series, foot, i) {
    const big = val >= 1e12, n = big ? val / 1e12 : val / 1e9, mx = Math.max.apply(null, series);
    const bars = series.map((v, j) => '<i class="' + (YRS[j] === state.year ? 'cur' : '') + '" style="--j:' + j + ';height:' + Math.max(22, (v / mx) * 100).toFixed(0) + '%"></i>').join('');
    return '<div class="kpi ' + cls + ' reveal" style="--i:' + i + '"><div class="mini" aria-hidden="true">' + bars + '</div>' +
      '<div class="v">Rp <span data-count="' + n.toFixed(4) + '" data-dec="2">' + F2.format(n) + '</span> <small>' + (big ? 'triliun' : 'miliar') + '</small></div>' +
      '<div class="l">' + label + '</div><div class="spacer-v"></div><div class="foot">' + ICON.up + foot + '</div></div>';
  }
  const footChg = (cur, prev, y) => { const p = cur / prev - 1; return (p >= 0 ? 'Naik ' : 'Turun ') + F2.format(Math.abs(p * 100)) + '% dibanding ' + (y - 1); };
  function legendList(labels, vals, colors) {
    const tot = vals.reduce((a, b) => a + b, 0);
    return '<ul class="legend">' + labels.map((l, i) => '<li><i style="background:' + colors[i] + '"></i><span>' + l + '</span><b>' + pct(vals[i] / tot, 1) + '</b></li>').join('') + '</ul>';
  }
  function unitSeg() {
    return '<div class="seg" role="group" aria-label="Satuan angka"><button data-unit="miliar" aria-pressed="' + (state.unit === 'miliar') + '">Rp miliar</button><button data-unit="penuh" aria-pressed="' + (state.unit === 'penuh') + '">Rp penuh</button></div>';
  }
  const unitLabel = () => (state.unit === 'miliar' ? 'Angka dalam Rp miliar (rupiah ÷ 1.000.000.000)' : 'Angka dalam rupiah penuh');

  /* ---------- tabel ---------- */
  const tableFns = {};
  function tblKelompok() {
    const y = state.year, rows = [];
    GB.forEach((g) => {
      const a = sumB('anggaran', y, g), r = sumB('realisasi', y, g), pv = sumB('realisasi', y - 1, g);
      const tr = ALLY.map((t) => sumB('realisasi', t, g));
      rows.push('<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:9px;background:' + css(CB[g]) + '"></i>' + g + '</td><td>' + money(a) + '</td><td>' + money(r) + '</td><td>' + (a ? pbar(r / a) : '—') + '</td><td>' + chgBadge(r, pv) + '</td><td>' + spark(tr, css(CB[g])) + '</td></tr>');
    });
    const A = sumB('anggaran', y), R = sumB('realisasi', y), P = sumB('realisasi', y - 1);
    rows.push('<tr class="tot"><td>JUMLAH BELANJA</td><td>' + money(A) + '</td><td>' + money(R) + '</td><td>' + pbar(R / A) + '</td><td>' + chgBadge(R, P) + '</td><td>' + spark(ALLY.map((t) => sumB('realisasi', t)), css('--accent')) + '</td></tr>');
    return '<table class="tbl"><thead><tr><th>Kelompok</th><th>Anggaran ' + y + '</th><th>Realisasi ' + y + '</th><th>Capaian</th><th>vs ' + (y - 1) + '</th><th>Tren</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }
  function tblBelanja() {
    const y = state.year, out = [];
    GB.forEach((g) => {
      out.push('<tr class="grp"><td colspan="6"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:9px;background:' + css(CB[g]) + '"></i>' + g + '</td></tr>');
      B.filter((r) => r.kelompok === g).forEach((r) => {
        const a = r.anggaran[y], rl = r.realisasi[y];
        out.push('<tr><td class="item">' + r.uraian + '<span class="kode">' + r.kode + '</span></td><td>' + money(a) + '</td><td>' + money(rl) + '</td><td>' + (a ? pbar(rl / a) : '—') + '</td><td>' + chgBadge(rl, r.realisasi[y - 1]) + '</td><td>' + spark(ALLY.map((t) => r.realisasi[t]), css(CB[g])) + '</td></tr>');
      });
      const a = sumB('anggaran', y, g), rl = sumB('realisasi', y, g);
      out.push('<tr class="sub"><td>Jumlah ' + g + '</td><td>' + money(a) + '</td><td>' + money(rl) + '</td><td>' + (a ? pbar(rl / a) : '—') + '</td><td>' + chgBadge(rl, sumB('realisasi', y - 1, g)) + '</td><td>' + spark(ALLY.map((t) => sumB('realisasi', t, g)), css(CB[g])) + '</td></tr>');
    });
    const A = sumB('anggaran', y), R = sumB('realisasi', y);
    out.push('<tr class="tot"><td>JUMLAH BELANJA</td><td>' + money(A) + '</td><td>' + money(R) + '</td><td>' + pbar(R / A) + '</td><td>' + chgBadge(R, sumB('realisasi', y - 1)) + '</td><td>' + spark(ALLY.map((t) => sumB('realisasi', t)), css('--accent')) + '</td></tr>');
    return '<table class="tbl"><thead><tr><th>Uraian</th><th>Anggaran ' + y + '</th><th>Realisasi ' + y + '</th><th>Capaian</th><th>vs ' + (y - 1) + '</th><th>Tren ' + PREV + '–' + YRS[YRS.length - 1] + '</th></tr></thead><tbody>' + out.join('') + '</tbody></table>';
  }
  function tblBeban() {
    const y = state.year, out = [];
    const row = (cls, label, cur, prev, series, color, kode) => '<tr class="' + cls + '"><td class="' + (cls ? '' : 'item') + '">' + label + (kode ? '<span class="kode">' + kode + '</span>' : '') + '</td><td>' + money(cur) + '</td><td>' + money(prev) + '</td><td>' + (cur - prev === 0 ? '—' : signed(cur - prev)) + '</td><td>' + chgBadge(cur, prev) + '</td><td>' + spark(series, color) + '</td></tr>';
    GL.forEach((g) => {
      out.push('<tr class="grp"><td colspan="6"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:9px;background:' + css(CL[g]) + '"></i>' + g + '</td></tr>');
      L.filter((r) => r.kelompok === g).forEach((r) => out.push(row('', r.uraian, r.nilai[y], r.nilai[y - 1], ALLY.map((t) => r.nilai[t]), css(CL[g]), r.kode)));
      out.push(row('sub', 'Jumlah ' + g, sumL(y, g), sumL(y - 1, g), ALLY.map((t) => sumL(t, g)), css(CL[g])));
    });
    out.push(row('tot', 'JUMLAH BEBAN', sumL(y), sumL(y - 1), ALLY.map((t) => sumL(t)), css('--accent')));
    return '<table class="tbl"><thead><tr><th>Uraian</th><th>Tahun ' + y + '</th><th>Tahun ' + (y - 1) + '</th><th>Selisih</th><th>Perubahan</th><th>Tren ' + PREV + '–' + YRS[YRS.length - 1] + '</th></tr></thead><tbody>' + out.join('') + '</tbody></table>';
  }
  function tableCard(id, fn, titleTxt, subTxt, idx, noDl) {
    tableFns[id] = fn;
    return '<section class="card reveal" style="--i:' + idx + '"><div class="card-head"><div><h2>' + titleTxt + '</h2><p class="sub">' + subTxt + ' <span class="unit-lbl">' + unitLabel() + '</span></p></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + unitSeg() + '' + (noDl ? '' : '<a class="btn-dl" href="' + fileOf(state.year) + '" download>' + ICON.dl + '<span class="lbl">Excel ' + state.year + '</span></a>') + '</div></div><div class="tbl-wrap" id="' + id + '">' + fn() + '</div></section>';
  }
  function refreshTables() {
    Object.keys(tableFns).forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = tableFns[id](); });
    document.querySelectorAll('.unit-lbl').forEach((e) => { e.textContent = unitLabel(); });
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === state.unit)));
  }

  /* ---------- tampilan ---------- */
  function vRingkasan() {
    const y = state.year;
    const rB = sumB('realisasi', y), aB = sumB('anggaran', y), pB = sumB('realisasi', y - 1), beb = sumL(y), pBeb = sumL(y - 1);
    const op = sumB('realisasi', y, 'Belanja Operasi'), mod = sumB('realisasi', y, 'Belanja Modal');
    const ch = rB / pB - 1, cap = rB / aB;
    const peg = B.filter((r) => r.uraian === 'Belanja Pegawai')[0].realisasi[y];
    const insight = 'Realisasi belanja tahun <b>' + y + '</b> mencapai <b>' + rpShort(rB) + '</b> (' + pct(cap) + ' dari anggaran), ' + (ch >= 0 ? 'naik ' : 'turun ') + F2.format(Math.abs(ch * 100)) + '% dibanding ' + (y - 1) + '. <b>Belanja Operasi</b> menyerap ' + pct(op / rB, 1) + ' dari total (belanja pegawai saja ' + pct(peg / rB, 1) + '), sedangkan <b>Belanja Modal</b> hanya ' + pct(mod / rB, 1) + '. Total beban dalam Laporan Operasional ' + y + ' sebesar <b>' + rpShort(beb) + '</b>.';
    const diff = beb - rB;
    const topList = B.slice().sort((a, b) => b.realisasi[y] - a.realisasi[y])[0];
    const kel = GB.map((g) => sumB('realisasi', y, g)), kc = GB.map((g) => css(CB[g]));
    reg('chTrend', chTrend); reg('chGauge', chGauge); reg('chKom', (cv) => chDonut(cv, GB, kel, kc)); reg('chVs', chVs); reg('chTop', chTop);
    return '<section class="hero reveal"><div class="eyebrow">Kabupaten Gunungkidul · LKPD ' + YRS[0] + '–' + YRS[YRS.length - 1] + '</div><h1>Dashboard Belanja dan Beban Daerah</h1><p class="insight">' + insight + '</p></section>' +
      '<div class="grid g-4">' +
      kpi('o', 'Realisasi Belanja ' + y, rB, YRS.map((t) => sumB('realisasi', t)), footChg(rB, pB, y), 1) +
      kpi('g', 'Belanja Operasi', op, YRS.map((t) => sumB('realisasi', t, 'Belanja Operasi')), footChg(op, sumB('realisasi', y - 1, 'Belanja Operasi'), y), 2) +
      kpi('r', 'Belanja Modal', mod, YRS.map((t) => sumB('realisasi', t, 'Belanja Modal')), footChg(mod, sumB('realisasi', y - 1, 'Belanja Modal'), y), 3) +
      kpi('t', 'Total Beban (LO) ' + y, beb, YRS.map((t) => sumL(t)), footChg(beb, pBeb, y), 4) +
      '</div>' +
      '<div class="grid g-21">' +
      '<section class="card reveal" style="--i:1"><div class="card-head"><div><h2>Anggaran vs Realisasi Belanja</h2><p class="sub">Per tahun anggaran, Rp miliar · klik batang untuk memilih tahun</p></div></div>' + box('chTrend', '', 'Grafik batang anggaran dan realisasi belanja per tahun') + '</section>' +
      '<section class="card reveal" style="--i:2"><div class="card-head"><div><h2>Serapan Anggaran ' + y + '</h2><p class="sub">Realisasi ÷ anggaran belanja</p></div></div>' +
      '<div class="gauge"><canvas id="chGauge" role="img" aria-label="Serapan anggaran belanja ' + pct(cap) + '"></canvas><div class="mid"><b><span data-count="' + (cap * 100).toFixed(4) + '" data-dec="2">' + F2.format(cap * 100) + '</span>%</b><small>dari anggaran terserap</small></div></div>' +
      '<div class="gauge-stats"><div><small>Anggaran</small><b>' + rpShort(aB) + '</b></div><div><small>Sisa anggaran</small><b>' + rpShort(aB - rB) + '</b></div></div>' +
      '<a class="dl-block" href="' + fileOf(y) + '" download>' + ICON.dl + 'Unduh Laporan Excel TA ' + y + '</a></section></div>' +
      '<div class="grid g-21">' + tableCard('tblK', tblKelompok, 'Belanja per Kelompok ' + y, 'Anggaran, realisasi, dan capaian.', 1) +
      '<section class="card reveal" style="--i:2"><div class="card-head"><div><h2>Komposisi Belanja ' + y + '</h2><p class="sub">Porsi realisasi per kelompok</p></div></div><div class="donut">' + box('chKom', 'short', 'Diagram donat komposisi realisasi belanja') + '<div class="mid"><b>' + (rB / 1e12).toFixed(2).replace('.', ',') + ' T</b><small>total belanja</small></div></div>' + legendList(GB, kel, kc) + '</section></div>' +
      '<div class="grid g-11">' +
      '<section class="card reveal" style="--i:1"><div class="card-head"><div><h2>Belanja (LRA) vs Beban (LO)</h2><p class="sub">Realisasi belanja dan total beban per tahun, Rp miliar</p></div></div>' + box('chVs', 'short', 'Grafik batang realisasi belanja dan total beban per tahun') +
      '<p class="note-line">Tahun <b>' + y + '</b>: beban (LO) ' + (diff >= 0 ? 'lebih tinggi ' : 'lebih rendah ') + '<b>' + rpShort(Math.abs(diff)) + '</b> dari realisasi belanja (LRA). LRA mencatat belanja daerah, sedangkan LO memakai dasar akrual dan memuat beban penyusutan.</p></section>' +
      '<section class="card reveal" style="--i:2"><div class="card-head"><div><h2>Enam Belanja Terbesar ' + y + '</h2><p class="sub">Jenis belanja dengan realisasi tertinggi, Rp miliar</p></div></div>' + box('chTop', 'short', 'Grafik batang enam jenis belanja terbesar') +
      '<p class="note-line"><b>' + topList.uraian + '</b> adalah yang terbesar: ' + rpShort(topList.realisasi[y]) + ' (' + pct(topList.realisasi[y] / rB, 1) + ' dari total belanja).</p></section></div>' + narasi(y);
  }

  function vBelanja() {
    const y = state.year, A = sumB('anggaran', y), R = sumB('realisasi', y), P = sumB('realisasi', y - 1);
    reg('chStackB', (cv) => chStack(cv, GB, CB, (t, g) => sumB('realisasi', t, g))); reg('chCap', chCapaian);
    const st = (cls, lab, val, sub, w, i) => '<section class="card reveal" style="--i:' + i + '"><div class="stat ' + cls + '"><small>' + lab + '</small><b>' + val + '</b><em>' + sub + '</em><div class="bar"><i style="--w:' + w + '%"></i></div></div></section>';
    return '<section class="hero reveal"><div class="eyebrow">Laporan Realisasi Anggaran (LRA)</div><h1>Belanja Daerah ' + y + '</h1><p class="insight">Rincian anggaran dan realisasi belanja menurut kelompok dan jenis belanja. Capaian adalah realisasi dibagi anggaran. Pilih tahun di bagian atas atau klik batang pada grafik.</p></section>' +
      '<div class="grid g-4">' +
      st('s1', 'Anggaran ' + y, rpShort(A), 'sesuai kolom anggaran LRA', 100, 1) +
      st('s2', 'Realisasi ' + y, rpShort(R), (R / P >= 1 ? 'naik ' : 'turun ') + F2.format(Math.abs((R / P - 1) * 100)) + '% dari ' + (y - 1), (R / A) * 100, 2) +
      st('s3', 'Capaian', pct(R / A), 'realisasi ÷ anggaran', (R / A) * 100, 3) +
      st('s4', 'Sisa anggaran', rpShort(A - R), 'belum terealisasi', ((A - R) / A) * 100, 4) +
      '</div><div class="grid g-21">' +
      '<section class="card reveal" style="--i:1"><div class="card-head"><div><h2>Realisasi Belanja per Kelompok</h2><p class="sub">Per tahun, ditumpuk menurut kelompok, Rp miliar</p></div></div>' + box('chStackB', '', 'Grafik batang bertumpuk realisasi belanja per kelompok') + '</section>' +
      '<section class="card reveal" style="--i:2"><div class="card-head"><div><h2>Capaian per Jenis ' + y + '</h2><p class="sub">Persentase realisasi terhadap anggaran</p></div></div>' + box('chCap', 'tall', 'Grafik batang capaian anggaran per jenis belanja') + '<div class="key">' + GB.map((g) => '<span><i style="background:' + css(CB[g]) + '"></i>' + strip(g) + '</span>').join('') + '</div></section></div>' +
      tableCard('tblB', tblBelanja, 'Rincian Belanja ' + y, 'Per jenis belanja menurut LRA.', 1);
  }

  function vBeban() {
    const y = state.year, T = sumL(y), P = sumL(y - 1);
    const kel = GL.map((g) => sumL(y, g)), kc = GL.map((g) => css(CL[g]));
    reg('chStackL', (cv) => chStack(cv, GL, CL, (t, g) => sumL(t, g))); reg('chKomL', (cv) => chDonut(cv, GL, kel, kc));
    const st = (cls, lab, val, sub, w, i) => '<section class="card reveal" style="--i:' + i + '"><div class="stat ' + cls + '"><small>' + lab + '</small><b>' + val + '</b><em>' + sub + '</em><div class="bar"><i style="--w:' + w + '%"></i></div></div></section>';
    const op = sumL(y, 'Beban Operasi'), pen = sumL(y, 'Beban Penyusutan dan Amortisasi'), tr = sumL(y, 'Beban Transfer');
    const bkL = L.filter((r) => r.uraian === 'Beban Bantuan Keuangan')[0], bkB = B.filter((r) => r.uraian === 'Belanja Bantuan Keuangan')[0];
    const callout = bkL.nilai[y] / bkB.realisasi[y] < 0.7 ? '<p class="note-line callout"><b>Catatan:</b> Beban Bantuan Keuangan ' + y + ' (' + rpShort(bkL.nilai[y]) + ') jauh di bawah Belanja Bantuan Keuangan pada LRA (' + rpShort(bkB.realisasi[y]) + '). Angka mengikuti dokumen sumber; penjelasannya perlu dicek pada Catatan atas Laporan Keuangan.</p>' : '';
    return '<section class="hero reveal"><div class="eyebrow">Laporan Operasional (LO)</div><h1>Beban Daerah ' + y + '</h1><p class="insight">Beban pada Laporan Operasional dicatat dengan dasar akrual, sehingga memuat beban penyusutan dan penyisihan piutang yang tidak ada di belanja. LO tidak memuat anggaran, jadi yang dibandingkan adalah tahun ini dengan tahun lalu.</p></section>' +
      '<div class="grid g-4">' +
      st('s1', 'Total Beban ' + y, rpShort(T), (T / P >= 1 ? 'naik ' : 'turun ') + F2.format(Math.abs((T / P - 1) * 100)) + '% dari ' + (y - 1), 100, 1) +
      st('s2', 'Beban Operasi', rpShort(op), pct(op / T, 1) + ' dari total beban', (op / T) * 100, 2) +
      st('s3', 'Penyusutan dan Amortisasi', rpShort(pen), pct(pen / T, 1) + ' dari total beban', (pen / T) * 100, 3) +
      st('s4', 'Beban Transfer', rpShort(tr), pct(tr / T, 1) + ' dari total beban', (tr / T) * 100, 4) +
      '</div><div class="grid g-21">' +
      '<section class="card reveal" style="--i:1"><div class="card-head"><div><h2>Beban per Kelompok</h2><p class="sub">Per tahun, ditumpuk menurut kelompok, Rp miliar</p></div></div>' + box('chStackL', '', 'Grafik batang bertumpuk beban per kelompok') + '</section>' +
      '<section class="card reveal" style="--i:2"><div class="card-head"><div><h2>Komposisi Beban ' + y + '</h2><p class="sub">Porsi per kelompok</p></div></div><div class="donut">' + box('chKomL', 'short', 'Diagram donat komposisi beban') + '<div class="mid"><b>' + (T / 1e12).toFixed(2).replace('.', ',') + ' T</b><small>total beban</small></div></div>' + legendList(GL.map((g) => g.replace('Beban ', '')), kel, kc) + '</section></div>' +
      tableCard('tblL', tblBeban, 'Rincian Beban ' + y, 'Per jenis beban menurut LO.', 1) + callout;
  }


  /* ---------- narasi (dihitung dari data, bukan ditulis tangan) ---------- */
  const dirPct = (c, p) => (c >= p ? 'naik ' : 'turun ') + F2.format(Math.abs((c / p - 1) * 100)) + '%';
  const pegawai = (t) => B.filter((r) => r.uraian === 'Belanja Pegawai')[0].realisasi[t];
  const bantuan = (t) => ({ l: L.filter((r) => r.uraian === 'Beban Bantuan Keuangan')[0].nilai[t], b: B.filter((r) => r.uraian === 'Belanja Bantuan Keuangan')[0].realisasi[t] });
  const byYear = (fn, fmt) => YRS.map((t) => (fmt || rpShort)(fn(t)) + ' (' + t + ')').join(', ');
  const trendWord = (a) => (a.every((v, i) => i === 0 || v < a[i - 1]) ? 'turun setiap tahun' : a.every((v, i) => i === 0 || v > a[i - 1]) ? 'naik setiap tahun' : 'berubah-ubah');
  const narCard = (i, title, body) => '<section class="card prose reveal" style="--i:' + i + '"><h3>' + title + '</h3>' + body + '</section>';
  const LAST = YRS[YRS.length - 1];
  const auditNote = (y) => (y === LAST
    ? 'Di LKPD sumber, kolom ' + y + ' tidak berlabel “Audited”, sedangkan LO ' + YRS.slice(0, -1).join(' dan ') + ' berlabel “Audited”. Karena itu angka ' + y + ' sebaiknya dicek ulang sebelum dikutip.'
    : 'Di LKPD sumber, LO tahun ' + y + ' berlabel “Audited”.');
  const bkNote = (y) => { const k = bantuan(y); return k.l / k.b < 0.7 ? 'Beban Bantuan Keuangan ' + y + ' (' + rpShort(k.l) + ') jauh di bawah Belanja Bantuan Keuangan pada LRA (' + rpShort(k.b) + '). Angka mengikuti dokumen sumber; penjelasannya perlu dicari di Catatan atas Laporan Keuangan.' : ''; };

  function narasi(y) {
    const rB = sumB('realisasi', y), aB = sumB('anggaran', y), pB = sumB('realisasi', y - 1), beb = sumL(y), pBeb = sumL(y - 1);
    const op = sumB('realisasi', y, 'Belanja Operasi'), mod = sumB('realisasi', y, 'Belanja Modal'), pMod = sumB('realisasi', y - 1, 'Belanja Modal');
    const low = B.filter((r) => r.anggaran[y] >= 1e9 && r.kelompok !== 'Belanja Tidak Terduga').sort((a, b) => a.realisasi[y] / a.anggaran[y] - b.realisasi[y] / b.anggaran[y])[0];
    const big = GL.slice().sort((a, b) => sumL(y, b) - sumL(y, a))[0];
    const bk = bkNote(y);
    const umum = '<p>Bagian ini memberikan gambaran mengenai alokasi dan realisasi belanja Pemerintah Kabupaten Gunungkidul selama tahun <b>' + y + '</b>. Datanya dari dua laporan di LKPD. <b>Laporan Realisasi Anggaran (LRA)</b> mencatat belanja yang benar-benar keluar (basis kas), sedangkan <b>Laporan Operasional (LO)</b> mencatat beban yang timbul pada tahun itu (basis akrual), termasuk penyusutan aset yang tidak mengeluarkan uang tunai. Karena itu belanja dan beban tidak selalu sama.</p>' +
      '<p>Realisasi belanja ' + y + ' sebesar <b>' + rpShort(rB) + '</b> (' + pct(rB / aB) + ' dari anggaran ' + rpShort(aB) + '), ' + dirPct(rB, pB) + ' dibanding ' + (y - 1) + '. Total beban sebesar <b>' + rpShort(beb) + '</b>, ' + dirPct(beb, pBeb) + '.</p>' +
      '<p class="callout">' + auditNote(y) + '</p>';
    const temuan = '<ul><li><b>Belanja Operasi mendominasi:</b> ' + pct(op / rB, 1) + ' dari total belanja, dan belanja pegawai saja ' + pct(pegawai(y) / rB, 1) + ' (' + rpShort(pegawai(y)) + ').</li>' +
      '<li><b>Belanja Modal</b> (aset seperti jalan, gedung, dan peralatan) hanya ' + rpShort(mod) + ' atau ' + pct(mod / rB, 1) + ' dari total belanja, ' + dirPct(mod, pMod) + ' dibanding ' + (y - 1) + '.</li>' +
      '<li><b>Serapan anggaran ' + pct(rB / aB) + '</b> dengan sisa anggaran ' + rpShort(aB - rB) + '. Di luar Belanja Tidak Terduga, capaian terendah ada pada <b>' + low.uraian + '</b> (' + pct(low.realisasi[y] / low.anggaran[y]) + ' dari anggaran ' + rpShort(low.anggaran[y]) + ').</li>' +
      '<li><b>Beban terbesar:</b> ' + big + ', ' + pct(sumL(y, big) / beb, 1) + ' dari total beban.</li>' +
      (bk ? '<li>' + bk + '</li>' : '') + '</ul>';
    const lanjut = '<p>Dashboard ini menunjukkan <b>apa</b> yang berubah, bukan <b>mengapa</b>. Penyebab perubahan perlu dicari di Catatan atas Laporan Keuangan (CaLK), dokumen perencanaan, atau laporan kinerja daerah.</p>' +
      '<ul><li>Pantau porsi Belanja Modal terhadap total belanja (' + pct(mod / rB, 1) + ' pada ' + y + ') dari tahun ke tahun.</li><li>Bandingkan capaian antarjenis belanja untuk melihat jenis yang serapannya rendah.</li><li>Untuk analisis lanjutan, hasil ini bisa dibandingkan dengan daerah sejenis, misalnya rasio belanja modal dan belanja pegawai.</li></ul>' +
      '<p>Referensi jurnal dan regulasi belum dimasukkan di sini, jadi tambahkan dulu sebelum dikutip dalam laporan.</p>';
    return '<h2 class="sec-title reveal">Narasi dan Analisis ' + y + '</h2><div class="grid g-3">' + narCard(1, 'Gambaran umum', umum) + narCard(2, 'Temuan utama', temuan) + narCard(3, 'Catatan dan analisis lanjutan', lanjut) + '</div>';
  }

  function narasiAll() {
    const f = YRS[0], l = LAST;
    const caps = YRS.map((t) => sumB('realisasi', t) / sumB('anggaran', t));
    const aT = YRS.reduce((s, t) => s + sumB('anggaran', t), 0), rT = YRS.reduce((s, t) => s + sumB('realisasi', t), 0), bT = YRS.reduce((s, t) => s + sumL(t), 0);
    const shr = (t, g) => sumB('realisasi', t, g) / sumB('realisasi', t);
    const modF = sumB('realisasi', f, 'Belanja Modal'), modL = sumB('realisasi', l, 'Belanja Modal');
    const bk = bkNote(l);
    const umum = '<p>Halaman ini merangkum seluruh data <b>' + f + '–' + l + '</b> dalam satu tampilan, supaya tren antartahun bisa dibaca sekaligus.</p>' +
      '<p>Selama ' + YRS.length + ' tahun, realisasi belanja berjumlah <b>' + rpShort(rT) + '</b> dari anggaran <b>' + rpShort(aT) + '</b> (rata-rata serapan ' + pct(rT / aT) + '). Total beban pada Laporan Operasional berjumlah <b>' + rpShort(bT) + '</b>.</p>' +
      '<p class="callout">' + auditNote(l) + '</p>';
    const temuan = '<ul><li><b>Realisasi belanja:</b> ' + byYear((t) => sumB('realisasi', t)) + '.</li>' +
      '<li><b>Capaian anggaran:</b> ' + caps.map((c, i) => pct(c) + ' (' + YRS[i] + ')').join(', ') + ' (' + trendWord(caps) + ').</li>' +
      '<li><b>Porsi Belanja Operasi</b> ' + (shr(l, 'Belanja Operasi') >= shr(f, 'Belanja Operasi') ? 'naik' : 'turun') + ' dari ' + pct(shr(f, 'Belanja Operasi'), 1) + ' (' + f + ') menjadi ' + pct(shr(l, 'Belanja Operasi'), 1) + ' (' + l + '). Belanja pegawai ' + rpShort(pegawai(f)) + ' menjadi ' + rpShort(pegawai(l)) + ' (' + dirPct(pegawai(l), pegawai(f)) + ').</li>' +
      '<li><b>Belanja Modal:</b> ' + byYear((t) => sumB('realisasi', t, 'Belanja Modal')) + ', ' + dirPct(modL, modF) + ' selama periode. Porsinya ' + pct(shr(f, 'Belanja Modal'), 1) + ' menjadi ' + pct(shr(l, 'Belanja Modal'), 1) + '.</li>' +
      '<li><b>Total beban (LO):</b> ' + byYear((t) => sumL(t)) + '.</li></ul>';
    const lanjut = '<p>Angka ' + PREV + ' hanya dipakai sebagai pembanding untuk menghitung perubahan ' + f + '. Belanja (LRA) dan beban (LO) memakai dasar pencatatan berbeda, jadi keduanya tidak untuk dijumlahkan.</p>' +
      (bk ? '<p class="callout">' + bk + '</p>' : '') +
      '<p>Dashboard ini menunjukkan <b>apa</b> yang berubah, bukan <b>mengapa</b>. Penyebabnya perlu dicari di CaLK, dokumen perencanaan, atau laporan kinerja. Referensi jurnal dan regulasi belum dimasukkan di sini, jadi tambahkan dulu sebelum dikutip dalam laporan.</p>';
    return '<h2 class="sec-title reveal">Narasi dan Analisis ' + f + '–' + l + '</h2><div class="grid g-3">' + narCard(1, 'Gambaran umum', umum) + narCard(2, 'Temuan utama', temuan) + narCard(3, 'Catatan dan analisis lanjutan', lanjut) + '</div>';
  }

  /* ---------- tabel semua tahun ---------- */
  const dot = (c) => '<i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:9px;background:' + c + '"></i>';
  function tblBelanjaAll() {
    const out = [], cells = (a, rl) => '<td>' + money(a) + '</td><td>' + money(rl) + '</td><td>' + (a ? pbar(rl / a) : '—') + '</td>';
    GB.forEach((g) => {
      out.push('<tr class="grp"><td colspan="' + (2 + YRS.length * 3) + '">' + dot(css(CB[g])) + g + '</td></tr>');
      B.filter((r) => r.kelompok === g).forEach((r) => out.push('<tr><td class="item">' + r.uraian + '<span class="kode">' + r.kode + '</span></td>' + YRS.map((t) => cells(r.anggaran[t], r.realisasi[t])).join('') + '<td>' + spark(ALLY.map((t) => r.realisasi[t]), css(CB[g])) + '</td></tr>'));
      out.push('<tr class="sub"><td>Jumlah ' + g + '</td>' + YRS.map((t) => cells(sumB('anggaran', t, g), sumB('realisasi', t, g))).join('') + '<td>' + spark(ALLY.map((t) => sumB('realisasi', t, g)), css(CB[g])) + '</td></tr>');
    });
    out.push('<tr class="tot"><td>JUMLAH BELANJA</td>' + YRS.map((t) => cells(sumB('anggaran', t), sumB('realisasi', t))).join('') + '<td>' + spark(ALLY.map((t) => sumB('realisasi', t)), css('--accent')) + '</td></tr>');
    return '<table class="tbl wide"><thead><tr><th rowspan="2">Uraian</th>' + YRS.map((t) => '<th colspan="3" class="yh">' + t + '</th>').join('') + '<th rowspan="2">Tren ' + PREV + '–' + LAST + '</th></tr><tr>' + YRS.map(() => '<th>Anggaran</th><th>Realisasi</th><th>Capaian</th>').join('') + '</tr></thead><tbody>' + out.join('') + '</tbody></table>';
  }
  function tblBebanAll() {
    const out = [], f = YRS[0];
    const row = (cls, label, get, color, kode) => '<tr class="' + cls + '"><td class="' + (cls ? '' : 'item') + '">' + label + (kode ? '<span class="kode">' + kode + '</span>' : '') + '</td>' + ALLY.map((t) => '<td>' + money(get(t)) + '</td>').join('') + '<td>' + chgBadge(get(LAST), get(f)) + '</td><td>' + spark(ALLY.map(get), color) + '</td></tr>';
    GL.forEach((g) => {
      out.push('<tr class="grp"><td colspan="' + (3 + ALLY.length) + '">' + dot(css(CL[g])) + g + '</td></tr>');
      L.filter((r) => r.kelompok === g).forEach((r) => out.push(row('', r.uraian, (t) => r.nilai[t], css(CL[g]), r.kode)));
      out.push(row('sub', 'Jumlah ' + g, (t) => sumL(t, g), css(CL[g])));
    });
    out.push(row('tot', 'JUMLAH BEBAN', (t) => sumL(t), css('--accent')));
    return '<table class="tbl wide narrow"><thead><tr><th>Uraian</th>' + ALLY.map((t) => '<th>' + t + '</th>').join('') + '<th>' + f + '→' + LAST + '</th><th>Tren ' + PREV + '–' + LAST + '</th></tr></thead><tbody>' + out.join('') + '</tbody></table>';
  }

  function vSemua() {
    const f = YRS[0], l = LAST;
    const aT = YRS.reduce((s, t) => s + sumB('anggaran', t), 0), rT = YRS.reduce((s, t) => s + sumB('realisasi', t), 0), bT = YRS.reduce((s, t) => s + sumL(t), 0);
    const modF = sumB('realisasi', f, 'Belanja Modal'), modL = sumB('realisasi', l, 'Belanja Modal');
    reg('chTrend', chTrend); reg('chVs', chVs);
    reg('chStackB', (cv) => chStack(cv, GB, CB, (t, g) => sumB('realisasi', t, g)));
    reg('chStackL', (cv) => chStack(cv, GL, CL, (t, g) => sumL(t, g)));
    const st = (cls, lab, val, sub, w, i) => '<section class="card reveal" style="--i:' + i + '"><div class="stat ' + cls + '"><small>' + lab + '</small><b>' + val + '</b><em>' + sub + '</em><div class="bar"><i style="--w:' + Math.min(100, w).toFixed(1) + '%"></i></div></div></section>';
    const cardC = (i, h, sub, id, label, cls) => '<section class="card reveal" style="--i:' + i + '"><div class="card-head"><div><h2>' + h + '</h2><p class="sub">' + sub + '</p></div></div>' + box(id, cls || '', label) + '</section>';
    return '<section class="hero reveal"><div class="eyebrow">Semua tahun · LKPD ' + f + '–' + l + '</div><h1>Data Lengkap ' + f + '–' + l + '</h1><p class="insight">Seluruh data belanja (LRA) dan beban (LO) untuk ' + YRS.length + ' tahun dalam satu halaman: grafik perbandingan, rincian per jenis, dan narasi. Pilih salah satu tahun di bagian atas untuk melihat satu tahun saja.</p></section>' +
      '<div class="grid g-4">' +
      st('s1', 'Realisasi belanja ' + f + '–' + l, rpShort(rT), 'dari anggaran ' + rpShort(aT), (rT / aT) * 100, 1) +
      st('s2', 'Rata-rata capaian', pct(rT / aT), 'realisasi ÷ anggaran, ' + YRS.length + ' tahun', (rT / aT) * 100, 2) +
      st('s3', 'Belanja Modal ' + l, rpShort(modL), dirPct(modL, modF) + ' dari ' + f, (modL / modF) * 100, 3) +
      st('s4', 'Total beban ' + f + '–' + l, rpShort(bT), 'Laporan Operasional', 100, 4) +
      '</div><div class="grid g-11">' +
      cardC(1, 'Anggaran vs Realisasi Belanja', 'Per tahun anggaran, Rp miliar', 'chTrend', 'Grafik batang anggaran dan realisasi belanja per tahun') +
      cardC(2, 'Belanja (LRA) vs Beban (LO)', 'Realisasi belanja dan total beban per tahun, Rp miliar', 'chVs', 'Grafik batang realisasi belanja dan total beban per tahun') +
      '</div><div class="grid g-11">' +
      cardC(1, 'Realisasi Belanja per Kelompok', 'Per tahun, ditumpuk menurut kelompok, Rp miliar', 'chStackB', 'Grafik batang bertumpuk realisasi belanja per kelompok') +
      cardC(2, 'Beban per Kelompok', 'Per tahun, ditumpuk menurut kelompok, Rp miliar', 'chStackL', 'Grafik batang bertumpuk beban per kelompok') +
      '</div>' +
      tableCard('tblBA', tblBelanjaAll, 'Rincian Belanja ' + f + '–' + l, 'Anggaran, realisasi, dan capaian per jenis belanja, semua tahun.', 1, true) +
      tableCard('tblLA', tblBebanAll, 'Rincian Beban ' + PREV + '–' + l, 'Beban per jenis menurut LO, semua tahun (' + PREV + ' sebagai pembanding).', 2, true) +
      narasiAll();
  }


  /* ---------- lembar kerja: nilai dan rumus tiap sel (data dari file Excel) ---------- */
  const XL_SHEETS = ['Rincian LRA', 'Rincian LO', 'Data Grafik', 'Rumus & Perhitungan'];
  const colL = (n) => { let t = ''; while (n > 0) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
  const colN = (t) => t.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const xlFmt = (v, k) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string') return v;
    switch (k) {
      case 'r': return v === 0 ? '-' : v < 0 ? '(' + F2.format(-v) + ')' : F2.format(v);
      case 'p': return v === 0 ? '-' : v < 0 ? '(' + F2.format(-v * 100) + '%)' : F2.format(v * 100) + '%';
      case 'm': return F2.format(v);
      case 'q': return F2.format(v * 100) + '%';
      case 's': return (v >= 0 ? '+' : '−') + F2.format(Math.abs(v * 100)) + '%';
      case 'o': return F1.format(v * 100) + '%';
      default: return Number.isInteger(v) ? String(v) : F2.format(v);
    }
  };
  function xlRefs(f) {
    const t = f.replace(/'[^']+'!\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?/g, '');
    const re = /\$?([A-Z]{1,2})\$?(\d+)(?::\$?([A-Z]{1,2})\$?(\d+))?/g, out = []; let m;
    while ((m = re.exec(t))) out.push(m[3] ? [colN(m[1]), +m[2], colN(m[3]), +m[4]] : [colN(m[1]), +m[2], colN(m[1]), +m[2]]);
    return out;
  }
  function xlExplain(f) {
    const other = /'([^']+)'!/.exec(f);
    if (/ABS\(/.test(f)) return 'Pemeriksaan otomatis: hasilnya OK jika selisihnya kurang dari 1.';
    if (other) return 'Mengambil angka dari sheet ' + other[1] + (/\/10\^9/.test(f) ? ' lalu mengubahnya ke Rp miliar (÷ 1.000.000.000).' : '.');
    if (/^=SUM\(/.test(f)) return 'Penjumlahan sel yang disorot kuning.';
    if (/^=IF\([^=]+=0,0,.+-1\)$/.test(f)) return 'Perubahan = tahun ini ÷ tahun lalu − 1 (hasil 0 jika pembagi nol).';
    if (/^=IF\([^=]+=0,0,.+\/.+\)$/.test(f)) return 'Pembagian sel yang disorot kuning (hasil 0 jika pembagi nol).';
    if (/^=[A-Z]+\d+-[A-Z]+\d+$/.test(f)) return 'Selisih: sel pertama dikurangi sel kedua.';
    if (/^=[A-Z]+\d+$/.test(f)) return 'Sama dengan sel yang disorot kuning.';
    return '';
  }
  function xlSheet() { return window.SHEETS[state.year][state.sheet]; }
  function xlLabels(sh, r, c) {
    const row = sh.rows[r - 1] || []; let rl = '', cl = '';
    for (let i = 0; i < 2; i++) { const x = row[i]; if (x && typeof x[0] === 'string' && !/^\d/.test(x[0]) && !(x[3] || '').split(' ').includes('code')) { rl = x[0]; break; } }
    for (let i = r - 1; i >= 1; i--) { const x = (sh.rows[i - 1] || [])[c - 1]; if (x && typeof x[0] === 'string' && (x[3] || '').split(' ').includes('h')) { cl = x[0]; break; } }
    return [rl, cl];
  }
  function xlSelect(addr) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr); if (!m) return;
    const c = colN(m[1]), r = +m[2], sh = xlSheet(), x = (sh.rows[r - 1] || [])[c - 1];
    document.querySelectorAll('.xl td.sel,.xl td.pre').forEach((e) => e.classList.remove('sel', 'pre'));
    const td = document.querySelector('.xl td[data-a="' + addr + '"]'); if (td) td.classList.add('sel');
    const st = x ? (x[3] || '').split(' ') : [];
    let fv = '', note = '', val = '';
    if (x && x[1]) {
      fv = '<code>' + esc(x[1]) + '</code>';
      note = xlExplain(x[1]); val = xlFmt(x[0], x[2]);
      xlRefs(x[1]).forEach((q) => { for (let rr = q[1]; rr <= q[3]; rr++) for (let cc = q[0]; cc <= q[2]; cc++) { const t = document.querySelector('.xl td[data-a="' + colL(cc) + rr + '"]'); if (t && t !== td) t.classList.add('pre'); } });
    } else if (x && typeof x[0] === 'number') {
      fv = '<b>' + esc(xlFmt(x[0], x[2])) + '</b>'; note = st.includes('in') ? 'Angka input: disalin dari dokumen LKPD (teks biru). Bukan hasil rumus.' : '';
    } else if (x) { fv = esc(x[0]); note = st.includes('code') ? 'Teks yang menampilkan rumus untuk dibaca (bukan sel rumus).' : ''; }
    const lb = xlLabels(sh, r, c), lab = [lb[0], lb[1]].filter(Boolean).join(' · ');
    document.getElementById('xlName').textContent = addr;
    document.getElementById('xlFv').innerHTML = fv || '<span class="mut">(sel kosong)</span>';
    document.getElementById('xlDesc').innerHTML = (val ? '<div class="hasil">Hasil: <b>' + esc(val) + '</b></div>' : '') + (lab ? '<b>' + esc(lab) + '</b>' : '') + (lab && note ? ' — ' : '') + esc(note);
  }
  function xlInit() {
    const sh = xlSheet(); let first = null;
    for (let r = 0; r < sh.rows.length && !first; r++) for (let c = 0; c < sh.rows[r].length; c++) { const x = sh.rows[r][c]; if (x && x[1]) { first = colL(c + 1) + (r + 1); break; } }
    xlSelect(first || 'A1');
  }
  function xlTable(sh) {
    const skip = {}, span = {};
    sh.merges.forEach((q) => { span[q[0] + ',' + q[1]] = [q[2] - q[0] + 1, q[3] - q[1] + 1]; for (let r = q[0]; r <= q[2]; r++) for (let c = q[1]; c <= q[3]; c++) if (r !== q[0] || c !== q[1]) skip[r + ',' + c] = 1; });
    const px = sh.w.map((w) => Math.round(w * 7.2 + 10)), total = 44 + px.reduce((a, b) => a + b, 0);
    let h = '<table class="xl" style="width:' + total + 'px"><colgroup><col style="width:44px">' + px.map((w) => '<col style="width:' + w + 'px">').join('') + '</colgroup><thead><tr><th class="corner"></th>' + sh.w.map((_, i) => '<th>' + colL(i + 1) + '</th>').join('') + '</tr></thead><tbody>';
    sh.rows.forEach((row, ri) => {
      const r = ri + 1; h += '<tr><th class="rn">' + r + '</th>';
      for (let c = 1; c <= sh.w.length; c++) {
        if (skip[r + ',' + c]) continue;
        const x = row[c - 1], sp = span[r + ',' + c], cls = [];
        if (x) { (x[3] || '').split(' ').forEach((t) => t && cls.push(t)); if (x[1]) cls.push('fc'); if (typeof x[0] === 'number') cls.push('num'); }
        h += '<td data-a="' + colL(c) + r + '"' + (sp ? ' rowspan="' + sp[0] + '" colspan="' + sp[1] + '"' : '') + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + (x ? esc(xlFmt(x[0], x[2])) : '') + '</td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }
  function vLembar() {
    const y = state.year, sh = xlSheet();
    const tabs = '<div class="seg tabs" role="group" aria-label="Pilih sheet">' + XL_SHEETS.map((n) => '<button data-sheet="' + n + '" aria-pressed="' + (n === state.sheet) + '">' + n + '</button>').join('') + '</div>';
    return '<section class="hero reveal"><div class="eyebrow">Lembar kerja · TA ' + y + '</div><h1>Lembar Kerja: Nilai dan Rumus</h1><p class="insight">Ketuk sel mana pun untuk melihat nilai dan rumusnya, seperti di Excel. Sel yang dipakai rumus ikut disorot kuning. Isinya sama persis dengan file Excel TA ' + y + ': semua persentase dan hasil hitung berupa rumus.</p></section>' +
      '<section class="card reveal" style="--i:1"><div class="card-head"><div><h2>Lembar kerja ' + state.sheet + '</h2><p class="sub">Ketuk sel untuk melihat nilai dan rumusnya · teks biru = angka input dari LKPD · teks hitam = hasil rumus</p></div>' +
      '<a class="btn-dl" href="' + fileOf(y) + '" download>' + ICON.dl + '<span class="lbl">Unduh Excel ' + y + '</span></a></div>' + tabs +
      '<div class="xl-bar"><div class="fbar"><span class="nb" id="xlName">–</span><span class="fxl">fx</span><span class="fv" id="xlFv"></span></div><div class="fdesc" id="xlDesc"></div></div>' +
      '<div class="xl-wrap" id="xlWrap">' + xlTable(sh) + '</div>' +
      '<div class="key xl-key"><span><i class="k-in"></i>Angka input dari LKPD</span><span><i class="k-fx"></i>Hasil rumus</span><span><i class="k-sel"></i>Sel dipilih</span><span><i class="k-pre"></i>Sel yang dipakai rumus</span></div></section>';
  }

  function vUnduh() {
    const cards = YRS.map((y, i) => {
      const R = sumB('realisasi', y), A = sumB('anggaran', y), bb = sumL(y);
      return '<section class="card dl-card reveal" style="--i:' + (i + 1) + '"><div class="yr">' + y + '</div>' +
        '<div class="chips"><span class="chip">Belanja <b>' + rpShort(R) + '</b></span><span class="chip">Capaian <b>' + pct(R / A) + '</b></span><span class="chip">Beban <b>' + rpShort(bb) + '</b></span></div>' +
        '<ul><li>Dashboard: 6 angka utama dan 4 grafik</li><li>Rincian LRA: anggaran, realisasi, capaian, sisa anggaran, porsi, perubahan</li><li>Rincian LO: beban tahun ini, tahun lalu, dan porsi</li><li>Rumus &amp; Perhitungan: daftar rumus dan pemeriksaan otomatis</li><li>Data Grafik dan Catatan &amp; Sumber</li></ul>' +
        '<a class="btn-dl" href="' + fileOf(y) + '" download>' + ICON.dl + '<span>Unduh Excel TA ' + y + '</span></a></section>';
    }).join('');
    return '<section class="hero reveal"><div class="eyebrow">Laporan Excel</div><h1>Unduh Laporan per Tahun</h1><p class="insight">Setiap tahun punya satu file Excel (.xlsx). Semua subtotal, capaian, sisa anggaran, porsi, dan perubahan berupa rumus Excel yang bisa dicek, dan grafiknya sudah ada di dalam file. Angka biru adalah salinan dari dokumen sumber; angka hitam adalah hasil rumus. Ingin melihat rumusnya tanpa membuka Excel? Buka <a href="#lembar"><b>Lembar Kerja</b></a>.</p></section><div class="grid g-3">' + cards + '</div>';
  }

  function vTentang() {
    return '<section class="hero reveal"><img class="about-logo" src="assets/logo-256.png" alt="Lambang Kabupaten Gunungkidul"><div class="eyebrow">Transparansi data</div><h1>Tentang Data</h1><p class="insight">Halaman ini menjelaskan dari mana angka berasal, bagaimana dihitung, dan apa yang perlu diperhatikan sebelum mengutipnya.</p></section>' +
      '<div class="grid g-11"><section class="card prose reveal" style="--i:1"><h3>Sumber</h3><p>Laporan Keuangan Pemerintah Daerah (LKPD) Pemerintah Kabupaten Gunungkidul: <b>Laporan Realisasi Anggaran (LRA)</b> dan <b>Laporan Operasional (LO)</b> untuk tahun anggaran 2023, 2024, dan 2025. Kolom pembanding 2022 diambil dari LKPD 2023.</p><h3>Cakupan</h3><p>Hanya <b>Belanja</b> (' + B.length + ' jenis) dan <b>Beban</b> (' + L.length + ' jenis). Pendapatan dan pembiayaan tidak dimasukkan.</p><h3>Cara hitung</h3><ul><li><b>Capaian</b> = realisasi ÷ anggaran.</li><li><b>Perubahan</b> = (tahun ini − tahun lalu) ÷ tahun lalu.</li><li>Subtotal dan total dijumlahkan dari rincian.</li><li>LO tidak memuat anggaran, sehingga tidak ada capaian untuk beban.</li></ul><h3>Validasi</h3><p>Setiap subtotal dan total pada dokumen sumber dicocokkan dengan jumlah rinciannya, untuk semua tahun. Seluruhnya sama sampai sen.</p></section>' +
      '<section class="card prose reveal" style="--i:2"><h3>Perlu diperhatikan</h3><p class="callout">Pada dokumen sumber, LO 2023 dan LO 2024 berlabel <b>Audited</b>, sedangkan kolom tahun 2025 tidak berlabel Audited. Periksa status audit sebelum mengutip angka 2025.</p><p class="callout">Kode rekening mengikuti penyajian LKPD 2024–2025. Pada LKPD 2023, kode ditulis dengan huruf (misalnya 5.1.2.1.a) dan di sini dipetakan ke kode angka yang setara.</p><p class="callout">Belanja dan beban tidak sama. LRA mencatat belanja daerah, sedangkan LO memakai dasar akrual dan memuat beban penyusutan serta penyisihan piutang.</p><h3>Istilah</h3><dl class="gloss"><dt>Belanja Operasi</dt><dd>Pegawai, barang dan jasa, subsidi, hibah, bantuan sosial.</dd><dt>Belanja Modal</dt><dd>Pembelian atau pembangunan aset: tanah, mesin, gedung, jalan, dan lainnya.</dd><dt>Belanja Tidak Terduga</dt><dd>Belanja untuk keadaan darurat yang tidak dapat diprediksi.</dd><dt>Belanja Transfer</dt><dd>Bagi hasil dan bantuan keuangan, antara lain ke pemerintah desa.</dd><dt>Beban Penyusutan</dt><dd>Pengurangan nilai aset tetap secara bertahap; tidak ada uang keluar pada tahun itu.</dd></dl></section></div>';
  }

  /* ---------- render & interaksi ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.count), f = nf(+el.dataset.dec || 0);
    if (reduce || isNaN(to)) { el.textContent = f.format(to); return; }
    const t0 = performance.now(), dur = 1500;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = f.format(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function observe(root) {
    const regMap = {}; regs.forEach((r) => { regMap[r.id] = r.factory; });
    const run = (el) => {
      if (el.classList.contains('reveal')) el.classList.add('in');
      if (el.dataset && el.dataset.count != null) countUp(el);
      if (el.tagName === 'CANVAS' && regMap[el.id]) { try { charts.push(regMap[el.id](el)); } catch (e) { console.error(e); } }
    };
    const els = Array.prototype.slice.call(root.querySelectorAll('.reveal, [data-count], canvas'));
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    els.forEach((el) => io.observe(el));
  }
  function destroy() {
    charts.forEach((c) => c.destroy()); charts = []; regs = []; if (io) { io.disconnect(); io = null; }
    Object.keys(tableFns).forEach((k) => delete tableFns[k]);
  }
  function chrome() {
    const nav = document.querySelectorAll('#nav a');
    nav.forEach((a) => a.classList.toggle('active', a.dataset.view === state.view));
    const t = TITLES[state.view];
    document.getElementById('crumb').innerHTML = t[0] + '<small>' + t[1] + '</small>';
    document.title = t[0] + ' — Belanja dan Beban Daerah Kabupaten Gunungkidul';
    const showYear = state.view === 'ringkasan' || state.view === 'belanja' || state.view === 'beban' || state.view === 'semua' || state.view === 'lembar';
    const isAll = state.view === 'semua';
    const ye = document.getElementById('years');
    ye.classList.toggle('hidden', !showYear);
    ye.innerHTML = YRS.map((y) => '<button role="tab" data-y="' + y + '" aria-selected="' + (!isAll && y === state.year) + '">' + y + '</button>').join('') + (state.view === 'lembar' ? '' : '<button role="tab" data-y="all" aria-selected="' + isAll + '">Semua</button>');
    const dl = document.getElementById('dlTop');
    dl.href = fileOf(state.year); dl.classList.toggle('hidden', !showYear || isAll);
    document.getElementById('dlTopLbl').textContent = 'Unduh Excel ' + state.year;
  }
  function render(scroll) {
    destroy();
    themeChart();
    const fn = { ringkasan: vRingkasan, belanja: vBelanja, beban: vBeban, semua: vSemua, lembar: vLembar, unduh: vUnduh, tentang: vTentang }[state.view];
    const view = document.getElementById('view');
    view.innerHTML = fn();
    view.classList.remove('swap'); void view.offsetWidth; view.classList.add('swap');
    chrome();
    observe(view);
    if (state.view === 'lembar') xlInit();
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function setYear(y) {
    if (state.view === 'semua') { state.year = y; store.set('gk.year', y); location.hash = 'ringkasan'; return; }
    if (y === state.year) return; state.year = y; store.set('gk.year', y); render(false); }
  function route() {
    const h = (location.hash || '#ringkasan').slice(1);
    state.view = VIEWS.indexOf(h) >= 0 ? h : 'ringkasan';
    document.getElementById('app').classList.remove('open');
    render(true);
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'dark' ? '#0b111b' : '#2f3d5c');
  }

  document.getElementById('years').addEventListener('click', (e) => { const b = e.target.closest('button[data-y]'); if (!b) return; if (b.dataset.y === 'all') location.hash = 'semua'; else setYear(+b.dataset.y); });
  document.getElementById('view').addEventListener('click', (e) => {
    const cell = e.target.closest('.xl td[data-a]'); if (cell) { xlSelect(cell.dataset.a); return; }
    const tab = e.target.closest('button[data-sheet]'); if (tab) { state.sheet = tab.dataset.sheet; render(false); return; }
    const b = e.target.closest('button[data-unit]');
    if (b) { state.unit = b.dataset.unit; store.set('gk.unit', state.unit); refreshTables(); }
  });
  document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('app').classList.toggle('open'));
  document.getElementById('scrim').addEventListener('click', () => document.getElementById('app').classList.remove('open'));
  document.getElementById('themeBtn').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; store.set('gk.theme', state.theme); applyTheme(); render(false); });
  window.addEventListener('hashchange', route);
  applyTheme();
  route();
})();
