# QA Join (A5→A6), réassemblage propre & livraison

> Mécanisme de synchronisation des chunks après la boucle QA, réassemblage HTML
> et livraison finale. Documente les correctifs du **2026-06-10** (MAIN `ApjYq9sdM5LKRVlq`).

---

## 1. Le problème — pourquoi un « join » est nécessaire

La boucle QA traite **chaque chunk indépendamment** : un chunk bien noté passe A5 dès
l'itération 1, tandis qu'un autre peut nécessiter 2 ou 3 itérations (A3→A4→A5).
Les chunks arrivent donc à des **moments différents** au moment d'appeler A6.

En n8n, un nœud se déclenche **dès qu'une de ses entrées reçoit des données** — il
n'existe pas de barrière « attendre toutes les branches amont ». Sans synchronisation,
`Call A6` partait avec le **premier chunk arrivé seul** (typiquement l'intro `ch0`
qui passe en iter 1), puis le Reassembler s'exécutait en aval avec 1 seul chunk.

> **Symptôme observé (run 8787276, 2026-06-09) :** statut `succeeded`, mais HTML livré
> ne contenant qu'un chapitre sur quatre → perçu comme « vide ». A1→A5 traitaient bien
> 4 chunks ; A6 n'en recevait qu'1.

---

## 1bis. Le bug racine réel — `QA Check` ne gardait qu'1 chunk

⚠️ Cause confirmée par un run de test (2026-06-10) : `QA Check iter1` et `QA Check iter2`
faisaient `$input.first()` et retournaient **un seul item** — ils jetaient 3 chunks sur 4.

Conséquence : A5 sort 4 chunks notés (ex. 100 / 100 / 83 / 40) → QA Check garde le premier
seulement → le Buffer reçoit 1 item → `1 < 4` → attente infinie → aucune reboucle iter2.
C'est **ce** bug (et pas seulement le timing du join) qui causait « A6 reçoit 1 chunk ».

**Fix :** les deux nœuds traitent désormais tous les chunks et routent chacun
individuellement :
```js
return $input.all().map(item => {
  const j = item.json, a5 = j.agent_output || {};
  const score = a5.score_total || 0, pass = score >= 90;
  return { json: { ...j, score_total: score,
    qa_status: pass ? 'PASS' : (j.iteration >= 3 ? 'ESCALATE' : 'REVISE'),
    failing_segments: pass ? [] : (a5.critical_blockers || []),
    previous_qa_report: a5, a5_qa_report: a5 }};
});
```

> Le `Score >= 90?` (Switch en mode expression) route alors chaque item selon son
> `qa_status` : PASS → Buffer, REVISE → A3 iter2, ESCALATE → Buffer.

## 2. La solution — nœud `Buffer for A6` (barrier sync)

> 🔴 **MODE PRODUCTION OBLIGATOIRE.** Le Buffer repose sur `$getWorkflowStaticData`,
> qui n'est fiable **qu'en exécution de production** (workflow actif, déclenché par le
> **formulaire**). En lancement manuel (« Execute workflow »), le static data ne persiste
> pas → le buffer ne peut pas accumuler → deadlock. **Toujours lancer le pipeline via
> l'URL du formulaire**, jamais en manuel.

Un Code node **`Buffer for A6`** est inséré entre les trois sorties qui mènent à A6 et
`Call A6` :

```
Score >= 90?        (out0 PASS, out2 ESCALATE) ┐
Score >= 90 iter2?  (out0 PASS)                ├──→ Buffer for A6 ──→ Call A6
Post-QA Mode?       (out1 localize)            ┘
```

Le buffer accumule les chunks dans le **static data du workflow** et ne libère vers A6
que lorsque **tous** les chunks attendus sont arrivés :

```js
const store = $getWorkflowStaticData('global');
if (!Array.isArray(store.a6buf)) store.a6buf = [];
for (const it of $input.all()) store.a6buf.push(it.json);

let total = 0;
try { total = $('Call Pre-Processor').all().length; } catch(e) {}
if (!total) total = ($input.first()?.json?.pipeline_meta?.total_chunks) || store.a6buf.length;

if (store.a6buf.length >= total) {
  const out = store.a6buf.slice();
  store.a6buf = [];          // vidé pour le run suivant
  return out.map(j => ({ json: j }));
}
return [];                    // pas encore tous arrivés → on attend
```

