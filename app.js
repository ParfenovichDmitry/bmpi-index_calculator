const CALIB = {
  mu_wzm: 173.3,
  sd_wzm: 256.4,
  mu_tone: -0.7214,
  sd_tone: 1.1607
};

const W1 = 0.60;
const W2 = 0.40;

const QUERIES = {
  balanced: 'bitcoin cryptocurrency',
  sensitive: 'bitcoin OR cryptocurrency OR crypto OR blockchain',
  strong: 'bitcoin'
};

const ZONES = [
  [0.000, 0.470, 'CALM', 'zone-calm', 'Organic movement. Low manipulation risk.'],
  [0.470, 0.530, 'NORMAL', 'zone-normal', 'Standard media activity. Monitor.'],
  [0.530, 0.590, 'ELEVATED', 'zone-elevated', 'Increased narrative. Caution advised.'],
  [0.590, 0.650, 'ALERT', 'zone-alert', 'High manipulation. Reversal risk ~55%.'],
  [0.650, 1.001, 'MANIPULATION', 'zone-manip', 'Extreme noise (top 5% historical). Half-life ~2 days.']
];

let currentPreset = 'balanced';

const els = {
  dateInput: document.getElementById('dateInput'),
  calcBtn: document.getElementById('calcBtn'),
  result: document.getElementById('result'),
  progress: document.getElementById('progress'),
  errorBox: document.getElementById('errorBox'),
  bmpiVal: document.getElementById('bmpiVal'),
  bmpiDate: document.getElementById('bmpiDate'),
  bmpiZone: document.getElementById('bmpiZone'),
  bmpiDesc: document.getElementById('bmpiDesc'),
  gaugeFill: document.getElementById('gaugeFill'),
  gaugePtr: document.getElementById('gaugePtr'),
  statMentions: document.getElementById('statMentions'),
  statTone: document.getElementById('statTone'),
  statZ1: document.getElementById('statZ1'),
  statZ2: document.getElementById('statZ2'),
  statArticles: document.getElementById('statArticles'),
  statPreset: document.getElementById('statPreset'),
  pctFill: document.getElementById('pctFill'),
  pctVal: document.getElementById('pctVal')
};

window.addEventListener('DOMContentLoaded', () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const val = d.toISOString().slice(0, 10);
  els.dateInput.value = val;
  els.dateInput.max = val;
  els.dateInput.min = '2015-01-01';

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPreset = btn.dataset.preset;
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  els.calcBtn.addEventListener('click', calculate);
});

function stepActive(id) {
  const el = document.getElementById(id);
  const label = el.textContent.trim().replace(' ✓', '');
  el.className = 'prog-line active';
  el.innerHTML = `<div class="spinner"></div> ${label}`;
}

function stepDone(id, msg) {
  const el = document.getElementById(id);
  el.className = 'prog-line done';
  el.innerHTML = `<div class="dot"></div> ${msg} ✓`;
}

function resetProgress() {
  ['p1', 'p2', 'p3', 'p4'].forEach((id) => {
    const el = document.getElementById(id);
    const label = el.textContent.trim().replace(' ✓', '');
    el.className = 'prog-line';
    el.innerHTML = `<div class="dot"></div> ${label}`;
  });
}

async function calculate() {
  const dateVal = els.dateInput.value;
  if (!dateVal) {
    alert('Please select a date.');
    return;
  }

  els.result.classList.remove('show');
  els.errorBox.classList.remove('show');
  els.errorBox.textContent = '';
  els.progress.classList.add('show');
  els.calcBtn.disabled = true;
  resetProgress();

  try {
    stepActive('p1');

    const d = dateVal.replace(/-/g, '');
    const start = `${d}000000`;
    const end = `${d}235959`;
    const query = encodeURIComponent(QUERIES[currentPreset]);

    const urlArt = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}+sourcelang:english&mode=artlist&maxrecords=250&startdatetime=${start}&enddatetime=${end}&format=json`;
    const urlTL = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}+sourcelang:english&mode=timelinetone&startdatetime=${start}&enddatetime=${end}&format=json`;

    stepDone('p1', `Query built for ${dateVal}`);
    stepActive('p2');

    const [dArt, dTL] = await Promise.all([gFetch(urlArt), gFetch(urlTL)]);
    const articles = dArt?.articles || [];
    const mentions = articles.length;

    stepDone('p2', `${mentions} articles retrieved`);

    if (mentions === 0) {
      throw new Error(`No articles found for ${dateVal} with ${currentPreset} preset. Try SENSITIVE preset.`);
    }

    stepActive('p3');

    let avgTone = 0;
    if (Array.isArray(dTL?.timeline) && dTL.timeline.length > 0) {
      const values = dTL.timeline
        .flatMap((series) => series.data || [])
        .map((point) => parseFloat(point.value ?? point.Value))
        .filter((v) => Number.isFinite(v));

      if (values.length > 0) {
        avgTone = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    }

    stepDone('p3', `mentions=${mentions}, avg_tone=${avgTone.toFixed(4)}`);
    stepActive('p4');

    const bmpi = computeBmpi(mentions, avgTone);
    stepDone('p4', `BMPI = ${bmpi.score.toFixed(4)}`);

    showResult(dateVal, mentions, avgTone, articles.length, bmpi);
  } catch (error) {
    els.errorBox.textContent = `⚠ ${error.message}`;
    els.errorBox.classList.add('show');
  } finally {
    els.calcBtn.disabled = false;
  }
}

async function gFetch(url) {
  const tries = [
    url,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  for (const u of tries) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(12000) });
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }
    } catch (_) {}
  }

  throw new Error('Could not reach GDELT API or CORS proxy.');
}

function computeBmpi(mentions, tone) {
  const z1 = clamp((mentions - CALIB.mu_wzm) / CALIB.sd_wzm, -3, 3);
  const z2 = clamp((CALIB.mu_tone - tone) / CALIB.sd_tone, -3, 3);
  const raw = (W1 * z1) + (W2 * z2);
  const score = 1 / (1 + Math.exp(-raw));

  let zone = ZONES[ZONES.length - 1];
  for (const item of ZONES) {
    if (score >= item[0] && score < item[1]) {
      zone = item;
      break;
    }
  }

  const pct = clamp(Math.round(score * 100), 1, 99);
  return { score, z1, z2, raw, zone, pct };
}

function showResult(dateStr, mentions, tone, nArticles, bmpi) {
  const { score, z1, z2, zone, pct } = bmpi;

  els.bmpiVal.textContent = score.toFixed(4);
  els.bmpiVal.className = `bmpi-value ${zone[3]}`;
  els.bmpiDate.textContent = `${dateStr} · GDELT Doc API v2`;
  els.bmpiZone.textContent = zone[2];
  els.bmpiZone.className = `bmpi-zone ${zone[3]}`;
  els.bmpiDesc.textContent = zone[4];

  const scorePct = score * 100;
  els.gaugeFill.style.width = `${scorePct}%`;
  els.gaugePtr.style.left = `${scorePct}%`;

  els.statMentions.textContent = mentions.toLocaleString();
  els.statTone.textContent = tone.toFixed(4);
  els.statZ1.textContent = z1.toFixed(4);
  els.statZ2.textContent = z2.toFixed(4);
  els.statArticles.textContent = nArticles.toLocaleString();
  els.statPreset.textContent = currentPreset.toUpperCase();

  els.pctFill.style.width = `${pct}%`;
  els.pctVal.textContent = `${pct}%`;

  els.result.classList.add('show');
  els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
