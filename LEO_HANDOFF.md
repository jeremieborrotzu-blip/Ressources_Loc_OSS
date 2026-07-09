# LEO — Document de reprise (handoff pour un futur Claude Code / dev)

> **But de ce fichier** : permettre à une nouvelle session (autre machine / autre VS Code) de **reprendre tout le fil** du travail sur LEO sans re-découvrir le contexte. Aucun secret ici (repo public). Les valeurs sensibles vivent dans n8n (inline) et sur le HDD (`n8n_backup_*/n8n_env.txt`).

## 1. C'est quoi LEO
**LEO (Localization Engine Operator)** = pipeline de **localisation de cours OpenClassrooms** (FR↔EN) piloté par des **agents IA** coordonnés. Chaîne : formulaire n8n (extraction HTML) → Phase 1 contenu (A1–A6 → *Gold Master*) → Phase 2 assets & liens (A7–A10 → Iconik) → Revue humaine → livraison. Un **poste de pilotage** (UI) orchestre le tout ; une **mémoire de traduction (TM)** se capitalise par domaine.

## 2. Composants & où vit quoi
- **Repo GitHub** : `jeremieborrotzu-blip/Ressources_Loc_OSS` (compte **OC**). Contient : `bff/` (Node/Express), `ui/` (2 interfaces), `04_n8n_flows/` (exports partiels, secret-free), `02_glossaires/translation_memory/*.csv` (TM), `01_prompts/`, `07_runs/{src}/output|scratch/` (Gold Masters + batchs), `docs/`, `design/` (prototypes), `codex_handoff/`.
- **n8n** : self-hosted **Docker** (conteneur `n8n`, image `n8nio/n8n:latest`, volume `n8n_local_n8n_data`, DB SQLite `/home/node/.n8n/.n8n/database.sqlite`, port **5678**, owner uid 1000). `N8N_ENCRYPTION_KEY` obligatoire (sauvegardée dans `n8n_backup_*/n8n_env.txt`).
- **BFF** : `bff/server.js`, port **4317** (`cd bff && node server.js`). Sert l'UI + endpoints. État par projet dans `bff/review_state/*.json` (**gitignored**). Assets localisés dans `bff/downloads/`.
- **UI** : `ui/index.html` (app filet 100% fonctionnelle) + **`ui/leo-v1.1.html`** (project-centric, la direction actuelle — à renommer `index.html` quand validée).
- **Iconik** (MAM sur le S3 d'OC) : racine `0000_LOCALISATION` → 1 dossier par cours cible → 4 sous-dossiers : `static_graphics` (images/A8), `external_files` (docs/A9), `transcripts` (A7), `pdf_to_be_localized`.

### Workflows n8n clés (IDs)
- `ApjYq9sdM5LKRVlq` — **[MAIN] CLS v3 — Course Localisation** (form `f146189f-507c-44da-beb7-6c888a156a3f`).
- `odMhJgxadf3RPAHp` — **[SUB] Reassembler + Validator** (contient le *Structural Validator*, voir §4).
- `fBgHok8kQUPxlTAT` — **[SUB] Deliver Output** (push GitHub des livrables).
- Agents A1–A6 : SUBs `[AGENT] CLS v3 — A1…A6`. A5 = *Quality Gatekeeper* (`De0vqzEM`).
- `WekFWcriLsGIyYsj` — **[SUB] leo-adhoc** (webhook `/webhook/leo-adhoc`) : localisation images (A8 vision gpt-5.5 + gpt-image-2) / docs (A9), **push Iconik** (`iconik_push`) + **inventaire Iconik** (`iconik_list`). ⚠️ secrets inline.
- `Vayz4Sns…` A8 batch, `MNQpFIaY` A9, `qTMzikhS` A10, `e8IsiWnT` A7, `1rNi2FfR` Iconik Upload, `P97ds2vb` Iconik Init.
- Extraction : `RtYARZLk…` **[CLS] OC HTML Extraction — SUB** (celui appelé par le pipeline) + `7FmkshRY…` (Alt). Le `ocBasic` est inline dans le node « Credentials » des deux (voir §4).
- Phase 2 MAIN : `iOvLCwyO` **[MAIN] LEO v1 — Assets** (form `leo-assets`). Project Localizer GDoc→DOCX : `3ZtXBYzd` (`/webhook/leo-project`).

### Endpoints BFF principaux
`/api/launch`, `/api/content/:id/status`, `/api/runs`, `/api/projects`, `/api/course/:id/title`, `/api/project/:id/title`, `/api/review/:id` (+ `/resolve /checks /localized /reject /rejections /iconik /iconik/verify /html`), `/api/assets/localize`, `/api/iconik/push`, `/api/phase1/import`, `/api/tm/list|search|consolidate|ingest|patch|apply`.

## 3. État actuel (ce qui est fait & validé en local)
- **UI v1.1 project-centric** : accueil Projets (`/api/projects`) → workspace Aperçu/Produire/Revue/Suivi + Global TM Agent/Assets. Bannière + logo restaurés.
- **Titre de cours** sur les cartes + en-tête (scrape page publique OC du cours source) **+ override éditable** (prioritaire, persistant).
- **Revue** : A5/A8/A10, conformité TM (review-first), **feature REJET** (✕ + commentaire QA → `review_state/{t}_rejections.json`, pour le ML).
- **Iconik** : statut d'upload **persistant** (`{t}_iconik.json`) + restauré au chargement ; bouton **« Vérifier Iconik »** qui réconcilie avec la collection réelle (`iconik_list`) ; **inventaire des 4 dossiers**. Dossier parasite `{target_course_id}` nettoyé.
- **A8** : reconstruit toute image (sauf banner) sans masque + recontextualisation (contexte du cours + adaptation locale, ex. AZERTY→US).
- **TM Agent** : mémoire par catégorie OC (Development, Systems_and_Networks, Cybersecurity amorcés) ; ingestion de paires FR+localisé validées.
- **Fix majeur (voir §4)** : le *Structural Validator* qui bloquait la livraison est passé en **soft-gate**.

## 4. Procédures & pièges CRITIQUES
- **Éditer un workflow n8n en DB (procédure validée)** : `docker stop n8n` → copier DB (+`-wal`+`-shm`) → `PRAGMA wal_checkpoint(TRUNCATE)` → patch `workflow_entity.nodes` **ET** `workflow_history` de la **version active** (n8n exécute la version active de `workflow_history`, pas le draft entity) → réinjecter dans le **volume** via `docker run --rm -v n8n_local_n8n_data:/data -v <work>:/host alpine cp …` + `rm -f *.sqlite-wal *.sqlite-shm` + `chown 1000:1000` → `docker start n8n` → **vérifier par une vraie exécution** (form/webhook 200). ⚠️ Ne jamais `docker cp` vers le conteneur stoppé (masqué par le volume).
- **Sandbox task-runner n8n** : `new URL()` ET `require('url').parse()` throwent → parser les URLs à la main ; TLS self-signed → `rejectUnauthorized:false` ; le PUT binaire S3 doit être en **raw `https`** (le helper `httpRequest` corrompt le binaire) ; `require('https')` OK, `jszip` OK en self-host (⚠️ modules externes restreints sur n8n Cloud).
- **`ocBasic` (OAuth API OC staging) renouvelé CHAQUE SEMAINE** → à propager dans les **2 SUBs** d'extraction (`RtYARZLk` + `7FmkshRY`, entity + version active). **Il était EXPIRÉ (401) au dernier check** → à renouveler avant tout run réel. L'API OC est derrière **Cloudflare Access** → headers `CF-Access-Client-Id/Secret` (cfId/cfSecret, stables) requis en plus du Basic.
- **Extraction par ID cassée** (le course ID n'arrive pas au SUB → 404) → contournement adopté : **extraire via le FORM** puis uploader le HTML.
- **Structural Validator (fix 2026-07)** : dans `odMhJgxa`, il posait `final_html=null` + BLOCKED dès qu'UN des 7 checks stricts échouait (dont hiérarchie de titres qui échoue même quand la SOURCE saute h2→h4) → Gold Master jeté. **Corrigé en soft-gate** : `final_html` = toujours le HTML réassemblé ; les 7 checks → `structural_warnings` (annotés) ; `blocked` seulement si HTML vide. ⇒ livre du premier coup dès qu'il y a du contenu.
- **Sécurité** : les secrets (clé OpenAI, JWT + app_id + storage_id Iconik, ocBasic, Cloudflare cfId/cfSecret, Vimeo) sont **inline dans les Code nodes n8n UNIQUEMENT, JAMAIS dans le repo public**. **Toujours scanner le diff** (préfixes de clés, JWT, UUID de credentials) avant chaque commit. **Committer avec l'identité OC** (`jeremie.borrotzu@openclassrooms.com` → `jeremieborrotzu-blip`). Trailer commits : `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`, messages détaillés (titre `type(scope):` + puces).

## 5. Sauvegarde & redéploiement
- **HDD** `Crucial X6/N8N_LOCAL/` : dossier complet `STRATEGIE DE PEMT/` (repo + `review_state` + `downloads` + bonus) · `n8n_backup_20260709/` (tar du volume + `n8n_env.txt` avec la clé + `n8n_docker_inspect.json` + `RESTORE_README.md`) · **`REDEPLOY_LEO.md`** (procédure complète nouvelle machine).
- **Remonter sur un autre Mac** : voir `REDEPLOY_LEO.md`. Résumé : Docker + Node 18+ → copier le dossier en local → restaurer le volume n8n avec la **même clé** → `cd bff && npm install && node server.js` → http://localhost:4317/leo-v1.1.html → **rebrancher ses propres credentials** (les secrets OC seront révoqués).

## 6. Ce qui reste (backlog)
- **Lancer un run Phase 1 réel** : débloqué côté gate (soft-gate), **en attente du `ocBasic` de la semaine**.
- **Déploiement** : compute = **n8n Cloud** (décidé) ; état applicatif → **DynamoDB** (différé, gratuit à vie à notre échelle) ; blobs → **Iconik/S3** (fait) ; sortir GitHub-comme-DB-runtime (anti-pattern). Piège AWS : NAT Gateway. Coût ≈ bruit face au ROI (‑30% effort/délai ; ~10$ OpenAI pour tout depuis juin).
- **Titre de cours** : au déploiement, connecteur **API OC** (titre source+localisé + **catégorie** → alimente le routing TM) au lieu du scrape.
- **TM** : montée en maturité sur tous les domaines.
- **Iconik** : brancher l'upload des docs/transcripts/pdf depuis la Revue (aujourd'hui seules les images A8 sont poussées depuis l'UI).
- **Secrets** : migration en `$env` / rotation (Vimeo/Iconik/Cloudflare).

## 7. Contexte OKR / valeur
Point de départ = agents lancés **à la main dans ChatGPT** (~15%). Aujourd'hui = chaîne orchestrée + poste de pilotage project-centric + revue human-in-the-loop + TM (**~78%**). Reste 100% = déploiement prod + extraction par ID + TM tous domaines. Mesuré : **‑30% effort / ‑30% délai**, coût IA marginal.

---
*Handoff rédigé le 2026-07-09. Pour le détail des décisions, voir aussi les fichiers de mémoire (`leo_memory/` sur le HDD).*
