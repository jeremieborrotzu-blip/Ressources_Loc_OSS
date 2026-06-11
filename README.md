# Ressources_Loc_OSS — LEO v1
**LEO v1 — « Localization Engine Operator »**
*OpenClassrooms Automated Localization*

Dépôt central du pipeline de localisation automatisée OC. Toutes les ressources sont lues et écrites par les agents via l'API GitHub. Orchestration n8n self-hosted.

> **Noms :** **LEO v1** = nom produit de l'outil. **CLS v3** (Content Localization System v3) = nom technique interne du pipeline n8n (workflows, exports). Les deux désignent le même système.
> Le pipeline a **deux phases**, lancées via **deux formulaires distincts** partageant le même triplet d'identifiants (`source_course_id` + `target_course_id` + direction) :
> 1. **Phase 1 — HTML** (texte du cours)
> 2. **LEO v1 — Assets** (images, annexes, liens, transcripts) — déclenchée après validation de la Phase 1

---

## Architecture

### Phase 1 — HTML Pipeline

```
Formulaire n8n (Course ID + options)
        │
        ▼
OC HTML Extractor ─── API OC staging (OAuth2 + Cloudflare Access)
        │
        ▼
Pre-Processor ──────── Découpage en chapitres/chunks
        │
        ▼
Glossary Loader ─────── common_glossary + TM de domaine (GitHub)
        │
        ▼
Pre-Translation ────────── Draft brut (reasoning, glossaire enforced)
        │
        ▼
A1 Source Analyst ──────── Audit culturel + structural du HTML source
        │
        ▼
A2 Terminology Architect ── Glossaire de traduction + décisions terminologiques
        │
        ▼
A3 MTPE (FR→EN | EN→FR) ─── Post-editing du draft → gold master
        │
        ▼
A4 Cultural Adapter ────── Swaps culturels (institutions, exemples, formats)
        │
        ▼
A5 Quality Gatekeeper ─── Score /100 — boucle jusqu'à ≥ 90 (max 3 iter)
        │
        ▼
Buffer for A6 ──────────── Join barrier : attend les N chunks avant A6
        │
        ▼
A6 Final Proofreader ───── Naturalness + FOPR — relecture finale ISO 17100
        │
        ▼
Reassembler ────────────── Réassemblage HTML + 7 checks structurels
        │
        ▼
Deliver Output ─────────── Push 8 fichiers GitHub + email (liens, pas de PJ)
```

### LEO v1 — Assets (Phase 2)

> Déclenché par un **2ᵉ formulaire**, après validation de la Phase 1.
> Prérequis (vérifié par un gate) : `{target}_phase1_handoff.json` + le HTML Gold Master doivent exister sur GitHub.

Le **`phase1_handoff.json`** est le contrat d'interface P1→Assets. Son `media_inventory`
(produit par A1) agit comme **dispatcher** : chaque asset est routé vers son agent.

```
phase1_handoff.json (media_inventory = dispatcher)
        │
        ├── image           → A8 Image Localizer   (vision + édition gpt-image-2)
        ├── pdf/docx/xlsx/pptx → A9 Annexes Localizer (XLSX/DOCX/PPTX/CSV)
        ├── video/screencast → A7 Dubbing Transcript Adapter (SRT/VTT, dubbing IA)
        └── link            → A10 Links Resolver   (résolution liens FR→EN)   [EN DERNIER : agrège]
        │
        ▼
Iconik / GitHub ─────────── Stockage assets localisés + rapports
```

**Hiérarchie imposée** : A8/A9/A7 en parallèle (après le handoff) ; **A10 en dernier** (il agrège les liens du HTML + annexes + images + captions).

**Règles métier :**
- **Les bannières ne sont pas traitées** (exclues par nom de fichier « banner »).
- **Screenshots UI réels → préservés** (pas d'édition, falsifierait l'interface). Seuls diagrammes/infographies/tableaux sont édités.
- A8 vérifie chaque image après édition (re-OCR + comparaison aux traductions attendues, flag si écart).

**Form Assets** : `http://localhost:5678/form/leo-assets` — **input = TARGET ID** (le gate retrouve le HTML Phase 1 sur GitHub depuis ce seul id). A7-A10 ne tournent que si le HTML Phase 1 existe.

**Destination des médias = Iconik** (MAM), pas GitHub. Storage S3 `iconik-files-s3` (bucket `oc-multimedia-iconik`). Structure `0000_LOCALISATION/{target}/{static_graphics | external_files | transcripts}`. GitHub ne reçoit que les rapports/logs.

État : MAIN Assets **construit** (form + gate) · **A7** prêt (prompt V2) · **A8** dérisqué (faisabilité + coût) · upload Iconik (séquence S3 vérifiée) **à brancher** · **A9/A10** à construire. Détail : [`docs/architecture/assets_pipeline.md`](docs/architecture/assets_pipeline.md).

---

## Modèles IA

| Composant | Modèle | Type | Temperature |
|---|---|---|---|
| Pre-Translation → A7, A9, A10 | `gpt-5.5-pro-2026-04-23` | Reasoning (Batch API) | — (omise) |
| A8 — analyse image | modèle vision (gpt-5.x vision) | — | — |
| A8 — édition image | `gpt-image-2` (`/v1/images/edits`, synchrone) | Image | — |

