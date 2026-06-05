# CLS v3 — Guide du pipeline de localisation

> Pipeline n8n de localisation de cours OpenClassrooms (FR↔EN) via OpenAI Batch API.
> Instance locale : `http://localhost:5678` — MAIN workflow : `ApjYq9sdM5LKRVlq`

---

## 1. Le formulaire — comment ça marche et pourquoi

### Accès
L'URL du formulaire n'est **pas** le path personnalisé (`/form/cls-v3-form`) mais le **webhookId** interne :
```
http://localhost:5678/form/f146189f-507c-44da-beb7-6c888a156a3f
```
> Pourquoi ? n8n enregistre les form triggers dans un registre in-memory au démarrage.
> Si Docker est redémarré sans que le workflow soit actif, le registre se vide.
> **Si le form est inaccessible → redémarrer Docker, puis activer le workflow.**

### Champs du formulaire

| Champ | Type | Usage |
|---|---|---|
| ID source | Texte | Cours OC à localiser (ex. `8787276`) |
| ID cible | Texte | Nouvel ID OC qui recevra le HTML traduit |
| Langue source | Sélecteur | `fr` ou `en` |
| Langue cible | Sélecteur | `en-US` ou `fr-FR` |
| Email | Texte | Adresse de livraison des rapports |
| ☑ Audit du contenu (A1) | Checkbox | Lance l'audit seul, sans traduction |
| ☑ Score localisabilité | Checkbox | Calcule le score de faisabilité |
| ☑ Quality Check | Checkbox | Lance toute la chaîne jusqu'au QA |
| ☑ Localiser le cours (HTML) | Checkbox | Lance la localisation complète |

> **Pourquoi des checkboxes ?** Pour piloter le scope selon l'étape du projet.
> Avant de traduire, on audite (A1). Avant de livrer, on QA (A5).
> Chaque checkbox active un sous-ensemble du pipeline, sans changer le code.

> ⚠️ Les checkboxes n8n retournent `[""]` (cochée) ou `[]` (décochée) — pas un booléen.

---

## 2. Vue d'ensemble du pipeline

```
FORM
  ↓
Init Params            ← parse les champs + checkboxes
  ↓
Prepare Course ID      ← prépare l'item pour le SUB d'extraction
  ↓
Call HTML Extraction   ← appelle le SUB OC (authentification + scraping)
  ↓
Extract Fingerprint    ← capture les URLs, blocs code, data-claire-semantic
  ↓
Prepare Pre-Processor Input
  ↓
Call Pre-Processor     ← split en chapitres (h3), chunk si >12k tokens (h4)
  ↓                       → produit N chunks avec chapter_index / chunk_index
Glossary Load 1        ← charge common_glossary.json depuis GitHub
  ↓
Merge Glossary into Chunks  ← réinjecte le glossaire dans chaque chunk
  ↓
Call A1 (×N chunks)    ← AGENT : audit source, détection domaine, score piliers
  ↓
Detect Domain          ← consolide le domaine détecté (Tech|Data|Business|...)
  ↓
[Post-A1 Mode?]        ← ROUTING selon les checkboxes
  ↓
  ├── audit_only   → voir Scénario 1
  ├── score_loc    → voir Scénario 2
  └── fallback     → Glossary Load 2 → A2 → Pre-Trad → A3 → A4 → A5 iter1-3
                          ↓
                    [Post-QA Mode?]
                      ├── qa_check   → voir Scénario 3
                      └── localize   → voir Scénario 4
```

---

## 3. Le pattern Batch API (commun à tous les agents)

Chaque agent (A1 → A6, Pre-Translation) suit le même pattern asynchrone :

```
Build Message          ← assemble system prompt + user prompt avec les variables du chunk
    (lit $('Input from MAIN').all() — PAS $input qui pointe sur Load User)
  ↓
Call Submitter         ← appelle le SUB Batch Submitter
  │
  │  [SUB Batch Submitter]
  │    Build JSONL           ← formate toutes les requêtes en JSONL multi-lignes
  │    Prepare GitHub Push   ← encode en base64
  │    Push JSONL to GitHub  ← stocke sur jeremieborrotzu-blip/Ressources_Loc_OSS
  │                             dans 07_runs/{course_id}/scratch/{agent}_{ts}.jsonl
  │    GET raw from GitHub   ← récupère en binaire (Accept: vnd.github.v3.raw)
  │    Upload JSONL → OpenAI ← formBinaryData → POST /v1/files
  │    Create Batch          ← POST /v1/batches (model: gpt-5.2, window: 24h)
  │
  ↓
Call Poller            ← appelle le SUB Batch Poller
  │
  │  [SUB Batch Poller] — boucle toutes les 15 minutes, max 96 polls (24h)
  │    Get Batch Status      ← GET /v1/batches/{batch_id}
  │    Check & Route         ← completed / failed / validating / in_progress
  │    ├── completed → Get Output File (responseFormat: text) → Parse Output
  │    ├── failed    → Handle Failure → escalation: true
  │    └── waiting   → Wait 15 min → boucle
  │
  ↓
Return Output          ← parse les résultats, reconstruit chapter_index/chunk_index
                          depuis le custom_id (format: {course_id}-ch{N}-ck{N}-{agent})
```

