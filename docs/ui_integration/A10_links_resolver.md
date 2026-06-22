# Contrat UI — A10 Links Resolver

> Premier agent documenté pour l'UI opérateur. Lis d'abord [`README.md`](README.md) (archi + BFF).
> Ce document est **auto-suffisant** : il contient tout ce que Codex doit savoir pour construire
> l'UI + le BFF côté A10, sans accès au n8n live.

---

## 1. Ce que fait A10 (métier)

A10 est un **spécialiste d'équivalence de ressources**, pas un traducteur d'URL. Pour chaque lien
externe d'un cours localisé, il décide : **préserver**, **basculer sur la même source en langue
cible** (ex. `/fr/`→`/3/`, Wikipédia FR→EN), **remplacer par un équivalent** cible, **escalader en
revue manuelle**, ou **bloquer**. Il ne **jamais** inventer d'URL non vérifiable → ces cas partent en
revue humaine. C'est pourquoi l'UI doit offrir un **écran de revue** (human-in-the-loop).

## 2. Implémentation n8n actuelle (état réel)

- **SUB n8n** : `[SUB] LEO Assets — A10 Links Resolver`, id `qTMzikhSEmYAVZJ0` (5 nœuds).
  Chaîne : `Input → Config → Build Request → Call OpenAI (gpt-5.5, sync) → Parse + CSV`.
- **Câblé dans le MAIN** `[MAIN] LEO v1 — Assets` (id `iOvLCwyOv8ReIxbG`), exécuté **en dernier**,
  derrière une **gate sur la case « Liens (A10) »**.
- **Déclenchement actuel** : formulaire n8n `http://localhost:5678/form/leo-assets`
  (`multipart/form-data`) : `field-0`=Target ID, `field-1`=email, `field-5`=`[""]` pour activer A10.
- **Prompt système** : chargé au runtime depuis GitHub raw
  `…/main/01_prompts/a10_links_resolver_system.md` (repo public, pas de token).
- **Validé end-to-end** (exécution réelle) : 4 liens d'un cours → résolutions correctes (cf. §7).

> ⚠️ Le déclenchement par form `field-N` est **fragile**. Pour l'UI, la cible est un **webhook JSON**
> dédié (cf. §4, `RECOMMANDÉ`). Tant qu'il n'existe pas, le BFF peut piloter via le form ci-dessus.

## 3. Contrat de données (schémas — la partie que l'UI rend)

### 3.1 Entrée consommée par le SUB A10
```jsonc
{
  "target_course_id": "8970456",
  "source_id": "8787276",
  "target_language": "English (en-US)",
  "source_language": "French (fr-FR)",
  "concept_swaps": [],                 // décisions A4 (SIRET→EIN…) pour aligner les liens
  "html_url": "https://raw.githubusercontent.com/.../{target}_localized_{dir}.html",
  "links": [ /* optionnel : si fourni, A10 ne re-scanne pas le HTML */
    { "id": "L1", "url": "https://…", "anchor": "texte du lien", "context": "phrase autour" }
  ]
}
```
Si `links` est absent, A10 **charge `html_url`** et extrait lui-même les `<a href>` non-`oc-static`.

### 3.2 Sortie produite par A10 (à afficher dans l'UI)
```jsonc
{
  "agent": "A10",
  "status": "PASS | PASS_WITH_FLAGS | MANUAL_REVIEW | FAIL",
  "total_links": 4,
  "counts": { "SAME_SOURCE_LANGUAGE_SWITCH": 2, "MANUAL_REVIEW": 2 },
  "resolutions": [
    {
      "id": "L1",
      "source_url": "https://fr.wikipedia.org/wiki/IPsec",
      "decision": "PRESERVE | SAME_SOURCE_LANGUAGE_SWITCH | REPLACE_EQUIVALENT | MANUAL_REVIEW | BLOCK",
      "target_url": "https://en.wikipedia.org/wiki/IPsec",   // vide si PRESERVE/MANUAL_REVIEW
      "flag": "SAME_SOURCE_LANGUAGE_SWITCH",
      "reason": "explication courte (à afficher en tooltip / colonne)",
      "needs_human_review": false
    }
  ],
  "csv": "id,source_url,decision,target_url,flag,needs_human_review,reason\n…"  // CSV prêt à exporter
}
```

