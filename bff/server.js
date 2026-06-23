/* LEO v1 — BFF
 * Sert l'UI (../ui) + proxifie n8n. Aucun secret ici (forms n8n locaux + repo GitHub public).
 * Node 18+ (fetch & FormData globaux).
 */
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

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

// ---- GET status d'un cours (statut Phase 1 réel via l'arbre GitHub) ----
app.get('/api/content/:id/status', async (req, res) => {
  const target = String(req.params.id || '').trim();
  try {
    const items = await getTree();
    const re = new RegExp(`07_runs/(\\d+)/output/${target}_localized_(.+)\\.html$`);
    let found = null;
    for (const it of items) { const m = (it.path || '').match(re); if (m) { found = { source: m[1], dir: m[2] }; break; } }
    if (!found) return res.json({ done: false, target });

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
    res.json({ done: true, target, source: found.source, direction: found.dir, src, tgt, inventory: inv });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

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
      out.push({ step: 'Phase 1', form: 'f146189f', ...(await submitForm(FORM_P1, f)) });
    }
    if (p.phase2) {
      if (p.chained) {
        out.push({ step: 'Phase 2', deferred: true, note: "chaîné — à lancer après livraison Phase 1 (le BFF ne poll pas encore)" });
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
    res.json({ runs: _runs.data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true, n8n: N8N }));

const PORT = process.env.PORT || 4317;
app.listen(PORT, () => console.log(`LEO BFF → http://localhost:${PORT}  (n8n: ${N8N})`));