**Propriétés clés :**
- Chaque chunk fait **exactement** son nombre d'itérations — un PASS iter 1 ne re-boucle pas.
  C'est essentiel en Batch API où chaque itération inutile = un cycle de polling
  supplémentaire (latence en heures, pas en secondes).
- `total` vient de `Call Pre-Processor` (nombre de chunks émis), fallback `pipeline_meta.total_chunks`.
- Pas de deadlock : chaque chunk atteint forcément une des 3 sorties en ≤ 3 itérations.

> ⚠️ **Reset obligatoire.** Le static data persiste entre exécutions. `Init Params`
> réinitialise le buffer en tête de chaque run :
> ```js
> const _s = $getWorkflowStaticData('global'); _s.a6buf = [];
> ```

---

## 3. Réassemblage propre — `Merge Phase 1`

Une fois les N chunks libérés, `Call A6` → `Merge Phase 1` → `Call Reassembler`.
`Merge Phase 1` prépare les chunks pour le Reassembler. Deux éléments sont
**indispensables** à un réassemblage correct :

### 3.1 Metadata de structure (`part_index` / `part_name` / `chapter_name`)
Le Reassembler ré-insère les séparateurs de partie `<h2>` à partir de `part_index` /
`part_name`. Les agents (A1→A6) ne propagent pas ces champs ; `Merge Phase 1` les
**re-récupère depuis `Call Pre-Processor`** via un lookup par `chapter_index + chunk_index` :

```js
const pre = {};
$('Call Pre-Processor').all().forEach(p => {
  const k = (p.json.chapter_index??0) + '-' + (p.json.chunk_index??1);
  pre[k] = { part_index:p.json.part_index, part_name:p.json.part_name, chapter_name:p.json.chapter_name };
});
```

> Sans ce lookup, les titres de **partie** (`<h2>`) disparaissent du HTML final.
> Les titres de chapitre (`<h3>`→`<h4>`) sont déjà dans le HTML du chunk, donc préservés.

### 3.2 Empreinte structurelle (`type:'fingerprint'`)
Le Reassembler attend un item `type:'fingerprint'` pour ses **7 checks structurels**
(notamment `data-claire-semantic` et le compte de blocs de code). `Merge Phase 1`
l'ajoute en fin de sortie, lu depuis `Extract Fingerprint` :

```js
const fp = $('Extract Fingerprint').first().json;
out.push({ json: { type:'fingerprint', urls:fp.urls,
  claire_semantics:fp.claire_semantics, code_blocks_count:fp.code_blocks_count } });
```

> Sans le fingerprint, le check `data-claire-semantic` compare un ensemble vide et
> « passe » par défaut → `structural_integrity` à `true` à tort (validation faussée).

---

## 4. Livraison & notification

```
Call Reassembler → Structural OK?
   ├─[OK]      → Prepare Deliver Input → Call Deliver Output → Format HTML Delivery → Send HTML Email
   └─[blocked] → Flag BLOCKED
```

### 4.0 `Prepare Deliver Input` (consolidation)
Le SUB Deliver est appelé en `passThrough` : sans consolidation, il ne reçoit que
l'output du Validator (checks structurels + `final_html`) — **pas** le score A5 ni les
logs A4/A6, qui ne survivent pas au Reassembler. Ce node Code consolide, avant l'appel :

| Champ | Source |
|---|---|
| `checks` / `structural_checks` | `Call Reassembler` (output Validator) — les 7 checks du HTML de sortie |
| `final_html`, `structural_integrity` | `Call Reassembler` |
| `score_total` (moyenne A5) | `Buffer for A6` (items porteurs de `score_total`) |
| `a4_swap_log`, `a6_issue_log` | `Merge Phase 1` (agrégés par chunk) |
| `a5_summary`, `a5_qa_report` | calculés depuis les scores A5 |

> Sans ce node, `decision_log` et `qa_report` étaient livrés **amputés** des logs A4/A6
> et du score (le Deliver lisait des champs jamais fournis). Corrigé aussi : le Validator
> sort `checks`, le Deliver lisait `structural_checks` → mapping rétabli.

### 4.1 `Call Deliver Output` (SUB `fBgHok8kQUPxlTAT`, 11 nœuds)
Pousse **8 fichiers** sur GitHub via des nœuds **GitHub natifs** (plus de HTTP Request,
plus de Google Doc) dans `07_runs/{src}/output/` :

