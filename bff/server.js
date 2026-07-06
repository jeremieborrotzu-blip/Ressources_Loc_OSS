/* LEO v1 — BFF
 * Sert l'UI (../ui) + proxifie n8n. Aucun secret ici (forms n8n locaux + repo GitHub public).
 * Node 18+ (fetch & FormData globaux).
 */
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '50mb' }));

// ---- config ----
const REPO = 'jeremieborrotzu-blip/Ressources_Loc_OSS';
const RAW  = `https://raw.githubusercontent.com/${REPO}/main/`;
const N8N  = process.env.N8N_URL || 'http://localhost:5678';
const FORM_P1  = `${N8N}/form/f146189f-507c-44da-beb7-6c888a156a3f`; // [MAIN] CLS v3 — Course Localisation
const FORM_P2  = `${N8N}/form/leo-assets`;                            // [MAIN] LEO v1 — Assets
const FORM_EXT = `${N8N}/webhook/oc-upload`;                          // OC Asset Extractor (upload)
const WH_PROJECT = `${N8N}/webhook/leo-project`;                      // Project Localizer (GDoc/DOCX → DOCX)

// ---- static UI + downloads ----
const fsx = require('fs');
const DL_DIR = path.join(__dirname, 'downloads');
fsx.mkdirSync(DL_DIR, { recursive: true });
const REVIEW_DIR = path.join(__dirname, 'review_state');
fsx.mkdirSync(REVIEW_DIR, { recursive: true });
app.use(express.static(path.join(__dirname, '..', 'ui')));
app.use('/downloads', express.static(DL_DIR));

