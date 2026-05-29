# Vue d'ensemble du pipeline CLS v3

**Version :** 3.0.0 | **Orchestrateur :** n8n (self-hosted, local) | **Modèles :** GPT-4o + GPT-5.4 | **Mode :** Batch API (livraison J+1)

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
| GPT-4o Pre-Translation | SUB workflow | GPT-4o Batch | 1ère passe de traduction brute |
| A1 Source Analyst | Agent SUB | GPT-5.4 Batch | Audit forensic 6 piliers avant traduction |
| A2 Terminology Architect | Agent SUB | GPT-5.4 Batch | Glossaire unifié (3 sources fusionnées) |
| A3 MTPE Specialist | Agent SUB | GPT-5.4 Batch | Post-édition → Gold Master |
| A4 Cultural Adapter | Agent SUB | GPT-5.4 Batch | Concept Swap culturel (swap libraries par domaine) |
| A5 Quality Gatekeeper | Agent SUB | GPT-5.4 Batch | Score QA /100 + boucle ≤ 3 iter |
| A6 Final Proofreader | Agent SUB | GPT-5.4 Batch | Relecture en isolation — naturalité |
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
| Deliver Output | Push ZIP GitHub + création GDoc | GitHub API + Google Docs OAuth2 |

---

## Flux de données simplifié

```
INPUT  : course_id (source) + course_id (cible) + direction (fr>en / en>fr)
         + cases à cocher (modules actifs)

PHASE 1 (HTML) :
  HTML brut → [Pre-Processor] → chunks
  chunks → [A1] audit → [A2] glossaire
  chunks → [GPT-4o] pré-trad → [A3] Gold Master → [A4] adapté culturellement
         → [A5] QA (boucle) → [A6] relu → [Reassembler] HTML validé

PHASE 2 (Assets) :
  HTML validé + glossaire A2 + log A4 → [Agents annexes] documents/images/liens

OUTPUT :
  - HTML localisé (GitHub ZIP)
  - Google Doc (review humaine)
  - Notification email (GitHub push)
  - Score final + decision log (JSON)
```

---

## Coût estimé (Batch API)

| Scope | Coût | Délai |
|---|---|---|
| 1 partie (6 chapitres) | ~$13.52 | < 24h |
| Cours complet (15 chapitres) | ~$29.70 | < 24h |

*Prix GPT-5.4 batch = estimation $5/$20 par Mtok — à confirmer sur platform.openai.com*

---

## Escalades et cas limites

| Situation | Comportement |
|---|---|
| Score A5 < 90 après 3 iter | Flag `escalation: true` — notification humaine |
| Structural integrity check fail | Bloqué avant livraison — flag `structural_integrity: false` |
| Chunk seam incohérence | A6 mode `seam_check` — flag dans issue_log |
| Lien gouvernemental à mettre à jour | Flag `human_review_required` dans decision log A4 |
