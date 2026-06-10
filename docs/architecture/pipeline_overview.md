# Vue d'ensemble du pipeline CLS v3

**Version :** 3.0.0 | **Orchestrateur :** n8n (self-hosted, local) | **Modèles :** GPT-5.5-pro (tous agents) | **Mode :** Batch API (livraison J+1)

---

## Principes directeurs

| Principe | Décision |
|---|---|
| Qualité > Coût > Vitesse | Batch API : −50% coût, livraison sous 24h |
| Séparation des responsabilités | 7 agents distincts — un rôle, un agent (ADR-001) |
| HTML = source de vérité | Phase 1 complète avant tout traitement d'asset |
| Boucle bornée | Max 3 itérations QA par chapitre → escalade humaine |
| Prompts versionnés | YAML dans Git — modifiables par linguistes sans toucher n8n |

---

## Les 8 composants actifs (pilote)

| Composant | Type | Modèle | Rôle |
|---|---|---|---|
| Pre-Translation | SUB workflow | gpt-5.5-pro Batch | 1ère passe de traduction brute |
| A1 Source Analyst | Agent SUB | gpt-5.5-pro Batch | Audit forensic 6 piliers avant traduction |
| A2 Terminology Architect | Agent SUB | gpt-5.5-pro Batch | Glossaire unifié (3 sources fusionnées) |
| A3 MTPE Specialist | Agent SUB | gpt-5.5-pro Batch | Post-édition → Gold Master |
| A4 Cultural Adapter | Agent SUB | gpt-5.5-pro Batch | Concept Swap culturel (swap libraries par domaine) |
| A5 Quality Gatekeeper | Agent SUB | gpt-5.5-pro Batch | Score QA /100 + boucle ≤ 3 iter |
| A6 Final Proofreader | Agent SUB | gpt-5.5-pro Batch | Relecture en isolation — naturalité |
| SUB Glossary Loader | SUB workflow | — | Charge CSV domaine + common_glossary depuis GitHub |

**Hors scope pilote :** A7 AV & Caption (dépend Vimeo non connecté)

---

## Infrastructure n8n

| SUB | Rôle | Credential requise |
|---|---|---|
| HTML Course Extraction | Appel OC API → HTML brut | OC API (OAuth2 — renouveler chaque semaine) |
| Pre-Processor | Split chunks, détection seuil 12k tokens | — |
| Batch Submitter | Soumet JSONL à OpenAI Batch API | OpenAI API Key |
| Batch Poller | Polling statut + récupération résultats | OpenAI API Key |
| Reassembler + Validator | Réassemblage + 7 checks structurels | — |
| Glossary Loader | Lecture CSV depuis GitHub | GitHub API |
| Deliver Output | Push 8 fichiers GitHub (nœuds GitHub natifs) | GitHub API |

---

## Flux de données simplifié

```
INPUT  : course_id (source) + course_id (cible) + direction (fr>en / en>fr)
         + cases à cocher (modules actifs)

PHASE 1 (HTML) :
  HTML brut → [Pre-Processor] → chunks
  chunks → [A1] audit → [A2] glossaire
  chunks → [Pre-Translation] pré-trad → [A3] Gold Master → [A4] adapté culturellement
         → [A5] QA (boucle) → [Buffer for A6] join → [A6] relu → [Reassembler] HTML validé

PHASE 2 (Assets) :
  HTML validé + glossaire A2 + log A4 → [Agents annexes] documents/images/liens

OUTPUT (8 fichiers GitHub, push via nœuds GitHub natifs) :
  - HTML localisé (.html)
  - Review (.md, import Notion) + rapport QA (.md)
  - Decision log (.json) + TM patch (.csv)
  - 3× ToDo Phase 2 (.csv : graphics / links / videos)
  - Notification email HTML avec les liens GitHub (pas de pièce jointe)
```

---

## Coût estimé (Batch API)

| Scope | Coût | Délai |
|---|---|---|
| 1 partie (6 chapitres) | ~$13.52 | < 24h |
| Cours complet (15 chapitres) | ~$29.70 | < 24h |

*Tous les agents : `gpt-5.5-pro-2026-04-23` (reasoning, temperature omise). Prix batch = estimation à confirmer sur platform.openai.com*

---

## Escalades et cas limites

| Situation | Comportement |
|---|---|
| Score A5 < 90 après 3 iter | Flag `escalation: true` — notification humaine |
| Structural integrity check fail | Bloqué avant livraison — flag `structural_integrity: false` |
| Chunk seam incohérence | A6 mode `seam_check` — flag dans issue_log |
| Lien gouvernemental à mettre à jour | Flag `human_review_required` dans decision log A4 |
