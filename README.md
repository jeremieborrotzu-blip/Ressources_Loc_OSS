# Ressources_Loc_OSS
**Strategic Library — OpenClassrooms Automated Localization**

This repository is the living knowledge base for the OC automated localization pipeline (n8n + GPT-4o + GPT thinking).
All resources here are read and written by the pipeline agents via GitHub API.

---

## Architecture

```
INPUT (Course ID + HTML MASTER + SRT files)
        │
        ▼
STEP 1 — Raw Translation
  GPT-4o ← common_glossary + domain_glossary[domain]
  → raw translated HTML (fast, cheap, glossary-enforced)
        │
        ▼
STEP 2 — PEMT (Post-Edit Machine Translation)
  GPT thinking / CLS Agent ← common_glossary + domain_glossary + temp_glossary + style guides
  → revised HTML + Decision Log XLSX + temp_glossary_patch
  → loop until score ≥ 90/100 (6-pillar audit)
        │
        ├──► STEP 3 — SRT Translation (if provided)
        │     GPT-4o → raw SRT
        │     GPT thinking [SRT mode] ← Decision Log HTML (AUTHORITY)
        │     → revised SRT aligned with HTML choices
        │
        ▼
STEP 4 — Git Push (n8n GitHub node)
  → outputs saved in 07_runs/XXXXXXX_name/
  → domain glossary CSV updated with validated terms
        │
        ▼
STEP 5 — Delivery (email / notification)
```

---

## Folder Structure

| Folder | Content |
|---|---|
| `01_prompts/` | System prompt + user templates for CLS Agent (HTML & SRT modes) |
| `02_glossaires/` | Common glossary (authority) + domain glossaries (auto-enriched) |
| `03_style_guides/` | OC style guides FR & EN (PDF) |
| `04_n8n_flows/` | Main orchestrator + all sub-workflows (JSON exports) |
| `05_qa_tools/` | Human review log, post-editing checklist, QA notation grid |
| `06_specs/` | CLS Agent full specification (Notion-ready) |
| `07_runs/` | Course outputs (HTML, SRT, Decision Log XLSX, temp glossary) |

---

## Glossary Priority (read order for agents)

1. `02_glossaires/common_glossary.xlsx` — never modified by agents
2. `02_glossaires/temp_glossary/[Domain].csv` — auto-enriched by pipeline
3. Course-level `temp_glossary_XXXXXXX.csv` in `07_runs/` — current run context

---

## Scoring (CLS Agent — 6 pillars)

| Pillar | Weight |
|---|---|
| Technical Integrity | 15 |
| Pedagogical Tone | 15 |
| Terminology & Brand | 15 |
| Cultural Portability | 25 |
| Media & Resources | 15 |
| AV / Dubbing | 15 |
| **Pass threshold** | **≥ 90 / 100** |

---

## Course Run Naming
`XXXXXXX_name` — 7-digit OC course ID + course slug.
Example: `8431846_Maitriser_apprentissage_supervise`
