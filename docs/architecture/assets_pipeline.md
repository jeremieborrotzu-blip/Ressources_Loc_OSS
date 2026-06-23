# LEO v1 — Assets (Phase 2)

> Pipeline de localisation des **assets** d'un cours OC : images, annexes (XLSX/DOCX/
> PPTX/CSV), transcripts vidéo, et liens externes. Déclenché **après** la Phase 1 (HTML),
> via un **2ᵉ formulaire**, et aligné sur le HTML Gold Master validé.

---

## 1. Nom & périmètre

**LEO v1 — Assets** (« Assets » : terme unique, sans ambiguïté avec *editing*, englobant
images + annexes + liens + transcripts). Nom interne du workflow : `[MAIN] CLS v3 — Media
& Annexes` (`iTIkatL9FJ57zLLd`) — à renommer « Assets » à la prochaine modif (sans changer l'ID).

4 agents :
| Agent | Rôle | Modèle | Mode |
|---|---|---|---|
| **A7** Dubbing Transcript Adapter | Adapte les transcripts timés (SRT/VTT) pour le dubbing IA (Rask/HeyGen/ElevenLabs) | gpt-5.5-pro (Batch) | texte timé |
| **A8** Image Localizer | Détecte, triage et **édite** le texte des images (vision + gpt-image-2) | vision + gpt-image-2 | synchrone |
| **A9** Annexes Localizer | Localise XLSX/DOCX/PPTX/CSV en préservant structure/formules | gpt-5.5-pro (Batch) | map / génération |
| **A10** Links Resolver | Résout les liens externes (switch même-source / équivalent cible / preserve) | gpt-5.5-pro (Batch) | + recherche web |

Prompts système (V2) : `01_prompts/a7_dubbing_transcript_adapter_system.md`,
`a8_image_localizer_system.md`, `a9_annexes_localizer_system.md`, `a10_links_resolver_system.md`.

---

## 2. Contrat d'interface P1 → Assets : `phase1_handoff.json`

Produit en fin de Phase 1, poussé dans `07_runs/{source}/output/{target}_phase1_handoff.json`.
C'est le **contexte canonique** que tout agent Assets charge pour rester cohérent avec le HTML.

```json
{
  "meta": { "source_course_id","target_course_id","source_language","target_language",
            "direction","detected_domain","phase1_qa_score" },
  "gold_master": { "html_path","html_url" },
  "glossary": { "common", "domain_tm", "run_terms" },     // termes validés
  "concept_swaps": [ ... ],   // A4 swap_log (SIRET→EIN, RTT→PTO...)
  "cultural_flags": [ ... ],  // A1
  "media_inventory": [ {"type","url","location":"chN","risk"} ],  // A1 — LE DISPATCHER
  "qa": { "a5_scores","a6_issues","structural_checks" }
}
```

### Le `media_inventory` = dispatcher de la Phase 2
| `type` | → agent |
|---|---|
| `image` | A8 |
| `pdf` / `docx` / `xlsx` / `pptx` | A9 |
| `video` / `screencast` | A7 |
| `link` | A10 |

> Le `risk` (`ui_mismatch` / `fr_only` / `ok`) affine le routage des images : à localiser vs à préserver.

---

## 3. Lancement & hiérarchie

- **2 formulaires distincts** (Phase 1 / Assets), même triplet d'IDs (`source` + `target` + direction).
- **Gate de dépendances** : tout flow Assets exige que `{target}_phase1_handoff.json` + le HTML existent sur GitHub → sinon email d'erreur (« lance d'abord la Phase 1 »).
- **Ordre** : A8/A9/A7 en parallèle (après le handoff) ; **A10 en dernier** (agrège les liens du HTML + annexes + images + captions ; A9 lui délègue ses liens via `link_items_for_A10`).

---

## 4. A8 — Image Localizer (dérisqué 2026-06-11)

