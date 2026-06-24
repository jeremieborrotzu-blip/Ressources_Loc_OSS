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
app.post('/api/assets/localize', async (req, res) => {
  const p = req.body || {};
  try {
    const r = await fetch(WH_ADHOC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: p.items || [], source_language: p.source_language, target_language: p.target_language, prompt: p.prompt || null, glossary: p.glossary || null })
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
const decisions = {}; // { target: [ {id, target_url, ts} ] } — arbitrages opérateur (A10)
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
    res.json({ done: true, target, source: st.source, direction: st.direction, a5, a8, a10, qa_report, decisions: decisions[target] || [] });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
app.post('/api/review/:id/resolve', (req, res) => {
  const t = String(req.params.id || '').trim();
  const { id, target_url } = req.body || {};
  if (!id || !target_url) return res.status(400).json({ error: 'id + target_url requis' });
  decisions[t] = (decisions[t] || []).filter(d => d.id !== id);
  decisions[t].push({ id, target_url, ts: Date.now() });
  res.json({ ok: true, count: decisions[t].length, decisions: decisions[t] });
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

app.get('/api/health', (req, res) => res.json({ ok: true, n8n: N8N }));

const PORT = process.env.PORT || 4317;
app.listen(PORT, () => console.log(`LEO BFF → http://localhost:${PORT}  (n8n: ${N8N})`));