> **Pourquoi GitHub en intermédiaire ?**
> n8n HTTP Request avec `parameterType: "formData"` + string ne génère pas
> de `filename` dans le Content-Disposition multipart → OpenAI rejette en 400.
> La solution : pousser le JSONL sur GitHub (base64), le récupérer via
> `Accept: vnd.github.v3.raw` qui renvoie du binaire → `formBinaryData` fonctionne.

---

## 4. Scénario 1 — Audit uniquement (☑ Audit du contenu A1)

**Usage :** Avant de commencer la localisation. Évalue les risques, détecte le domaine, donne un score de localisabilité par pilier.

**Durée estimée :** 1–4h (Batch API OpenAI)

**Chaîne :**
```
... → Call A1 (×N chunks) → Detect Domain
  ↓
[Post-A1 Mode? → audit_only]
  ↓
Audit Summary
  ← consolide les N résultats A1 : localizability_score, pillar_scores,
     cultural_flags, penalties, blockers, media_inventory, proposed_terminology
  ↓
Format Audit Report
  ← génère un email HTML complet avec :
     • badge score coloré par chunk (vert ≥80 / orange ≥60 / rouge <60)
     • tableau des 6 piliers (Technical, Pedagogical, Terminology, Cultural, Media, Metrics)
     • liste des bloquants en rouge
     • tableau des cultural flags avec effort + blocker
     • inventaire médias avec risk level
     • terminologie proposée (source → cible)
  ↓
Send Audit Email
  ← emailFormat: html → Corps HTML directement lisible dans Gmail
     Sujet : [CLS] Audit — {course_id} ({direction})
```

**Ce que tu reçois :** Un email HTML avec le rapport d'audit complet, transférable et analysable via Gemini.

---

## 5. Scénario 2 — Score de localisabilité (☑ Score localisabilité)

**Usage :** Obtenir un chiffre synthétique pour valider la faisabilité et prioriser les cours.

**Durée estimée :** 1–4h

**Chaîne :**
```
... → Call A1 (×N chunks) → Detect Domain
  ↓
[Post-A1 Mode? → score_loc]
  ↓
Score Summary
  ← calcule score global pondéré sur les N chunks
  ↓
Format Score Report
  ↓
Send Score Email
```

**Ce que tu reçois :** Score de localisabilité global + par chapitre, avec recommandation Go/No-Go.

---

## 6. Scénario 3 — Quality Check (☑ Quality Check)

**Usage :** Vérifier la qualité de traduction sans livrer. Utile pour une revue humaine avant publication.

**Durée estimée :** 4–12h (pipeline complet A1→A5)

**Chaîne :**
```
... → Call A1 → Detect Domain
  ↓
[Post-A1 Mode? → fallback]
  ↓
Glossary Load 2        ← charge la TM domaine (translation_memory/{domain}.csv)
  ↓
Merge Domain into Chunks
  ↓
Call A2 (×N chunks)    ← AGENT : Terminology Architect — construit le glossaire de run
  ↓
Call Pre-Translation   ← AGENT : GPT-4o pré-trad brute (moins cher, 1ère passe)
  ↓
Call A3 (×N chunks)    ← AGENT : MTPE Specialist — traduction post-éditée
  ↓
Call A4 (×N chunks)    ← AGENT : Cultural Adapter — swaps culturels (SIRET→EIN, RTT→PTO...)
  ↓
Call A5 iter 1         ← AGENT : Quality Gatekeeper — QA sur segments, score /100
  ↓ (si score < 90 et segments défaillants identifiés)
Call A3 iter 2 (segments défaillants uniquement)
  ↓
Call A4 iter 2
  ↓
Call A5 iter 2
  ↓ (si encore < 90)
Call A3 iter 3 → A4 iter 3 → A5 iter 3
  ↓
[Post-QA Mode? → qa_check]
  ↓
QA Summary
  ↓
Format QA Report
  ↓
Send QA Email
```

**Ce que tu reçois :** Rapport QA avec score final, segments défaillants restants, décision PASS/FAIL par chunk.

