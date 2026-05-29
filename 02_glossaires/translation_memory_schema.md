# Translation Memory (TM) — Schema & Rules

Mémoire de traduction persistante par domaine. Capitalisée automatiquement après chaque run CLS.
**Ne jamais supprimer d'entrées** — la TM est un actif cumulatif qui grandit avec chaque cours traité.

## Fichiers

- `Tech.csv` — Software, DevOps, MLOps, Cloud, Programming
- `Data.csv` — Data Science, Analytics, BI, Statistics
- `Business.csv` — Management, Marketing, Finance, Entrepreneurship
- `Career.csv` — Job search, HR, Professional development
- `Soft_Skills.csv` — Communication, Leadership, Productivity

## Colonnes

| Colonne | Description |
|---|---|
| source_term | Terme original (langue source) |
| target_term | Traduction validée (langue cible) |
| direction | `fr>en` ou `en>fr` |
| domain | Tech / Data / Business / Career / Soft_Skills |
| category | `tech` / `brand` / `pedagogy` / `admin` / `work_culture` / `ui` / `proper_noun` / `institutional` / `methodological` |
| context_note | Justification du choix, nuances |
| do_not_translate | `true` si le terme doit rester en langue source |
| validated | `true` = validé par un humain | `false` = généré par agent (en attente de review) |
| first_seen_course | ID du cours où le terme est apparu pour la première fois |
| last_updated | Date ISO YYYY-MM-DD |

## Règles

- **1 terme source → 1 terme cible** (sauf justification dans context_note)
- **Pas de suppression** — mettre à jour si décision change, ne jamais effacer
- **Pas de doublon** — si le terme existe, mettre à jour plutôt qu'ajouter une ligne
- **Priorité des sources (ordre décroissant) :**
  1. `common_glossary.xlsx` — autorité absolue, jamais contredite
  2. TM domaine avec `validated: true` — décision humaine actée
  3. TM domaine avec `validated: false` — suggestion agent, à confirmer
  4. Décision A2 en cours de run — nouvelle entrée

## Utilisation dans le pipeline

**Au démarrage d'un run (SUB Glossary Loader) :**
1. Charge `common_glossary.xlsx` (autorité max)
2. Charge le CSV du domaine du cours
3. Les termes `validated: true` s'imposent à A2 sans re-décision
4. Les termes `validated: false` sont soumis à A2 pour confirmation

**En fin de run (SUB Deliver Output) :**
1. Pousse les `domain_tm_patch[]` générés par A2 et A4
2. Merge avec le CSV existant (update si existe, append si nouveau)
3. Commit sur GitHub avec le message : `tm: update [domain] TM after run [course_id]`