| Fichier | Contenu |
|---|---|
| `{tgt}_localized_{dir}.html` | HTML localisé final |
| `{tgt}_review_{dir}.md` | Review (HTML mirror, import Notion) |
| `{tgt}_qa_report_{dir}.md` | **État des lieux du HTML de sortie** (voir 4.3) + checklist Phase 2 |
| `{tgt}_decision_log_{dir}.json` | A4 swap log + A5 QA + A6 issues + checks |
| `{tgt}_tm_patch_{dir}.csv` | Nouveaux termes pour la TM |
| `{tgt}_todo_static_graphics_{dir}.csv` | → A8 |
| `{tgt}_todo_external_links_{dir}.csv` | → mise à jour manuelle |
| `{tgt}_todo_videos_{dir}.csv` | → A7 |

`Build Delivery Summary` expose les URLs dans `deliverables{ html_github, review_md,
qa_report, log_github, tm_patch, todo_graphics, todo_links, todo_videos }`.

### 4.2 Email (`Format HTML Delivery` + `Send HTML Email`)
`Format HTML Delivery` lit `Call Deliver Output` et génère un **corps HTML** listant
les liens GitHub. `Send HTML Email` envoie en `emailFormat: html`.

> ⚠️ **Ne jamais utiliser `Buffer.from()` dans une expression n8n** (disponible
> uniquement dans les nœuds Code). L'ancien `Send HTML Email` construisait la pièce
> jointe avec `Buffer.from($json.html)` dans une expression → échec silencieux →
> **email sans pièce jointe ni lien**. Remplacé par une livraison **par liens GitHub**
> (pas de pièce jointe). Voir aussi la règle binaires n8n.

### 4.3 `qa_report.md` — état des lieux du HTML de sortie
Le rapport QA livré n'évalue pas seulement la traduction (score A5 par chunk) mais
fait un **état des lieux du HTML final réassemblé** :

- **Verdict structurel** : `structural_integrity` + les **7 checks** du Validator listés
  un par un (PASS/FAIL + détail) — balance des balises, `data-claire-semantic`, blocs
  atomiques, texte orphelin, hiérarchie h2/h3/h4, URLs, nombre de blocs de code.
- **Métriques du HTML produit** : nombre de caractères, parties (h2), chapitres (h3),
  sous-sections (h4), blocs de code, liens, images — calculées depuis `final_html`.
- **Score linguistique A5** (moyenne + par chunk) et **issues A6** (naturalness).
- **Checklist Phase 2** (graphics / liens / vidéos).

> Distinction clé : le mode **Quality Check** (case à cocher seule) évalue la qualité
> de **traduction des segments AVANT réassemblage** (score A5) — il ne voit pas le HTML
> final. L'**état des lieux du HTML de sortie** n'existe qu'en sortie de localisation
> complète, dans `qa_report.md`. Un mode « QA du HTML de sortie » autonome reste à
> construire si on veut re-checker un HTML déjà livré sans relancer tout le pipeline.

---

## 5. Récapitulatif des correctifs 2026-06-10

| Zone | Avant | Après |
|---|---|---|
| `QA Check iter1/iter2` | `$input.first()` → 1 chunk sur 4 (cause racine) | `$input.all().map()` → route les N chunks |
| Join A5→A6 | `Call A6` déclenché avec 1 chunk | `Buffer for A6` libère quand N chunks prêts (production only) |
| `Init Params` | — | reset du static buffer en tête |
| `Merge Phase 1` | chapter_index/chunk_index seuls | + part_index/part_name/chapter_name + fingerprint |
| `Format HTML Delivery` | lisait `Call Reassembler.final_html` | lit `Call Deliver Output.deliverables` (liens) |
| `Send HTML Email` | PJ via `Buffer.from` (cassée) | corps HTML avec liens GitHub |
| `Prepare Deliver Input` (nouveau) | — | consolide checks + score A5 + logs A4/A6 avant le Deliver |
| `qa_report.md` | score A5 + issues seulement | + état des lieux structurel du HTML de sortie (7 checks + métriques) |
| decision_log `structural_checks` | vide (mauvais nom lu) | mapping `checks`→`structural_checks` rétabli |

MAIN passé de 50 → 52 nœuds (Buffer for A6 + Prepare Deliver Input). Appliqué via API
publique n8n + `wal_checkpoint(TRUNCATE)` (persistance après redémarrage Docker).

**Reste à valider :** un run complet `8787276` de bout en bout (4 chunks → A6 →
réassemblage → email avec liens).