> **Optimisation coût :** Les itérations 2 et 3 ne retraitent QUE les segments
> défaillants identifiés par A5 (pas le chapitre entier). Gain ~60% sur les passes suivantes.

---

## 7. Scénario 4 — Localisation complète (☑ Localiser le cours HTML)

**Usage :** Livraison finale. Pipeline complet jusqu'au HTML localisé prêt à injecter dans OC.

**Durée estimée :** 6–24h (pipeline complet A1→A6 + livraison)

**Chaîne :**
```
... → [même chaîne que Scénario 3 jusqu'à A5 iter 3]
  ↓
[Post-QA Mode? → localize_html]
  ↓
Call A6 (×N chunks)    ← AGENT : Final Proofreader — polish final, conformité ISO 17100
  ↓
Call Reassembler       ← SUB : réassemble les N chunks dans l'ordre
                          + 7 checks structurels :
                          1. Balance HTML tags
                          2. data-claire-semantic préservés
                          3. Blocs atomiques intacts (aside, ul, table, pre)
                          4. Pas de texte orphelin
                          5. Hiérarchie h2/h3/h4 respectée
                          6. URLs intactes
                          7. Nombre de blocs code = original
  ↓
Call Deliver           ← SUB : livraison GitHub + Google Doc
                          Push → 07_runs/{course_id}/output/{target}_localized_{dir}.html
                          Push → decision_log.json
                          Push → tm_patch.csv (nouveaux termes pour la TM)
                          Crée → Google Doc [CLS Review] pour revue humaine
  ↓
Format HTML Delivery
  ↓
Send HTML Email
  ← liens GitHub + Google Doc + résumé décisions
```

**Ce que tu reçois :** Email avec liens vers le HTML localisé (GitHub) et le Google Doc de review. Injection manuelle dans OC par Jérémie.

---

## 8. Glossaire — Translation Memory

La TM est un actif **cumulatif persistant** — enrichi à chaque run, jamais supprimé.

```
02_glossaires/
├── common_glossary.json        ← 156 termes autorité (jamais contredits)
├── common_glossary.xlsx        ← version human-readable
└── translation_memory/
    ├── Tech.csv
    ├── Data.csv
    ├── Business.csv
    ├── Career.csv
    └── Soft_Skills.csv
```

**Priorité dans le pipeline :**
1. `common_glossary` — autorité absolue
2. TM domaine `validated: true` — décision humaine actée, s'impose
3. TM domaine `validated: false` — suggestion agent, A2 confirme
4. Nouvelle décision A2 en cours de run

Après chaque run : A2 + A4 poussent leurs `domain_tm_patch[]` → merge dans le CSV domaine → commit GitHub automatique.

---

## 9. Coûts estimés (OpenAI Batch API — 50% réduction)

| Agent | Modèle | Coût / run One Part (~83k tokens) |
|---|---|---|
| GPT-4o Pre-Translation | gpt-4o | ~$0.54 |
| A1 Audit | gpt-5.2 | ~$1.20 |
| A2 Terminology | gpt-5.2 | ~$0.18 |
| A3 MTPE | gpt-5.2 | ~$3.10 |
| A4 Cultural | gpt-5.2 | ~$3.20 |
| A5 QA ×2 iter | gpt-5.2 | ~$2.80 |
| A6 Proofreader | gpt-5.2 | ~$2.50 |
| **TOTAL** | | **~$13.52** |

Budget $50 → **3–4 runs complets One Part** (ou ~10 runs audit seul).

---

## 10. Points de vigilance techniques

| Problème | Symptôme | Solution |
|---|---|---|
| Form 404 après activation | `/form/cls-v3-form` ne répond pas | Utiliser le webhookId · Redémarrer Docker si nécessaire |
| Batch `duplicate_custom_id` | `request_counts.total = 0` après validation | `Build Message` doit lire `$('Input from MAIN').all()` pas `$input.all()` |
| Upload JSONL 400 OpenAI | Bad request sur Call A1/A2... | Passer par GitHub intermédiaire + `parameterType: "formBinaryData"` |
| Parse Output vide | `agent_output: null` malgré batch completed | `Get Output File` doit avoir `responseFormat: "text"` |
| `body: {}` expressions non évaluées | Clés manquantes dans Create Batch | Utiliser `bodyParameters.parameters` keypairs |
| Email sans HTML | Tags HTML visibles en texte brut | `emailFormat: "html"` + champ `html:` (pas `message:`) dans emailSend v2.1 |
| Chunks perdus après Glossary Load | 1 item au lieu de N | Nœud `Merge X into Chunks` obligatoire après chaque SUB qui retourne 1 item |