### 3.3 Sémantique des décisions (drive l'UX)
| `decision` | Sens | Action UI proposée |
|---|---|---|
| `PRESERVE` | Lien déjà adapté (EN/officiel/global) | Badge vert, rien à faire |
| `SAME_SOURCE_LANGUAGE_SWITCH` | Même source en langue cible (auto, fiable) | Badge bleu, `target_url` appliqué, **validable en 1 clic** |
| `REPLACE_EQUIVALENT` | Équivalent cible proposé | Badge orange, **revue conseillée** (vérifier l'URL) |
| `MANUAL_REVIEW` | Pas d'équivalent vérifié / lien OC | Badge rouge → **file de revue** : l'opérateur saisit/valide une URL |
| `BLOCK` | Ne pas exposer le lien | Badge gris, à traiter manuellement |

## 4. API que le BFF doit exposer à l'UI (RECOMMANDÉ)

Le front ne voit **que** ces endpoints (le BFF traduit vers n8n) :

```
POST /api/agents/a10/run
  body: { "target_course_id": "8970456" }
  → 202 { "run_id": "uuid", "status": "running" }

GET  /api/agents/a10/runs/:run_id
  → 200 { "status": "running|success|error",
          "result": { …schéma 3.2… } | null,
          "started_at", "finished_at", "error": null }

POST /api/agents/a10/runs/:run_id/resolutions/:id   // human-in-the-loop
  body: { "decision": "…", "target_url": "…", "operator_note": "…" }
  → 200 { ok: true }   // persiste l'override côté BFF (store), pour ré-injection/export

GET  /api/agents/a10/runs/:run_id/export.csv
  → 200 text/csv   (csv brut + overrides opérateur fusionnés)
```

### Comment le BFF déclenche A10 derrière `POST …/run`
- **Option A — webhook JSON dédié (à créer côté n8n, idéal).** Un `webhook` qui prend
  `{ target_course_id }`, exécute la gate + A10, écrit un `progress_<run_id>.json` (pattern Asset
  Extractor) et renvoie le résultat. *(À construire ; je peux le faire côté n8n.)*
- **Option B — réutiliser le form MAIN (dispo tout de suite).** Le BFF POST en `multipart/form-data`
  vers `http://localhost:5678/form/leo-assets` avec `field-0=<target>`, `field-1=<email>`,
  `field-5=[""]`. Le MAIN tourne en arrière-plan ; le BFF récupère le résultat via l'API REST n8n
  (`/executions`) en dé-flattant, **ou** via le store de statut.

> Recommander **Option A** pour la v1 propre. Documenter Option B comme repli immédiat.

## 5. Écrans UI à produire (A10)

1. **Lancer** : sélection du `target_course_id` (autocomplete sur les cours ayant une Phase 1 prête),
   bouton « Résoudre les liens ». Direction affichée (déduite, lecture seule).
2. **Progression** : spinner + état (`running`), message « appel IA ~20–30 s ».
3. **Résultats** : tableau triable — colonnes `source_url` (avec ancre), `decision` (badge couleur
   §3.3), `target_url` (éditable), `reason` (tooltip), `flag`. Compteurs en tête (`counts`).
4. **File de revue** (`needs_human_review = true` / `MANUAL_REVIEW`) : vue dédiée où l'opérateur
   colle/valide une URL cible, ajoute une note, et marque « résolu ». Persiste via `POST …/resolutions/:id`.
5. **Export** : bouton « Télécharger CSV » + (plus tard) « Pousser le rapport sur GitHub ».

UX : badges couleur par décision, filtres (À revoir / Auto / Préservé), recherche, état vide géré
(`total_links: 0` → « Aucun lien externe dans ce cours »).

## 6. Cas limites à gérer dans l'UI/BFF
- `total_links: 0` → message neutre, pas une erreur.
- `status: FAIL` ou `result: null` + `error` → bandeau d'erreur, bouton « relancer ».
- Appel OpenAI lent/timeout → garder l'état `running`, ne pas double-soumettre.
- `target_url` vide sur un `SAME_SOURCE_LANGUAGE_SWITCH` (rare) → traiter comme à revoir.
- Idempotence : `POST …/run` deux fois sur le même cours → réutiliser le run en cours.

## 7. Exemple réel (run validé n8n #9563) — données de test pour Codex
```json
{
  "agent": "A10", "status": "MANUAL_REVIEW", "total_links": 4,
  "counts": { "SAME_SOURCE_LANGUAGE_SWITCH": 2, "MANUAL_REVIEW": 2 },
  "resolutions": [
    { "id":"L1","source_url":"https://fr.wikipedia.org/wiki/IPsec","decision":"SAME_SOURCE_LANGUAGE_SWITCH","target_url":"https://en.wikipedia.org/wiki/IPsec","flag":"SAME_SOURCE_LANGUAGE_SWITCH","reason":"Interlanguage equivalent.","needs_human_review":false },
    { "id":"L2","source_url":"https://docs.python.org/fr/3/library/ipaddress.html","decision":"SAME_SOURCE_LANGUAGE_SWITCH","target_url":"https://docs.python.org/3/library/ipaddress.html","flag":"SAME_SOURCE_LANGUAGE_SWITCH","reason":"Official docs, English version of same page.","needs_human_review":false },
    { "id":"L3","source_url":"https://openclassrooms.com/fr/courses/6944606-securisez-votre-reseau","decision":"MANUAL_REVIEW","target_url":"","flag":"OC_LINK_MANUAL_REVIEW","reason":"OpenClassrooms-owned links route to manual review.","needs_human_review":true },
    { "id":"L4","source_url":"https://www.it-connect.fr/ipsec-cours/","decision":"MANUAL_REVIEW","target_url":"","flag":"REPLACEMENT_NOT_VERIFIED","reason":"French blog; no verified equivalent.","needs_human_review":true }
  ]
}
```
Codex peut **mocker** cette réponse pour développer l'UI sans n8n.

## 8. Checklist d'acceptation A10 (Definition of Done UI)
- [ ] Lancer A10 pour un `target_course_id` et voir l'état `running` puis `success`.
- [ ] Tableau des résolutions avec badges de décision + compteurs.
- [ ] File de revue fonctionnelle : override d'une URL + note, persistés.
- [ ] Export CSV (incluant les overrides opérateur).
- [ ] États vides / erreur / 0 lien gérés proprement.
- [ ] Aucun secret côté front (tout passe par le BFF).
