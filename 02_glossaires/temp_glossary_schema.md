# Temp Glossary — Schema & Rules

One CSV file per domain. Updated automatically by the CLS Agent after each PEMT run via n8n GitHub node.

## Files
- `Tech.csv` — Software, DevOps, MLOps, Cloud, Programming
- `Data.csv` — Data Science, Analytics, BI, Statistics
- `Business.csv` — Management, Marketing, Finance, Entrepreneurship
- `Career.csv` — Job search, HR, Professional development
- `Soft_Skills.csv` — Communication, Leadership, Productivity

## Columns

| Column | Description |
|---|---|
| source_term | Original term in source language |
| target_term | Validated translation in target language |
| direction | `fr>en` or `en>fr` |
| domain | Tech / Data / Business / Career / Soft_Skills |
| category | `tech` / `brand` / `pedagogy` / `admin` / `work_culture` / `ui` / `proper_noun` |
| context_note | Why this choice was made, any nuance |
| do_not_translate | `true` if term must stay in source language |
| validated | `true` if human-reviewed, `false` if agent-generated |
| first_seen_course | Course ID where term first appeared (XXXXXXX_name) |
| last_updated | ISO date YYYY-MM-DD |

## Rules
- 1 source term → 1 target term (unless justified in context_note)
- No duplicates: if term exists, update rather than add new row
- Agent patches are `validated: false` until human review
- Common glossary always takes priority over domain glossary
