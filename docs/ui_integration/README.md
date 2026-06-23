# LEO v1 — UI opérateur (intégration n8n) — Guide pour Codex

> But : construire une **interface UI ultra user-friendly** au-dessus de n8n pour piloter
> **tous les agents** des pipelines LEO v1 (Phase 1 HTML A1–A6, Phase 2 Assets A7–A10).
> Ce dossier contient les **contrats techniques** que l'agent de génération (Codex) doit suivre.
> Codex **n'a pas accès au n8n live** : tout ce dont il a besoin est décrit ici.

On documente **un agent à la fois**. Premier : **A10 Links Resolver** → [`A10_links_resolver.md`](A10_links_resolver.md).

---

## 1. Principe d'architecture

n8n reste le **moteur d'exécution**. L'UI est une **télécommande** par-dessus. On n'écrit jamais de
secret dans le navigateur : un **BFF** (Backend-For-Frontend mince) détient les credentials et
proxifie vers n8n.

```
[UI React/Next — ultra friendly]
        │  HTTPS (JSON, aucun secret)
        ▼
[BFF : service Node/Express ou FastAPI]   ← détient secrets, normalise les contrats
        │
        ├──► n8n : déclenchement   (webhooks / forms)
        ├──► n8n : suivi           (REST API /executions  OU store de statut par polling)
        └──► lecture livrables     (GitHub public raw, Iconik)
```

**Règle d'or** : l'UI ne parle qu'au BFF. Le BFF est le seul à connaître les URLs n8n internes,
la clé OpenAI, le `ocBasic` OC, les tokens Iconik.

## 2. Les 3 canaux d'intégration n8n

1. **Déclenchement.** Aujourd'hui les pipelines se lancent via des `formTrigger` n8n
   (`multipart/form-data`, champs nommés `field-0…field-N`). C'est **fragile** : la cible est de
   les passer à des **webhooks JSON** propres. Tant que ce n'est pas fait, le BFF peut déjà piloter
   via les forms existants (cf. contrat A10).
2. **Suivi (statut/progression).** n8n est *fire-and-forget* : il ne pousse rien. Deux options :
   - **Store de statut + polling** (pattern déjà en place dans l'OC Asset Extractor : le workflow
     écrit `progress_<id>.json`, l'UI poll un endpoint `…/status?id=`). **Recommandé.**
   - **API REST n8n** (`GET /api/v1/executions?workflowId=…`) — nécessite une clé API n8n côté BFF.
3. **Livrables.** Lecture seule : HTML localisés, rapports, CSV, et assets dans Iconik.
   Le repo GitHub est **public** → le BFF lit les fichiers en `raw.githubusercontent.com/.../main/…`
   sans token. L'écriture (push de rapports) nécessite un token GitHub côté BFF.

## 3. Conventions du domaine (à respecter par l'UI)

- **`course_id`** : entier à 7 chiffres. Un run a un `source_course_id` et un `target_course_id`.
- **`direction`** : `fr>en` ou `en>fr` (déduite automatiquement par le « gate » Phase 1, pas saisie).
- **Gate Phase 1** : la Phase 2 (donc A7–A10) **n'est lançable que si** le HTML Gold Master Phase 1
  existe sur GitHub (`07_runs/{source}/output/{target}_localized_{dir}.html`) + son
  `{target}_phase1_handoff.json`. Sinon → erreur « lance d'abord la Phase 1 ».
- **`phase1_handoff.json`** = contrat P1→P2 (glossaire, concept_swaps, `media_inventory` dispatcher).
- **Agents** : Phase 1 = A1 Source Analyst, A2 Terminology, A3 MTPE, A4 Cultural Adapter,
  A5 Quality Gatekeeper (score ≥90), A6 Final Proofreader. Phase 2 = A7 Dubbing Transcript,
  A8 Image Localizer, A9 Annexes, A10 Links Resolver (**A10 en dernier**, il agrège).

## 4. Pièges n8n que le BFF doit gérer (le front les ignore)

- **Format d'exécution « flatted »** : `execution_data.data` n'est pas du JSON plat — c'est le format
  `flatted` (références par index sous forme de strings numériques). Le BFF doit le **dé-flatter**
  avant d'exposer un résultat propre à l'UI. *(Préférer l'API REST n8n `/executions/:id` qui rend
  déjà du JSON, sinon implémenter un décodeur flatted.)*
- **Versioning des workflows** : un workflow actif exécute la version pointée par `activeVersionId`
  (table `workflow_history`), pas forcément le brouillon. Sans objet pour l'UI, mais à savoir si le
  BFF édite des workflows.
- **Modèle OpenAI** : les agents tournent en **synchrone** sur `gpt-5.5` (chat/completions,
  `response_format: json_object`). Latence ~15–30 s/appel. L'UI doit afficher un état « en cours ».
- **Secrets côté serveur uniquement** : clé OpenAI, `ocBasic` (renouvelé **chaque semaine**),
  App-ID/Auth-Token Iconik.

## 5. Paliers de livraison conseillés

1. **Palier 1** — Lancer + historique des runs (wrap des entrées existantes, UX propre).
2. **Palier 2** — Progression live + coûts + toggles par agent + browser de livrables.
3. **Palier 3** — Human-in-the-loop (valider A5 / A10 / A8), glossaires/prompts, rotation credentials.

## 6. Index des contrats par agent

| Brique | Contrat | État |
|---|---|---|
| **OC Asset Extractor** (outil) | [`OC_asset_extractor.md`](OC_asset_extractor.md) | ✅ rédigé (meilleur gabarit async) |
| **A10** Links Resolver | [`A10_links_resolver.md`](A10_links_resolver.md) | ✅ rédigé |
| A9 Annexes | _à venir_ | 🔜 |
| A8 Image Localizer | _à venir_ | 🔜 |
| A7 Dubbing Transcript | _à venir_ | 🔜 |
| A1–A6 (Phase 1 HTML) | _à venir_ | 🔜 |
