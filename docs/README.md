# CLS v3 — Documentation

**Content Localization System v3** — Pipeline agentique de localisation FR↔EN des cours OpenClassrooms, orchestré dans n8n.

---

## Architecture générale

```
[Formulaire / Webapp]
        ↓
[MAIN CLS v3] ──────────────────────────────────────────────────────────┐
        ↓                                                               │
[SUB] HTML Extraction (OC API)                                          │
        ↓                                                               │
[SUB] Pre-Processor (split + chunking)                                  │
        ↓                                                               │
━━━━━━━━━━━━━ PHASE 1 — HTML (source de vérité) ━━━━━━━━━━━━━━━━━━━━━  │
        ↓                                                               │
[AGENT A1] Source Analyst       — Audit forensic 6 piliers             │
        ↓                                                               │
[AGENT A2] Terminology Architect — Glossaire unifié                     │
        ↓                                                               │
[Pre-Translation]               — 1ère passe brute (reasoning)         │
        ↓                                                               │
[AGENT A3] MTPE Specialist      — Post-édition Gold Master             │
        ↓                                                               │
[AGENT A4] Cultural Adapter     — Concept Swap culturel                │
        ↓                                                               │
[AGENT A5] Quality Gatekeeper   — Score QA + boucle (max 3 iter)      │
        ↓  ↑ REVISE → retour A3 (segments défaillants uniquement)      │
[Buffer for A6] join barrier    — attend les N chunks avant A6        │
        ↓                                                               │
[AGENT A6] Final Proofreader    — Relecture en isolation               │
        ↓                                                               │
[SUB] Reassembler + Validator   — Réassemblage + 7 checks HTML        │
        ↓                                                               │
━━━━━━━━━━━━━ PHASE 2 — Assets (alignés sur HTML validé) ━━━━━━━━━━━━  │
        ↓                                                               │
[Documents annexes / Images / Liens] — contexte = HTML Phase 1        │
        ↓                                                               │
[SUB] Deliver Output            — 8 fichiers GitHub + email liens      │
                                                                        │
[AGENT A7] AV & Caption         — SRT/VTT (hors scope pilote) ────────┘
```

---

## Principe fondamental

> **Le HTML est la source de vérité absolue.**
> Tous les assets (documents, images, liens) s'alignent sur lui — jamais l'inverse.
> Phase 2 ne démarre que si Phase 1 est validée (score ≥ 90).

---

## Modèles et coûts

| Étape | Modèle | Mode | Coût indicatif |
|---|---|---|---|
| Pré-traduction | gpt-5.5-pro-2026-04-23 | Batch API (−50%) | estimé |
| Agents A1→A6 | gpt-5.5-pro-2026-04-23 | Batch API (−50%) | ~$11 / partie |
| **Total / partie** | | | **~$13.52** |

Livraison : Batch API OpenAI → résultats sous 24h.

---

## Index de la documentation

### Agents
- [A1 — Source Analyst](agents/A1_source_analyst.md)
- [A2 — Terminology Architect](agents/A2_terminology_architect.md)
- [A3 — MTPE Specialist](agents/A3_mtpe_specialist.md)
- [A4 — Cultural Adapter](agents/A4_cultural_adapter.md)
- [A5 — Quality Gatekeeper](agents/A5_quality_gatekeeper.md)
- [A6 — Final Proofreader](agents/A6_final_proofreader.md)
- [A7 — AV & Caption Specialist](agents/A7_av_caption.md) *(hors scope pilote)*
- [Pre-Translation](agents/pretranslation.md)

### Architecture
- [Vue d'ensemble du pipeline](architecture/pipeline_overview.md)
- [Ordre de traitement et hiérarchie](architecture/processing_order.md)
- [Stratégie de chunking](architecture/chunking_strategy.md)
- [QA Join (A5→A6), réassemblage & livraison](architecture/qa_join_and_delivery.md)
- [LEO v1 — Assets (Phase 2) : handoff, dispatcher, A7–A10](architecture/assets_pipeline.md)

### Workflows n8n
- *(à compléter lors de la construction)*

---

## Statut des prompts

| Agent | Prompt | Statut |
|---|---|---|
| A1 | `01_prompts/` | ✅ Existant |
| A2 | `01_prompts/` | ✅ Existant |
| A3 FR→EN | `01_prompts/` | ✅ Existant |
| A3 EN→FR | `01_prompts/` | ✅ Existant |
| A4 | `01_prompts/a4_cultural_adapter_system.txt` | ✅ v1 rédigé |
| A5 | `01_prompts/` | ✅ Existant |
| A6 | `01_prompts/a6_final_proofreader_system.txt` | ✅ v1 rédigé |
| A7 | `01_prompts/` | ✅ Existant |
