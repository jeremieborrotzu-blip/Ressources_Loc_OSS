# Ressources_Loc_OSS
**Strategic Library — OpenClassrooms Automated Localization (CLS v3)**

Dépôt central du pipeline de localisation automatisée OC. Toutes les ressources sont lues et écrites par les agents via l'API GitHub. Orchestration n8n self-hosted.

---

## Architecture CLS v3

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

### Phase 2 — Media & Annexes

> Déclenché uniquement après Phase 1 ≥ 90/100

```
A7 Caption Localizer ──── SRT/VTT Vimeo
A8 Image Localizer ─────── Vision + édition images *(à construire)*
A9 Annexes Localizer ───── XLSX / DOCX / PPTX / CSV *(à construire)*
A10 Links Resolver ─────── Résolution des liens externes FR→EN *(à construire)*
        │
        ▼
Iconik ─────────────────── Stockage assets localisés
```

---

## Modèles IA

| Composant | Modèle | Type | Temperature |
|---|---|---|---|
| Pre-Translation → A7 | `gpt-5.5-pro-2026-04-23` | Reasoning | — (omise) |
| A8 → A10 *(à venir)* | `gpt-5.5-pro-2026-04-23` | Reasoning | — |

> Les modèles reasoning (`-pro`) n'acceptent pas de valeur `temperature` personnalisée.
> Voir [`docs/openai_reasoning_models_temperature.md`](docs/openai_reasoning_models_temperature.md)

---

## Modes du formulaire

| Mode | Agents exécutés | Livraison |
|---|---|---|
| **Audit A1** | Pre-Translation + A1 | Rapport audit par email |
| **Score de localisabilité** | Pre-Translation + A1 + A2 | Score /100 par email |
| **Quality Check** | Pre-Translation + A1–A5 | Rapport QA par email |
| **Localisation complète** | Pre-Translation + A1–A6 + Reassembler | HTML pushé sur GitHub |

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

## Nommage des runs

`07_runs/{course_id}/` — ID OC à 7 chiffres.
Exemple : `07_runs/8787276/`

Sous-dossier `scratch/` : fichiers JSONL batch intermédiaires (archivage des appels OpenAI).