### Architecture (synchrone, 4 étapes par image)
```
media_inventory (images, hors banners) + HTML Gold Master + glossary + swaps
   1. Download (URL complète user.oc-static.com)
   2. ANALYSE vision → détecte texte, triage, aligne HTML/glossaire → traductions exactes + termes à préserver
   3. ÉDITION gpt-image-2 (/v1/images/edits) avec prompt PIXEL-PERFECT explicite
   4. VÉRIF re-OCR de l'image éditée + comparaison aux traductions → flag si écart
→ push image localisée (GitHub/Iconik) + rapport A8 JSON
```

### Règles métier
- **Bannières exclues** (nom de fichier « banner » / « OC-Course-Banners »).
- **Screenshots UI réels → preserve** (l'édition les falsifierait). Seuls diagrammes / infographies / tableaux sont édités.
- **Identifiants techniques préservés** dans l'image (noms de machines, acronymes, RFC, code, Diffie-Hellman…).

### Résultats du dérisquage (`06_specs/research/a8_pixel_test/`)
- ✅ Édition d'un **tableau réel** (IKEv1/IKEv2) : layout **quasi pixel-perfect**, texte traduit, **tous les termes techniques préservés**.
- ⚠️ L'API `/images/edits` **régénère** (≠ inpainting du ChatGPT web) → léger drift possible ; et un faux-ami a échappé (« acquittements » → « acquittals ») **malgré** la traduction exacte fournie → d'où la **vérification post-édition** obligatoire (étape 4).
- ⚙️ `input_fidelity` non supporté par gpt-image-2.

### Accès aux images
URLs `user.oc-static.com` accessibles **en direct** avec l'URL **complète** (timestamp **+ nom de fichier**). Backup : OC Asset Extractor (`XtF1ec3MgRLNDqBz`, ZIP de tous les assets).

---

## 5. Coûts (réels)

| Poste | Coût |
|---|---|
| A8 — par image (analyse + édition + vérif) | ~$0.10 |
| A8 — par cours (~15 images, ~50 % éditées) | ~$1.5 |

→ Les assets pèsent **~10 %** du coût d'un cours ; le texte (Phase 1, ~$5/partie) domine.
Détail : [pricing gpt-image mesuré sur tokens réels](../../06_specs/research/a8_pixel_test/README.md).

---

## 6. Le MAIN Assets (construit de zéro)

Workflow **`[MAIN] LEO v1 — Assets`** (id `iOvLCwyOv8ReIxbG`, actif), construit de zéro
(ne réutilise PAS l'ancien MAIN Media & Annexes).

- **Form** : `http://localhost:5678/form/leo-assets`
- **Input = TARGET ID** uniquement (+ email + 4 cases A7/A8/A9/A10)
- **Gate Phase 1** : depuis le seul target id, retrouve le HTML via **GitHub Trees API**
  (`git/trees/main?recursive=1` → regex `07_runs/(\d+)/output/{target}_localized_(.+)\.html$`)
  → en déduit `source_id`, `direction`, `html_url`, `handoff_url`. Si absent → email d'erreur.
- **Règle** : A7/A8/A9/A10 ne tournent **que si le HTML Phase 1 existe** sur GitHub.

> Pièges de création de workflow via l'API n8n (rencontrés) : `/activate` exige
> `Content-Type: application/json` ; un `formTrigger` créé par API n'a pas de `webhookId`
> (en ajouter un UUID) ; le form reste 404 jusqu'à un **restart Docker** (registre webhook
> in-memory désynchronisé) — checkpointer le WAL **avant** le restart.

## 7. Upload Iconik (séquence S3 vérifiée)

Les médias localisés vont dans **Iconik** (MAM), structurés par target id (voir §1).
Auth : header `App-ID: ***REMOVED***` + `Auth-Token`. Storage
FILES : `iconik-files-s3` (id `***REMOVED***`, bucket
`oc-multimedia-iconik`, eu-west-3).

Séquence d'upload (réf : ancien SUB « Copy videos to iconik », `04_n8n_flows/reference_legacy/`) :
```
1. POST /API/assets/v1/assets?assign_to_collection=true   {title, collection_id, type:ASSET, status:ACTIVE}
2. GET  /API/files/v1/storages/matching/FILES/            → storage (OBJET unique, pas liste)
3. POST /API/files/v1/assets/{id}/formats/                {name:ORIGINAL, metadata:[{internet_media_type}], storage_methods:[S3]}
4. POST /API/files/v1/assets/{id}/file_sets/              {format_id, storage_id, base_dir:/, name}
5. POST /API/files/v1/assets/{id}/files/                  {size, original_name, type:FILE, format_id, file_set_id, storage_id, multipart_upload_url:false}  → upload_url (presigned S3)
6. PUT  {upload_url}   (binaire direct, S3 — pas de header App-ID)
7. PATCH /API/files/v1/assets/{id}/files/{file_id}/       {status:CLOSED, progress_processed:100}
```
> S3 = **1 seul PUT presigned** (plus simple que GCS). mime par agent : A8 `image/png`,
> A7 `application/x-subrip`, A9 selon type.

**SUB réutilisable construit & validé** : `[SUB] LEO Assets — Iconik Upload`
(id `1rNi2FfRGRbZ3uBI`). Inputs : `binary.data` + `json{filename, mime, collection_id}`.
Testé e2e (image 1,2 MB → `CLOSED` dans Iconik).
> ⚠️ `Compute Filesize` gère **les deux types de binaires** : téléchargé (`binary.data.bytes`,
> exact) ou inline base64 (`Buffer.from(binary.data.data,'base64').length`, ex. sortie
> gpt-image qui n'a pas `.bytes`). Sinon → `size` invalide sur Create Upload URL.

## 8. A8 Image Localizer — SUB construit & validé end-to-end

`[SUB] LEO Assets — A8 Image Localizer` (id `Vayz4SnsngHkqWvl`, 14 nodes). **Validé sur image
réelle** (tableau IKEv1/IKEv2) : 24 textes détectés (13 traduits + 11 préservés), image
localisée 1,2 MB uploadée dans Iconik. ~67 s/image.

```
Input {image_url, filename, domain, target_language, collection_id, location}
  → Config (clé OpenAI) → Download Image
  → Build Vision Request → Vision Analyse (POST /v1/chat/completions, gpt-5.5,
       image_url direct, response_format json_object → texts[], preserve, is_banner, asset_class)
  → Parse Vision → Should Edit? (should_localize && !banner && !screenshot && a du texte à traduire)
       ├─ oui → Build Edit Prompt → Edit Image (gpt-image-2 /images/edits, multipart)
       │        → Decode Image (b64→binaire) → Prepare Upload → Call SUB Upload → static_graphics/
       └─ non → Preserve (status:preserved, raison)
  → Return {agent:A8, status, texts_localized/preserved, iconik_asset_id}
```

> ⚠️ **Secrets** : la clé OpenAI est en dur dans le node `Config` (à migrer en credential n8n).
> Les exports Git **doivent masquer `sk-proj-*`** (GitHub push protection les bloque).

## 9. Fix DNS Docker (durable)

Après `docker restart`, le container n8n peut avoir `EAI_AGAIN` sur `app.iconik.io`
(cache négatif transitoire du resolver Docker). **Fix durable** : Docker Desktop →
Settings → **Docker Engine** → ajouter `"dns": ["8.8.8.8", "1.1.1.1"]` → Apply & Restart.
(Éditer `~/.docker/daemon.json` directement ne tient pas : Docker Desktop le réécrit.)
Workaround ponctuel : `docker exec --user root n8n sh -c "echo '<ip> app.iconik.io' >> /etc/hosts"` (non persistant).

## 10. État de construction (2026-06-12)

| Élément | État |
|---|---|
| MAIN Assets (form + gate Phase 1) | ✅ construit, actif (`iOvLCwyOv8ReIxbG`, 16 nodes) |
| Auth Iconik (App-ID corrigé) + storage FILES | ✅ vérifiés |
| **SUB Iconik Upload** (séquence S3) | ✅ **construit & validé e2e** (`1rNi2FfRGRbZ3uBI`) |
| **SUB A8 Image Localizer** (vision+édition+upload) | ✅ **validé e2e** (`Vayz4SnsngHkqWvl`) |
| **Branchement A8 dans le MAIN** (mode each + gate case) | ✅ **validé e2e via le form** (run 9446 : 2 localisées + 1 préservée) |
| **Branchement A7/A9/A10 (inventaire MVP)** | ✅ rapport par module, gated par case (run 9453) |
| **A10 Links Resolver — SUB construit + PLUGUÉ + validé e2e** | ✅ `qTMzikhSEmYAVZJ0` (2026-06-22, run #9570) — résout les liens (switch même-source / manual review), **rapport dans l'email** + **CSV poussé** sur `07_runs/{source}/output/{target}_links_report.csv`. Cerveau : `gpt-5.5` sync, prompt chargé depuis GitHub raw. |
| **A9 Annexes Localizer — SUB construit + PLUGUÉ + validé e2e** | ✅ `MNQpFIaYglzO0p0r` (2026-06-23, run #9579) — localise XLSX/DOCX/PPTX/CSV en **miroir** via `jszip` (remplace uniquement le texte des runs `<t>`/`<w:t>`/`<a:t>` → format/formules/liens/structure préservés), traduit via `gpt-5.5` + prompt A9, **upload Iconik** `external_files`. PDF → flag manual. Validé XLSX réel (230 segments, asset Iconik créé). |
| **A7 Dubbing Transcript Adapter — SUB construit + PLUGUÉ + validé e2e** | ✅ `e8IsiWnTdg9NZhee` (2026-06-23, run #9584) — récupère le transcript (Vimeo texttracks **ou** URL SRT/VTT directe), l'adapte **cue par cue pour le doublage IA** (`gpt-5.5` + prompt V2, timecodes préservés, parité de volume oral), réassemble SRT/VTT, **upload Iconik** `transcripts`. TTS = externe (Rask/HeyGen). Validé SRT réel (4 cues). |

> **🏁 Phase 2 « Assets » : les 4 agents (A7/A8/A9/A10) sont branchés dans le MAIN et validés e2e via le form (2026-06-23).** Ordre : Iconik Init → A8/A9/A7 (gated par case) → A10 (dernier, agrège) → rapport email. Restent des raffinements : migration des secrets en credentials n8n, A8 batch, build du Phase 1 handoff auto.
| Migration secrets (OpenAI/Iconik/Vimeo) → credentials n8n | 🔜 propreté |
| Build Phase 1 Handoff auto en fin de P1 | 🔜 (dépend refactor lot-synchrone Phase 1) |

### Soumission du form Assets (multipart)
Le form trigger n8n attend du **`multipart/form-data`** ; les champs sont nommés par **index** et les cases à cocher attendent une **valeur JSON** :

| Champ | Nom wire | Valeur cochée |
|---|---|---|
| Target Course ID | `field-0` | `8970456` |
| Email | `field-1` | `mail@…` |
| Transcripts/Dubbing (A7) | `field-2` | `[""]` |
| Images (A8) | `field-3` | `[""]` |
| Annexes (A9) | `field-4` | `[""]` |
| Liens (A10) | `field-5` | `[""]` |

```bash
curl -X POST http://localhost:5678/form/leo-assets \
  -F 'field-0=8970456' -F 'field-1=mail@oc.com' -F 'field-3=[""]'   # A8 seul
```
Erreurs typiques si mal formé : `Expected multipart/form-data`, `… is not valid JSON`, ou HTTP 500 *"Workflow could not be started!"*.

### Pièges résolus (2026-06-12)
- **`Parse Handoff`** : le handoff GitHub arrive en string dans `.data` → `JSON.parse($('Load Handoff').first().json.data)`.
- **`Call A8` mode `each`** : sans ça, les N images partent en 1 sous-exécution et A8 (`.first()`) n'en traite qu'1.
- **`Build A8 Items`** gate sur `modules.a8` (sinon A8 tourne même décoché).
- **"Create Upload URL : JSON parameter needs to be valid JSON"** = exécutions périmées (avant le save du fix `Compute Filesize` base64-fallback). Fix bien live.