// ---- cache de l'arbre GitHub (60s) pour éviter le rate-limit ----
let _tree = { t: 0, items: null };
async function getTree() {
  if (Date.now() - _tree.t < 60000 && _tree.items) return _tree.items;
  const tree = await fetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`,
    { headers: { 'User-Agent': 'leo-bff', Accept: 'application/vnd.github+json' } }).then(r => r.json());
  _tree = { t: Date.now(), items: tree.tree || [] };
  return _tree.items;
}

// ---- statut d'un cours (Gold Master Phase 1 présent ? + inventaire) ----
async function contentStatus(target) {
  const items = await getTree();
  const re = new RegExp(`07_runs/(\\d+)/output/${target}_localized_(.+)\\.html$`);
  let found = null;
  for (const it of items) { const m = (it.path || '').match(re); if (m) { found = { source: m[1], dir: m[2] }; break; } }
  if (!found) return { done: false, target };
  const hpath = `07_runs/${found.source}/output/${target}_phase1_handoff.json`;
  let inv = { images: 0, annexes: 0, links: 0, videos: 0 }, src = '', tgt = '';
  if (items.some(it => it.path === hpath)) {
    try {
      const h = await fetch(RAW + encodeURI(hpath), { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.json());
      const media = h.media_inventory || []; const banner = u => /banner/i.test(u || '');
      inv.images  = media.filter(m => m.type === 'image' && !banner(m.url)).length;
      inv.annexes = media.filter(m => ['pdf','docx','xlsx','pptx','csv'].includes(m.type) || /\.(pdf|docx?|xlsx?|pptx?|csv)$/i.test(m.url || '')).length;
      inv.links   = media.filter(m => m.type === 'link').length;
      inv.videos  = media.filter(m => ['video','screencast'].includes(m.type)).length;
      if (h.meta) { src = h.meta.source_language || ''; tgt = h.meta.target_language || ''; }
    } catch (e) {}
  }
  return { done: true, target, source: found.source, direction: found.dir, src, tgt, inventory: inv };
}
app.get('/api/content/:id/status', async (req, res) => {
  try { res.json(await contentStatus(String(req.params.id || '').trim())); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- chaînage Phase 1 → Phase 2 : surveille GitHub puis lance la Phase 2 ----
const pendingChains = []; // { target, email, phase2, ts }
function submitPhase2(target, email, phase2) {
  const f = { 'field-0': target, 'field-1': email || '' };
  if (phase2.a7) f['field-2'] = '[""]'; if (phase2.a8) f['field-3'] = '[""]';
  if (phase2.a9) f['field-4'] = '[""]'; if (phase2.a10) f['field-5'] = '[""]';
  return submitForm(FORM_P2, f);
}
setInterval(async () => {
  for (let i = pendingChains.length - 1; i >= 0; i--) {
    const c = pendingChains[i];
    if (Date.now() - c.ts > 6 * 3600 * 1000) { pendingChains.splice(i, 1); continue; } // timeout 6h
    try {
      const st = await contentStatus(c.target);
      if (st.done) {
        await submitPhase2(c.target, c.email, c.phase2);
        pendingChains.splice(i, 1);
        console.log(`[chain] Phase 1 livrée → Phase 2 lancée pour ${c.target}`);
      }
    } catch (e) {}
  }
}, 30000);

// ---- helper : soumettre un form n8n (multipart) ----
async function submitForm(url, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const r = await fetch(url, { method: 'POST', body: fd });
  return { http: r.status, ok: r.status >= 200 && r.status < 400 };
}

// ---- POST lancer ----
app.post('/api/launch', async (req, res) => {
  const p = req.body || {};
  const id = p.identity || {};

  // ===== PROJET : GDoc/DOCX → DOCX miroir (webhook leo-project) =====
  if (p.content_type === 'PROJET') {
    try {
      const r = await fetch(WH_PROJECT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gdoc_url: id.gdoc_url || null, docx_url: id.docx_url || null, docx_base64: id.docx_base64 || null,
          source_language: p.source_language, target_language: p.target_language,
          parcours_id: id.parcours_id, project_no: id.project_no,
          filename: `projet_${id.parcours_id || ''}_${id.project_no || ''}`
        })
      });
      const d = await r.json();
      if (d.ok && d.docx_base64) {
        const safe = (d.filename || 'projet_localized.docx').replace(/[^\w.\-]+/g, '_');
        fsx.writeFileSync(path.join(DL_DIR, safe), Buffer.from(d.docx_base64, 'base64'));
        return res.json({ ok: true, launched: [{ step: 'Projet → DOCX', status: d.status, filename: d.filename,
          segments: `${d.segments_localized}/${d.segments_total}`, download: `/downloads/${safe}` }] });
      }
      return res.status(d.status === 'MANUAL_REVIEW' ? 422 : 500).json({ error: d.error || 'Échec localisation projet', detail: d });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  const out = [];
  try {
    if (p.phase1) {
      const f = {
        'field-0': id.source_course_id || '',
        'field-1': id.target_course_id || '',
        'field-2': p.source_language || '',
        'field-3': p.target_language || '',
        'field-4': p.email || ''
      };
      if (p.phase1.localize)            f['field-5'] = '[""]';
      if (p.phase1.audit_a1)            f['field-6'] = '[""]';
      if (p.phase1.localizability_score) f['field-7'] = '[""]';
      if (p.phase1.quality_check)       f['field-8'] = '[""]';
      if (req.query.testChainNoP1) out.push({ step: 'Phase 1', skipped: true, note: 'test : Phase 1 non soumise' });
      else out.push({ step: 'Phase 1', form: 'f146189f', ...(await submitForm(FORM_P1, f)) });
    }
    if (p.phase2) {
      if (p.chained) {
        pendingChains.push({ target: id.target_course_id, email: p.email, phase2: p.phase2, ts: Date.now() });
        out.push({ step: 'Phase 2', chained: true, note: "enchaînée — lancée dès la livraison de la Phase 1 (le BFF surveille GitHub toutes les 30 s)" });
      } else {
        const f = { 'field-0': id.target_course_id || '', 'field-1': p.email || '' };
        if (p.phase2.a7) f['field-2'] = '[""]';
        if (p.phase2.a8) f['field-3'] = '[""]';
        if (p.phase2.a9) f['field-4'] = '[""]';
        if (p.phase2.a10) f['field-5'] = '[""]';
        out.push({ step: 'Phase 2', form: 'leo-assets', ...(await submitForm(FORM_P2, f)) });
      }
    }
    res.json({ ok: true, launched: out });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- GET runs (Suivi) : exécutions n8n via docker cp + sqlite3 -json (cache 8s) ----
const { execSync } = require('child_process');
const fs = require('fs');
const RUNS_DIR = '/tmp/leo_runs';
let _runs = { t: 0, data: null };
function loadRuns() {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  for (const f of ['database.sqlite', 'database.sqlite-wal', 'database.sqlite-shm']) {
    try { execSync(`docker cp n8n:/home/node/.n8n/.n8n/${f} ${RUNS_DIR}/${f}`, { stdio: 'ignore' }); } catch (e) {}
  }
  try { execSync(`sqlite3 ${RUNS_DIR}/database.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"`, { stdio: 'ignore' }); } catch (e) {}
  const q = "SELECT e.id, e.workflowId, e.status, e.startedAt, e.stoppedAt, w.name FROM execution_entity e LEFT JOIN workflow_entity w ON w.id=e.workflowId ORDER BY e.startedAt DESC LIMIT 30;";
  const out = execSync(`sqlite3 -json "${RUNS_DIR}/database.sqlite" "${q}"`, { encoding: 'utf-8' });
  return JSON.parse(out || '[]').map(r => ({
    id: r.id, workflow: r.name || r.workflowId, status: r.status,
    started: r.startedAt, stopped: r.stoppedAt,
    durationMs: (r.startedAt && r.stoppedAt) ? (new Date(r.stoppedAt) - new Date(r.startedAt)) : null
  }));
}
app.get('/api/runs', (req, res) => {
  try {
    if (Date.now() - _runs.t > 8000) _runs = { t: Date.now(), data: loadRuns() };
    res.json({ runs: _runs.data, chains: pendingChains.map(c => ({ target: c.target, agents: Object.keys(c.phase2).filter(k => c.phase2[k]).map(k => k.toUpperCase()), since: c.ts })) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- POST Assets à la demande : localise n'importe quel fichier (webhook leo-adhoc) ----
const WH_ADHOC = `${N8N}/webhook/leo-adhoc`;
// ---- Contexte cours pour A8 : titre de section + texte autour de l'image (le HTML aide à identifier le logiciel/UI) ----
const _courseHtml = {};
async function getCourseHtml(target) {
  const k = String(target);
  if (_courseHtml[k] && Date.now() - _courseHtml[k].t < 60000) return _courseHtml[k].html;
  try {
    const st = await contentStatus(target);
    if (!st || !st.source || !st.direction) return '';
    const url = RAW + encodeURI(`07_runs/${st.source}/output/${target}_localized_${st.direction}.html`);
    const html = await fetch(url, { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.text() : '');
    _courseHtml[k] = { t: Date.now(), html };
    return html;
  } catch (e) { return ''; }
}
function imageContext(html, url) {
  if (!html || !url) return '';
  let i = html.indexOf(url);
  if (i < 0) { const b = String(url).split('/').pop(); i = b ? html.indexOf(b) : -1; }
  if (i < 0) return '';
  const before = html.slice(Math.max(0, i - 5000), i);
  const hm = [...before.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)];
  const heading = hm.length ? hm[hm.length - 1][1].replace(/<[^>]+>/g, '').trim() : '';
  const around = html.slice(Math.max(0, i - 700), i + 700).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return (heading ? ('Section: ' + heading + '. ') : '') + around.slice(0, 650);
}
app.post('/api/assets/localize', async (req, res) => {
  const p = req.body || {};
  try {
    let items = p.items || [];
    if (p.target_course_id && items.length) {
      const html = await getCourseHtml(p.target_course_id);
      if (html) items = items.map(it => it.context ? it : ({ ...it, context: imageContext(html, it.url || '') }));
    }
    const r = await fetch(WH_ADHOC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, source_language: p.source_language, target_language: p.target_language, prompt: p.prompt || null, glossary: p.glossary || null })
    });
    const d = await r.json();
    if (!d.ok) return res.status(500).json({ error: 'Échec localisation assets', detail: d });
    const out = (d.results || []).map(x => {
      let download = null;
      if (x.base64) {
        const base = String(x.filename || x.name || 'asset').split('/').pop().replace(/[^\w.\-]+/g, '_');
        fsx.writeFileSync(path.join(DL_DIR, base), Buffer.from(x.base64, 'base64'));
        download = '/downloads/' + base;
      }
      return { name: String(x.name || '').split('/').pop(), agent: x.agent, status: x.status, segments: x.segments || null, note: x.note || null, error: x.error || null, download };
    });
    res.json({ ok: true, results: out });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- Revue : lit les rapports d'un cours (A10 links CSV) depuis GitHub ----
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const parse = l => { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else { if (ch === '"') q = true; else if (ch === ',') { o.push(cur); cur = ''; } else cur += ch; } } o.push(cur); return o; };
  const head = parse(lines[0]);
  return lines.slice(1).map(l => { const c = parse(l); const o = {}; head.forEach((h, i) => o[h] = c[i]); return o; });
}
// arbitrages A10 + copie de travail HTML (persistés sur disque, reprenables)
const decisionsFile = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_decisions.json');
const readDecisions = id => { try { return JSON.parse(fsx.readFileSync(decisionsFile(id), 'utf-8')); } catch (e) { return []; } };
const writeDecisions = (id, arr) => fsx.writeFileSync(decisionsFile(id), JSON.stringify(arr, null, 2));
const htmlWork = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_fixed.html');
const htmlOrig = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_original.html');
async function ensureWorkingHtml(target) {
  if (fsx.existsSync(htmlWork(target))) return;
  const st = await contentStatus(target);
  if (!st || !st.source || !st.direction) throw new Error('cours/HTML introuvable');
  const url = RAW + encodeURI(`07_runs/${st.source}/output/${target}_localized_${st.direction}.html`);
  const html = await fetch(url, { headers: { 'User-Agent': 'leo-bff' } }).then(r => { if (!r.ok) throw new Error('HTML HTTP ' + r.status); return r.text(); });
  fsx.writeFileSync(htmlOrig(target), html); // backup original (sécurité)
  fsx.writeFileSync(htmlWork(target), html); // copie de travail éditable
}
app.get('/api/review/:id', async (req, res) => {
  const target = String(req.params.id || '').trim();
  try {
    const st = await contentStatus(target);
    if (!st.done) return res.json({ done: false, target });
    const base = `07_runs/${st.source}/output/`;
    let a5 = [], a8 = [];
    try {
      const h = await fetch(RAW + encodeURI(base + target + '_phase1_handoff.json'), { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.json());
      const scores = (h.qa && h.qa.a5_scores) || {};
      a5 = Object.entries(scores).map(([chapter, score]) => ({ chapter, score }));
      const banner = u => /banner/i.test(u || '');
      a8 = (h.media_inventory || []).filter(m => m.type === 'image' && !banner(m.url)).map(m => ({ location: m.location, risk: m.risk, url: m.url }));
    } catch (e) {}
    let a10 = [];
    try {
      const csv = await fetch(RAW + encodeURI(base + target + '_links_report.csv'), { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.text() : null);
      if (csv) a10 = parseCsv(csv);
    } catch (e) {}
    const qa_report = RAW + base + target + '_qa_report_' + (st.direction || '').replace('>', '%3E') + '.md';
    res.json({ done: true, target, source: st.source, direction: st.direction, a5, a8, a10, qa_report, decisions: readDecisions(target), html_fixed: fsx.existsSync(htmlWork(target)) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
app.post('/api/review/:id/resolve', async (req, res) => {
  const t = String(req.params.id || '').trim();
  const { id, source_url, target_url } = req.body || {};
  if (!id || !target_url) return res.status(400).json({ error: 'id + target_url requis' });
  try {
    let replaced = false;
    if (source_url && source_url !== target_url) {
      await ensureWorkingHtml(t);
      let html = fsx.readFileSync(htmlWork(t), 'utf-8');
      if (html.includes(source_url)) { html = html.split(source_url).join(target_url); fsx.writeFileSync(htmlWork(t), html); replaced = true; }
    }
    const arr = readDecisions(t).filter(d => d.id !== id);
    arr.push({ id, source_url: source_url || null, target_url, replaced, ts: Date.now() });
    writeDecisions(t, arr);
    res.json({ ok: true, replaced, count: arr.length });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Télécharger le HTML corrigé (copie de travail avec liens résolus) ; l'original reste en backup
app.get('/api/review/:id/html', (req, res) => {
  const t = String(req.params.id || '').replace(/\D/g, '');
  if (!fsx.existsSync(htmlWork(t))) return res.status(404).json({ error: 'aucun HTML corrigé — résous au moins un lien' });
  res.download(htmlWork(t), t + '_localized_fixed.html');
});

// ---- Avancement Revue : images cochées "OK" (trace légère par target, reprenable) ----
const checksFile = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '.json');
const readChecks = id => { try { return JSON.parse(fsx.readFileSync(checksFile(id), 'utf-8')).checked || []; } catch (e) { return []; } };
app.get('/api/review/:id/checks', (req, res) => res.json({ checked: readChecks(req.params.id) }));
app.post('/api/review/:id/check', (req, res) => {
  const { url, done } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url requis' });
  const set = new Set(readChecks(req.params.id));
  if (done) set.add(url); else set.delete(url);
  const checked = [...set];
  fsx.writeFileSync(checksFile(req.params.id), JSON.stringify({ checked, updated: new Date().toISOString() }, null, 2));
  res.json({ ok: true, count: checked.length });
});

// ---- Avant/après persistant : map { image_url -> {download} } des images localisées (par target) ----
const localizedFile = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_localized.json');
const readLocalized = id => { try { return JSON.parse(fsx.readFileSync(localizedFile(id), 'utf-8')); } catch (e) { return {}; } };
app.get('/api/review/:id/localized', (req, res) => res.json(readLocalized(req.params.id)));
app.post('/api/review/:id/localized', (req, res) => {
  const { url, download } = req.body || {};
  if (!url || !download) return res.status(400).json({ error: 'url + download requis' });
  const m = readLocalized(req.params.id);
  m[url] = { download, ts: Date.now() };
  fsx.writeFileSync(localizedFile(req.params.id), JSON.stringify(m, null, 2));
  res.json({ ok: true, count: Object.keys(m).length });
});

// ---- statut Iconik par image (persistant : {source_url -> {asset_id, filename, ts}}) ----
const iconikFile = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_iconik.json');
const readIconikState = id => { try { return JSON.parse(fsx.readFileSync(iconikFile(id), 'utf-8')); } catch (e) { return {}; } };
const writeIconikState = (id, m) => fsx.writeFileSync(iconikFile(id), JSON.stringify(m, null, 2));
app.get('/api/review/:id/iconik', (req, res) => res.json(readIconikState(req.params.id)));
app.post('/api/review/:id/iconik', (req, res) => {
  const { url, asset_id, filename, uploaded } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url requis' });
  const m = readIconikState(req.params.id);
  if (uploaded === false) delete m[url];
  else m[url] = { asset_id: asset_id || '', filename: filename || '', ts: Date.now() };
  writeIconikState(req.params.id, m);
  res.json({ ok: true, count: Object.keys(m).length });
});
// vérifie la réalité Iconik (liste la collection static_graphics) et réconcilie le statut
app.post('/api/review/:id/iconik/verify', async (req, res) => {
  const id = String(req.params.id).replace(/\D/g, '');
  try {
    const r = await fetch(WH_ADHOC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'iconik_list', target_course_id: id }) });
    let d = await r.json(); if (Array.isArray(d)) d = d[0];
    if (!d || !d.ok) return res.status(500).json({ error: (d && d.error) || 'iconik_list échec', detail: d });
    const titleMap = {}; (d.assets || []).forEach(a => { if (a.title) titleMap[a.title] = a.id; });
    const loc = readLocalized(id);
    const store = readIconikState(id);
    let matched = 0;
    for (const [url, ent] of Object.entries(loc)) {
      const fn = ent && ent.download ? path.basename(ent.download) : null;
      if (fn && titleMap[fn]) { store[url] = { asset_id: titleMap[fn] || '', filename: fn, ts: Date.now(), verified: true }; matched++; }
    }
    writeIconikState(id, store);
    res.json({ ok: true, collection_id: d.collection_id, iconik_assets: d.count, localized: Object.keys(loc).length, matched, folders: d.folders || [] });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- Importer une Phase 1 existante : HTML localisé → handoff → Git (Phase 2 prête) ----
const REPO_DIR = path.join(__dirname, '..');
function scanHtmlAssets(html, localizeImages) {
  const headPos = [...html.matchAll(/<h[23][\s>]/gi)].map(m => m.index);
  const chOf = pos => { let n = 0; for (const hp of headPos) { if (hp <= pos) n++; else break; } return 'ch' + Math.max(n, 0); };
  const media = []; const seen = new Set(); let m;
  const linkRe = /<a[^>]+href="([^"]+)"/gi;
  while ((m = linkRe.exec(html))) {
    const url = m[1]; if (!/^https?:/i.test(url) || seen.has(url)) continue; seen.add(url);
    const lc = url.toLowerCase().split('?')[0];
    if (/\.(xlsx?|docx?|pptx?|csv|pdf)$/.test(lc)) { const e = lc.split('.').pop(); const t = e.startsWith('xls') ? 'xlsx' : e.startsWith('doc') ? 'docx' : e.startsWith('ppt') ? 'pptx' : e; media.push({ type: t, url, location: chOf(m.index) }); }
    else if (/vimeo\.com|youtube\.com|youtu\.be/.test(lc)) { media.push({ type: 'video', url, location: chOf(m.index) }); }
    else if (!/oc-static\.com/.test(lc)) { media.push({ type: 'link', url, location: chOf(m.index) }); }
  }
  const imgRe = /<img[^>]+src="([^"]+)"/gi;
  while ((m = imgRe.exec(html))) {
    const url = m[1]; if (!/oc-static\.com/i.test(url) || /banner/i.test(url) || seen.has(url)) continue; seen.add(url);
    media.push({ type: 'image', url, location: chOf(m.index), risk: localizeImages ? 'fr_only' : 'ok' });
  }
  return media;
}
app.post('/api/phase1/import', async (req, res) => {
  const p = req.body || {};
  const source = String(p.source_id || '').replace(/\D/g, ''), target = String(p.target_id || '').replace(/\D/g, '');
  if (!source || !target) return res.status(400).json({ error: 'source_id et target_id requis' });
  const dir = p.direction || ((p.source_language || 'fr').slice(0, 2) + '>' + ((p.target_language || 'en-US').toLowerCase().includes('en') ? 'en' : 'fr'));
  let html = '';
  if (p.html_base64) html = Buffer.from(p.html_base64, 'base64').toString('utf-8');
  else if (p.html) html = p.html;
  else if (p.html_url) { try { html = await fetch(p.html_url).then(r => r.text()); } catch (e) { return res.status(400).json({ error: 'html_url injoignable' }); } }
  else return res.status(400).json({ error: 'html requis (html_base64 / html / html_url)' });
  const media = scanHtmlAssets(html, p.localize_all_images !== false);
  const htmlPath = `07_runs/${source}/output/${target}_localized_${dir}.html`;
  const handoffPath = `07_runs/${source}/output/${target}_phase1_handoff.json`;
  const counts = { image: 0, annexe: 0, link: 0, video: 0 };
  media.forEach(m => { if (m.type === 'image') counts.image++; else if (m.type === 'link') counts.link++; else if (m.type === 'video') counts.video++; else counts.annexe++; });
  const handoff = {
    meta: { source_course_id: source, target_course_id: target, source_language: p.source_language || 'fr', target_language: p.target_language || 'en-US', direction: dir, detected_domain: p.domain || null, phase1_qa_score: null, imported: true, imported_at: new Date().toISOString() },
    gold_master: { html_path: htmlPath, html_url: RAW + encodeURI(htmlPath) },
    glossary: { common: [], domain_tm: [], run_terms: [] }, concept_swaps: [], cultural_flags: [],
    media_inventory: media, dispatch_summary: counts, qa: { a5_scores: {}, a6_issues: [], a6_applied: false }
  };
  if (p.dry_run) return res.json({ ok: true, dry_run: true, target, html_path: htmlPath, handoff_path: handoffPath, counts, media_inventory: media });
  try {
    fsx.mkdirSync(path.join(REPO_DIR, '07_runs', source, 'output'), { recursive: true });
    fsx.writeFileSync(path.join(REPO_DIR, htmlPath), html);
    fsx.writeFileSync(path.join(REPO_DIR, handoffPath), JSON.stringify(handoff, null, 2));
    execSync(`git add "${htmlPath}" "${handoffPath}"`, { cwd: REPO_DIR, stdio: 'pipe' });
    execSync(`git commit -m "import(phase1): ${target} HTML localisé + handoff (Phase 2 prête)"`, { cwd: REPO_DIR, stdio: 'pipe' });
    try { execSync('git pull --rebase origin main', { cwd: REPO_DIR, stdio: 'pipe' }); } catch (e) {}
    execSync('git push origin main', { cwd: REPO_DIR, stdio: 'pipe' });
    res.json({ ok: true, target, source, direction: dir, html_path: htmlPath, handoff_path: handoffPath, counts });
  } catch (e) { res.status(500).json({ error: 'git: ' + String((e && e.stderr && e.stderr.toString()) || e.message || e) }); }
});

// ---- Envoyer une image localisée sur Iconik (collection static_graphics du target) ----
app.post('/api/iconik/push', async (req, res) => {
  const p = req.body || {};
  const tid = String(p.target_course_id || '').replace(/\D/g, '');
  const file = p.download ? path.basename(p.download) : null;
  if (!tid) return res.status(400).json({ error: 'target_course_id requis' });
  if (!file) return res.status(400).json({ error: 'download requis' });
  const fp = path.join(DL_DIR, file);
  if (!fsx.existsSync(fp)) return res.status(404).json({ error: 'fichier introuvable: ' + file });
  const b64 = fsx.readFileSync(fp).toString('base64');
  const lc = file.toLowerCase();
  const mime = lc.endsWith('.png') ? 'image/png' : /\.jpe?g$/.test(lc) ? 'image/jpeg' : lc.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
  try {
    const r = await fetch(WH_ADHOC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'iconik_push', image_base64: b64, filename: file, target_course_id: tid, mime })
    });
    const d = await r.json();
    if (d && d.ok) return res.json({ ok: true, iconik_asset_id: d.iconik_asset_id, collection_id: d.collection_id, filename: d.filename });
    return res.status(500).json({ error: (d && d.error) || 'échec iconik', detail: d });
  } catch (e) { return res.status(500).json({ error: String(e) }); }
});

// ---- Archiviste TM : consolide les termes d'un run dans le CSV de la catégorie OC ----
const TM_DIR = path.join(REPO_DIR, '02_glossaires', 'translation_memory');
const TM_HEADER = 'source_term,target_term,direction,domain,software,subject,category,context_note,do_not_translate,validated,first_seen_course,last_updated';
const TM_COLS = TM_HEADER.split(',');
const csvCell = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function parseCsvLine(l) { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else { if (c === '"') q = true; else if (c === ',') { o.push(cur); cur = ''; } else cur += c; } } o.push(cur); return o; }
const safeCat = c => String(c || 'Other_Uncategorized').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
async function gatherRunTerms(source) {
  let listing = [];
  try { listing = await fetch(`https://api.github.com/repos/${REPO}/contents/07_runs/${source}/scratch`, { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.json() : []); } catch (e) {}
  const a5 = (Array.isArray(listing) ? listing : []).filter(f => /A5_.*\.jsonl$/.test(f.name || '')).sort((a, b) => a.name < b.name ? 1 : -1)[0];
  if (!a5) return { terms: [], domain: 'Tech', direction: 'fr>en' };
  const txt = await fetch(a5.download_url, { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.text() : '');
  const seen = new Set(), terms = []; let dm = 'Tech', dir = 'fr>en';
  const re = /\{"source_term":"([^"]+)","proposed_target":"([^"]+)","category":"([^"]+)"\}/g;
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let content = line; try { const o = JSON.parse(line); content = (o.body && o.body.messages && o.body.messages[1] && o.body.messages[1].content) || line; } catch (e) {}
    let m; re.lastIndex = 0;
    while ((m = re.exec(content))) { if (seen.has(m[1])) continue; seen.add(m[1]); terms.push({ source_term: m[1], proposed_target: m[2], category: m[3] }); }
    const d = (content.match(/detected_domain"?\s*:\s*"?([A-Za-z_ ]+?)["',]/) || [])[1]; if (d) dm = d.trim();
    const dr = (content.match(/\b(fr>en|en>fr|fr>es|es>fr|en>es)\b/) || [])[1]; if (dr) dir = dr;
  }
  return { terms, domain: dm, direction: dir };
}
app.post('/api/tm/consolidate', async (req, res) => {
  const p = req.body || {};
  const source = String(p.source_course_id || '').replace(/\D/g, '');
  if (!source) return res.status(400).json({ error: 'source_course_id requis' });
  try {
    const { terms, domain, direction } = await gatherRunTerms(source);
    if (!terms.length) return res.status(404).json({ error: 'aucun terme A2 trouvé pour ce run (scratch A5)' });
    const ar = await fetch(WH_ADHOC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archivist', domain, direction, context: p.context || '', terms }) }).then(r => r.json());
    if (!ar || !ar.ok) return res.status(500).json({ error: 'archivist: ' + ((ar && ar.error) || '?') });
    const cat = ar.oc_category || 'Other/Uncategorized'; const rows = ar.rows || [];
    const file = path.join(TM_DIR, safeCat(cat) + '.csv'); fsx.mkdirSync(TM_DIR, { recursive: true });
    // charge existant -> map
    const map = new Map();
    if (fsx.existsSync(file)) { const ls = fsx.readFileSync(file, 'utf-8').split(/\r?\n/).filter(l => l.trim()); ls.slice(1).forEach(l => { const c = parseCsvLine(l); map.set((c[0] || '').toLowerCase() + '|' + (c[2] || ''), c); }); }
    const today = new Date().toISOString().slice(0, 10); let added = 0, updated = 0;
    for (const r of rows) {
      const st = r.source_term || ''; if (!st) continue; const key = st.toLowerCase() + '|' + direction;
      const prev = map.get(key);
      const row = [st, r.target_term || '', direction, cat, r.software || '', r.subject || '', r.category || '', r.context_note || '', r.do_not_translate ? 'true' : 'false', 'false', prev ? (prev[10] || source) : source, today];
      if (prev) updated++; else added++;
      map.set(key, row);
    }
    const all = [...map.values()].sort((a, b) => (a[4] + a[6] + a[0]).localeCompare(b[4] + b[6] + b[0]));
    fsx.writeFileSync(file, TM_HEADER + '\n' + all.map(r => TM_COLS.map((_, i) => csvCell(r[i])).join(',')).join('\n') + '\n');
    try {
      const rel = path.relative(REPO_DIR, file);
      execSync(`git add "${rel}"`, { cwd: REPO_DIR, stdio: 'pipe' });
      execSync(`git commit -m "tm(archivist): +${added}/~${updated} termes — ${cat} (run ${source})"`, { cwd: REPO_DIR, stdio: 'pipe' });
      try { execSync('git pull --rebase origin main', { cwd: REPO_DIR, stdio: 'pipe' }); } catch (e) {}
      execSync('git push origin main', { cwd: REPO_DIR, stdio: 'pipe' });
    } catch (e) { return res.status(500).json({ error: 'git: ' + String((e.stderr && e.stderr.toString()) || e.message), category: cat, added, updated }); }
    res.json({ ok: true, category: cat, file: path.basename(file), added, updated, total: all.length });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

function mergeTmRows(cat, rows, direction, course, validated) {
  const file = path.join(TM_DIR, safeCat(cat) + '.csv'); fsx.mkdirSync(TM_DIR, { recursive: true });
  const map = new Map();
  if (fsx.existsSync(file)) { const ls = fsx.readFileSync(file, 'utf-8').split(/\r?\n/).filter(l => l.trim()); ls.slice(1).forEach(l => { const c = parseCsvLine(l); map.set((c[0] || '').toLowerCase() + '|' + (c[2] || ''), c); }); }
  const today = new Date().toISOString().slice(0, 10); let added = 0, updated = 0;
  for (const r of rows) {
    const st = r.source_term || ''; if (!st) continue; const key = st.toLowerCase() + '|' + direction; const prev = map.get(key);
    const val = validated ? 'true' : (prev ? prev[9] : 'false');
    const row = [st, r.target_term || '', direction, cat, r.software || '', r.subject || '', r.category || '', r.context_note || '', r.do_not_translate ? 'true' : 'false', val, prev ? (prev[10] || course) : course, today];
    if (prev) updated++; else added++; map.set(key, row);
  }
  const all = [...map.values()].sort((a, b) => (a[4] + a[6] + a[0]).localeCompare(b[4] + b[6] + b[0]));
  fsx.writeFileSync(file, TM_HEADER + '\n' + all.map(r => TM_COLS.map((_, i) => csvCell(r[i])).join(',')).join('\n') + '\n');
  const rel = path.relative(REPO_DIR, file);
  execSync(`git add "${rel}"`, { cwd: REPO_DIR, stdio: 'pipe' });
  execSync(`git commit -m "tm(archivist): +${added}/~${updated} — ${cat}${validated ? ' [validated]' : ''} (${course})"`, { cwd: REPO_DIR, stdio: 'pipe' });
  try { execSync('git pull --rebase origin main', { cwd: REPO_DIR, stdio: 'pipe' }); } catch (e) {}
  execSync('git push origin main', { cwd: REPO_DIR, stdio: 'pipe' });
  return { file: path.basename(file), added, updated, total: all.length };
}
app.post('/api/tm/ingest', async (req, res) => {
  const p = req.body || {};
  let fr = p.fr_html || '', en = p.en_html || '';
  if (p.fr_base64) fr = Buffer.from(p.fr_base64, 'base64').toString('utf-8');
  if (p.en_base64) en = Buffer.from(p.en_base64, 'base64').toString('utf-8');
  if (!fr || !en) return res.status(400).json({ error: 'fr + en requis (html ou base64)' });
  const strip = h => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const dir = p.direction || 'fr>en';
  try {
    const ar = await fetch(WH_ADHOC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archivist_extract', fr_text: strip(fr), en_text: strip(en), domain: p.domain || '', direction: dir }) }).then(r => r.json());
    if (!ar || !ar.ok) return res.status(500).json({ error: 'archivist: ' + ((ar && ar.error) || '?') });
    const cat = ar.oc_category || 'Other/Uncategorized'; const rows = ar.rows || [];
    if (!rows.length) return res.json({ ok: true, category: cat, added: 0, updated: 0, total: 0, note: 'aucun terme extrait' });
    res.json({ ok: true, category: cat, ...mergeTmRows(cat, rows, dir, p.course_id || 'corpus', true) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
app.get('/api/tm/list', (req, res) => {
  try {
    fsx.mkdirSync(TM_DIR, { recursive: true });
    const files = fsx.readdirSync(TM_DIR).filter(f => f.endsWith('.csv'));
    const cats = files.map(f => { const ls = fsx.readFileSync(path.join(TM_DIR, f), 'utf-8').split(/\r?\n/).filter(l => l.trim()); const rows = ls.slice(1).map(parseCsvLine); return { category: f.replace(/\.csv$/, '').replace(/_/g, ' '), file: f, terms: rows.length, validated: rows.filter(c => c[9] === 'true').length }; }).sort((a, b) => b.terms - a.terms);
    res.json({ ok: true, categories: cats, total: cats.reduce((a, b) => a + b.terms, 0), repo: `https://github.com/${REPO}/tree/main/02_glossaires/translation_memory` });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get('/api/tm/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase(); const onlyCat = req.query.category ? safeCat(req.query.category) : null;
  if (!q) return res.status(400).json({ error: 'q requis' });
  try {
    fsx.mkdirSync(TM_DIR, { recursive: true });
    const files = fsx.readdirSync(TM_DIR).filter(f => f.endsWith('.csv') && (!onlyCat || f === onlyCat + '.csv'));
    const hits = [];
    for (const f of files) {
      const ls = fsx.readFileSync(path.join(TM_DIR, f), 'utf-8').split(/\r?\n/).filter(l => l.trim());
      ls.slice(1).forEach(l => { const c = parseCsvLine(l); if ((c[0] || '').toLowerCase().includes(q) || (c[1] || '').toLowerCase().includes(q)) hits.push({ source_term: c[0], target_term: c[1], direction: c[2], domain: c[3], software: c[4], subject: c[5], category: c[6], context_note: c[7], validated: c[9] === 'true' }); });
    }
    hits.sort((a, b) => { const ae = (a.source_term.toLowerCase() === q || a.target_term.toLowerCase() === q) ? 0 : 1; const be = (b.source_term.toLowerCase() === q || b.target_term.toLowerCase() === q) ? 0 : 1; return ae - be; });
    res.json({ ok: true, q, count: hits.length, hits: hits.slice(0, 60) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- Patcher de conformité TM : un cours (par ID/repo/extracteur) confronté à la TM validée du domaine ----
app.post('/api/tm/patch', async (req, res) => {
  const p = req.body || {}; const dir = p.direction || 'fr>en';
  if (!p.category) return res.status(400).json({ error: 'category (domaine TM) requise' });
  let html = '', srcId = '';
  try {
    if (p.html_base64) html = Buffer.from(p.html_base64, 'base64').toString('utf-8');
    else if (p.course_id) {
      const cid = String(p.course_id).replace(/\D/g, ''); srcId = cid;
      const st = await contentStatus(cid);
      if (st && st.done) html = await fetch(RAW + encodeURI(`07_runs/${st.source}/output/${cid}_localized_${st.direction}.html`), { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.text() : '');
      if (!html) { try { const exr = await fetch(`${N8N}/webhook/cls-v3-extraction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: cid, 'Course ID': cid }) }).then(r => r.ok ? r.text() : ''); if (exr) { const fh = o => { if (typeof o === 'string') return (/<\w+[\s>]/.test(o) && o.length > 300) ? o : ''; if (Array.isArray(o)) { for (const x of o) { const h = fh(x); if (h) return h; } } if (o && typeof o === 'object') { for (const k of ['html', 'final_html', 'content', 'body', 'data']) { if (typeof o[k] === 'string' && /<\w/.test(o[k])) return o[k]; } for (const v of Object.values(o)) { const h = fh(v); if (h) return h; } } return ''; }; let cand = ''; try { cand = fh(JSON.parse(exr)); } catch (e) { if (/<\w+[\s>]/.test(exr)) cand = exr; } if (cand) html = cand; } } catch (e) {} }
    }
    if (!html) return res.status(404).json({ error: 'HTML introuvable (ni repo output/, ni extracteur OC) — vérifie l\'ID / le credential ocBasic, ou fournis html_base64' });
    const file = path.join(TM_DIR, safeCat(p.category) + '.csv');
    if (!fsx.existsSync(file)) return res.status(404).json({ error: 'pas de TM pour ' + p.category });
    const ls = fsx.readFileSync(file, 'utf-8').split(/\r?\n/).filter(l => l.trim());
    const tm = ls.slice(1).map(parseCsvLine).filter(c => c[2] === dir && c[9] === 'true').map(c => ({ source_term: c[0], target_term: c[1], do_not_translate: c[8] === 'true' }));
    if (!tm.length) return res.status(404).json({ error: 'aucun terme validé ' + dir + ' dans ' + p.category });
    const strip = h => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cf = await fetch(WH_ADHOC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tm_conform', target_text: strip(html), tm, direction: dir }) }).then(r => r.json());
    if (!cf || !cf.ok) return res.status(500).json({ error: 'conform: ' + ((cf && cf.error) || '?') });
    const corr = (cf.corrections || []).filter(c => c.wrong && c.correct && c.wrong !== c.correct && html.includes(c.wrong));
    res.json({ ok: true, mode: 'analyse', category: p.category, direction: dir, tm_terms: tm.length, proposed: corr.length, conform: corr.length === 0, corrections: corr.slice(0, 200) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
// ---- Applique UNIQUEMENT les corrections validées par l'humain (review-first) ----
app.post('/api/tm/apply', async (req, res) => {
  const p = req.body || {}; const dir = p.direction || 'fr>en';
  const corrections = Array.isArray(p.corrections) ? p.corrections : [];
  if (!corrections.length) return res.status(400).json({ error: 'aucune correction sélectionnée' });
  let html = '', srcId = '';
  try {
    if (p.html_base64) html = Buffer.from(p.html_base64, 'base64').toString('utf-8');
    else if (p.course_id) {
      const cid = String(p.course_id).replace(/\D/g, ''); srcId = cid;
      const st = await contentStatus(cid);
      if (st && st.done) html = await fetch(RAW + encodeURI(`07_runs/${st.source}/output/${cid}_localized_${st.direction}.html`), { headers: { 'User-Agent': 'leo-bff' } }).then(r => r.ok ? r.text() : '');
      if (!html) { try { const exr = await fetch(`${N8N}/webhook/cls-v3-extraction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: cid, 'Course ID': cid }) }).then(r => r.ok ? r.text() : ''); if (exr) { const fh = o => { if (typeof o === 'string') return (/<\w+[\s>]/.test(o) && o.length > 300) ? o : ''; if (Array.isArray(o)) { for (const x of o) { const h = fh(x); if (h) return h; } } if (o && typeof o === 'object') { for (const k of ['html', 'final_html', 'content', 'body', 'data']) { if (typeof o[k] === 'string' && /<\w/.test(o[k])) return o[k]; } for (const v of Object.values(o)) { const h = fh(v); if (h) return h; } } return ''; }; let cand = ''; try { cand = fh(JSON.parse(exr)); } catch (e) { if (/<\w+[\s>]/.test(exr)) cand = exr; } if (cand) html = cand; } } catch (e) {} }
    }
    if (!html) return res.status(404).json({ error: 'HTML introuvable pour appliquer' });
    let fixed = html, applied = 0;
    for (const c of corrections) { if (!c || !c.wrong || !c.correct) continue; const b = fixed; fixed = fixed.split(c.wrong).join(c.correct); if (fixed !== b) applied++; }
    const base = ((srcId || 'course') + '_' + dir.replace('>', '-') + '_TMfixed.html').replace(/[^\w.\-]+/g, '_');
    fsx.writeFileSync(path.join(DL_DIR, base), fixed);
    res.json({ ok: true, applied, total: corrections.length, download: '/downloads/' + base });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ---- Liste des projets (dérivée de l'arbre repo : chaque cours localisé = un projet) ----
// ---- titre de cours (page publique OC, best-effort) + cache persistant ----
const titlesFile = path.join(REVIEW_DIR, 'course_titles.json');
let titlesCache = {};
try { titlesCache = JSON.parse(fsx.readFileSync(titlesFile, 'utf-8')); } catch (e) {}
function saveTitles() { try { fsx.writeFileSync(titlesFile, JSON.stringify(titlesCache, null, 2)); } catch (e) {} }
async function fetchOcTitle(id) {
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://openclassrooms.com/fr/courses/${id}`, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 leo-bff' } });
    clearTimeout(to);
    if (!r.ok) return null;
    const html = await r.text();
    const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)/i);
    let t = og && og[1];
    if (!t) { const tt = html.match(/<title>([^<]*)<\/title>/i); t = tt && tt[1].replace(/\s*[-–|]\s*OpenClassrooms\s*$/i, '').trim(); }
    t = (t || '').trim();
    return (t && !/^openclassrooms$/i.test(t)) ? t : null;
  } catch (e) { return null; }
}
// titre d'un projet : essaie source (FR original, souvent public) puis target
async function courseTitle(source, target) {
  const key = source + '|' + target;
  if (key in titlesCache) return titlesCache[key];   // inclut les null (échecs) pour ne pas re-frapper OC
  let t = await fetchOcTitle(source);
  if (!t) t = await fetchOcTitle(target);
  titlesCache[key] = t || null; saveTitles();
  return titlesCache[key];
}
// ---- override manuel du titre par projet (source de vérité, éditable) ----
const projMetaFile = path.join(REVIEW_DIR, 'project_meta.json');
let projMeta = {};
try { projMeta = JSON.parse(fsx.readFileSync(projMetaFile, 'utf-8')); } catch (e) {}
function saveProjMeta() { try { fsx.writeFileSync(projMetaFile, JSON.stringify(projMeta, null, 2)); } catch (e) {} }
const titleOverride = id => (projMeta[id] && projMeta[id].title) || null;

app.get('/api/projects', async (req, res) => {
  try {
    const items = await getTree();
    const re = /07_runs\/(\d+)\/output\/(\d+)_localized_(.+)\.html$/;
    const seen = new Set(), out = [];
    for (const it of items) {
      const m = (it.path || '').match(re);
      if (m) { const key = m[2] + '|' + m[3]; if (seen.has(key)) continue; seen.add(key); out.push({ target: m[2], source: m[1], direction: decodeURIComponent(m[3]) }); }
    }
    out.sort((a, b) => b.target.localeCompare(a.target));
    await Promise.all(out.map(async p => {
      const ov = titleOverride(p.target);
      p.title = ov || (await courseTitle(p.source, p.target)) || '';
      p.title_edited = !!ov;
    }));
    res.json({ ok: true, projects: out });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// titre à la demande (pour ouverture d'un projet créé par ID)
app.get('/api/course/:id/title', async (req, res) => {
  const id = String(req.params.id).replace(/\D/g, '');
  const ov = titleOverride(id);
  const t = ov || (await courseTitle(id, id));
  res.json({ ok: true, id, title: t || '', title_edited: !!ov });
});

// enregistrer / effacer le titre manuel d'un projet (source de vérité)
app.post('/api/project/:id/title', (req, res) => {
  const id = String(req.params.id).replace(/\D/g, '');
  const title = String((req.body && req.body.title) || '').slice(0, 200).trim();
  if (title) projMeta[id] = Object.assign({}, projMeta[id], { title, ts: Date.now() });
  else if (projMeta[id]) { delete projMeta[id].title; if (!Object.keys(projMeta[id]).length) delete projMeta[id]; }
  saveProjMeta();
  res.json({ ok: true, id, title, title_edited: !!title });
});

// ---- Rejets de revue (avec commentaire QA) — consignés par projet pour ML futur ----
const rejFile = id => path.join(REVIEW_DIR, String(id).replace(/\D/g, '') + '_rejections.json');
const readRej = id => { try { return JSON.parse(fsx.readFileSync(rejFile(id), 'utf-8')); } catch (e) { return {}; } };
app.get('/api/review/:id/rejections', (req, res) => res.json(readRej(req.params.id)));
app.post('/api/review/:id/reject', (req, res) => {
  const { item_id, item_type, rejected, comment } = req.body || {};
  if (!item_id) return res.status(400).json({ error: 'item_id requis' });
  const m = readRej(req.params.id);
  if (rejected) m[item_id] = { type: item_type || '', rejected: true, comment: (comment || '').slice(0, 400), ts: Date.now() };
  else delete m[item_id];
  fsx.writeFileSync(rejFile(req.params.id), JSON.stringify(m, null, 2));
  res.json({ ok: true, count: Object.keys(m).length });
});

app.get('/api/health', (req, res) => res.json({ ok: true, n8n: N8N }));

const PORT = process.env.PORT || 4317;
app.listen(PORT, () => console.log(`LEO BFF → http://localhost:${PORT}  (n8n: ${N8N})`));