> Les modèles reasoning (`-pro`) n'acceptent pas de valeur `temperature` personnalisée.
> Voir [`docs/openai_reasoning_models_temperature.md`](docs/openai_reasoning_models_temperature.md)
> A8 tourne en **synchrone** (l'édition d'image n'a pas de Batch API). `input_fidelity` non supporté par gpt-image-2.

---

## Modes du formulaire

| Mode | Agents exécutés | Livraison |
|---|---|---|
| **Audit A1** | Pre-Translation + A1 | Rapport audit par email |
| **Score de localisabilité** | Pre-Translation + A1 + A2 | Score /100 par email |
| **Quality Check** | Pre-Translation + A1–A5 | Rapport QA des segments (avant réassemblage) par email |
| **Localisation complète** | Pre-Translation + A1–A6 + Reassembler | 8 fichiers GitHub + email (liens) |

> Note : « Quality Check » évalue la qualité de **traduction des segments** (score A5), pas le HTML final. L'**état des lieux du HTML de sortie** (7 checks structurels + métriques) est produit en localisation complète, dans `{target}_qa_report_*.md`.

---

## ⚠️ Lancement — toujours via le formulaire (mode production)

**Lancer le pipeline via l'URL du formulaire, jamais via « Execute workflow » (manuel).**

Le pipeline utilise un nœud `Buffer for A6` qui synchronise les chunks via
`$getWorkflowStaticData` — celui-ci n'est fiable **qu'en exécution de production**
(workflow actif + déclenché par formulaire/webhook). En lancement manuel, le buffer
ne peut pas accumuler les chunks → le run se bloque après A5. De plus, une exécution
manuelle dépend de l'onglet navigateur (elle meurt si on le ferme ou si le poste se met
en veille), ce qui est incompatible avec un pipeline Batch de plusieurs heures.

```
Form Phase 1 (HTML)  : http://localhost:5678/form/f146189f-507c-44da-beb7-6c888a156a3f
Form LEO Assets (P2) : http://localhost:5678/form/leo-assets   (input = TARGET ID)
```

> **2 formulaires, 2 lancements** : Phase 1 (HTML) d'abord, puis Assets après validation. Le form Assets prend le **TARGET ID** et retrouve seul le HTML Phase 1 sur GitHub (gate). Si le HTML n'existe pas → email d'erreur, rien ne tourne.

---

## Structure du dépôt

| Dossier | Contenu |
|---|---|
| `01_prompts/` | Prompts système + templates utilisateur pour chaque agent (A1–A10) |
| `02_glossaires/` | Common glossary (autorité absolue) + TM de domaine (validé / non-validé) |
| `03_style_guides/` | Guides de style OC FR & EN |
| `04_n8n_flows/` | Exports JSON de tous les workflows n8n (MAIN, agents, SUB, infra) |
| `05_qa_tools/` | Grille de notation QA, checklist post-édition, log de review humaine |
| `06_specs/` | Spécifications techniques, config routing assets, fichiers de référence |
| `07_runs/` | Sorties par cours : HTML, scratch JSONL, rapports de review |
| `docs/` | Documentation technique des composants |

---

## Documentation technique

| Document | Description |
|---|---|
| [`docs/CLS_v3_agents_overview.md`](docs/CLS_v3_agents_overview.md) | Vue d'ensemble complète des agents Phase 1 et Phase 2 |
| [`docs/architecture/assets_pipeline.md`](docs/architecture/assets_pipeline.md) | **LEO v1 — Assets** : handoff, dispatcher, A7–A10, A8 dérisqué, coûts |
| [`docs/architecture/qa_join_and_delivery.md`](docs/architecture/qa_join_and_delivery.md) | Join QA A5→A6, réassemblage propre, livraison, état des lieux HTML |
| [`docs/OC_html_extractor.md`](docs/OC_html_extractor.md) | Extracteur HTML OC — authentification, flow, structure du HTML produit |
| [`docs/OC_asset_extractor.md`](docs/OC_asset_extractor.md) | Extracteur d'assets statiques OC (outil autonome, ZIP) |
| [`docs/openai_reasoning_models_temperature.md`](docs/openai_reasoning_models_temperature.md) | Incompatibilité `temperature` sur les reasoning models — règle et fix |
| [`docs/CLS_v3_Pipeline_Guide.md`](docs/CLS_v3_Pipeline_Guide.md) | Guide opérationnel du pipeline |

---

## Priorité des glossaires (ordre de lecture par les agents)

1. `02_glossaires/common_glossary.xlsx` — autorité absolue, jamais modifié par les agents
2. TM de domaine validé (`domain_validated_tm`) — imposé
3. TM de domaine non-validé (`domain_unvalidated_tm`) — suggéré
4. Décisions A4 (`swap_log`) — maître pour le run en cours, cascade sur A5/A6/A9

---

## Seuil de qualité

**Score A5 ≥ 90 / 100** — requis pour passer à A6 et à la livraison.
**Score A5 ≥ 90 sur Phase 1** — requis pour déclencher Phase 2.

---

## Coûts (réels mesurés — 2026-06)

| Poste | Coût réel | Base |
|---|---|---|
| **Phase 1 (texte)** | **~$5 / partie** (4 chapitres) → ~$1.25/chapitre | run 8787276 |
| **A8 (images)** | **~$0.10 / image** (analyse + édition + vérif) | tokens mesurés gpt-image-2 |
| **Cours complet** (12 ch + ~15 images) | **~$16-20** | Phase 1 ~$15 + Assets ~$1.5 |

→ Enveloppe **$50 OpenAI ≈ 3 cours complets**. Le **texte domine (~90 %)** ; les images sont marginales. Batch API = −50 % sur le texte (livraison J+1, latence variable).

---

## Nommage des runs

`07_runs/{course_id}/` — ID OC à 7 chiffres (= `source_course_id`).
Exemple : `07_runs/8787276/`

- `scratch/` : fichiers JSONL batch intermédiaires (archivage des appels OpenAI).
- `output/` : livrables — `{target}_localized_{dir}.html`, `{target}_qa_report_{dir}.md`, `{target}_phase1_handoff.json`, decision log, TM patch, ToDo CSV.
