# CLS v3 — Vue d'ensemble des systèmes agentiques

> Généré le 2026-06-09 — état de production en cours

---

## Deux systèmes indépendants

| Système | Déclenchement | Périmètre |
|---|---|---|
| **Phase 1 — HTML Pipeline** | Formulaire n8n (MAIN) | Contenu HTML du cours |
| **Phase 2 — Media & Annexes** | Formulaire n8n (MAIN Media) | Vidéos, images, fichiers annexes |

Les deux systèmes partagent la même infrastructure Batch API (Submitter + Poller) et le même dépôt GitHub pour les artefacts.

---

## Phase 1 — HTML Localization Pipeline

### Architecture globale

```
Formulaire → HTML Extraction (OC API) → Pre-Processor → Glossary Load
→ GPT-4o Pre-Translation → A1 → A2 → A3 (MTPE) → A4 → A5 (QA loop) → A6
→ Reassembler → Deliver Output (GitHub)
```

### Modes disponibles (checkboxes du formulaire)

| Mode | Agents exécutés | Sortie |
|---|---|---|
| **Audit A1** | Pre-Translation, A1 | Rapport d'audit HTML par email |
| **Score de localisabilité** | Pre-Translation, A1, A2 | Score /100 par email |
| **Quality Check** | Pre-Translation, A1–A5 | Rapport QA par email |
| **Localisation complète** | Pre-Translation, A1–A6 + Reassembler + Deliver | HTML localisé pushé sur GitHub |

---

### Agents — détail

#### GPT-4o Pre-Translation *(pré-traduction brute)*
- **Rôle :** Génère un premier jet de traduction brut, non finalisé, qui sert de draft pour A3
- **Modèle :** `gpt-4o`
- **Temperature :** 0.1
- **API :** OpenAI Batch API (asynchrone 24h)
- **Input :** HTML source (chunks par chapitre)
- **Output :** `pretranslation_draft` injecté dans le contexte A3

---

#### A1 — Source Analyst *(audit du contenu source)*
- **Rôle :** Analyse structurelle et culturelle du HTML source. Identifie les cultural locks, les risques de traduction, les éléments nécessitant une attention particulière (exemples, réglementaire, noms propres)
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune (modèle reasoning)
- **API :** OpenAI Batch API
- **Input :** HTML source, langue source/cible, domaine détecté
- **Output :** `a1_audit` — cultural_flags, complexity_score, risk_zones, recommended_approach

---

#### A2 — Terminology Architect *(glossaire et terminologie)*
- **Rôle :** Construit le glossaire de traduction pour le chapitre à partir de l'audit A1 et des TM de domaine. Valide et priorise les termes, détecte les conflits terminologiques
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Input :** `a1_audit`, HTML source, TM validé/non-validé, common_glossary
- **Output :** `a2_glossary` — translation_decisions, validated_terms, conflict_flags

---

#### A3 — MTPE FR→EN / EN→FR *(traduction MTPE)*
- **Rôle :** Machine Translation Post-Editing — révise le draft GPT-4o à partir des décisions A1/A2. Produit le "gold master" de traduction, fidèle au sens, respectueux de la structure HTML
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Direction :** deux sous-workflows séparés (FR→EN et EN→FR)
- **Input :** `pretranslation_draft`, HTML source, `a1_audit`, `a2_glossary`, contexte précédent
- **Output :** `agent_output.revised_content` — HTML traduit gold master

---

#### A4 — Cultural Adapter *(adaptation culturelle)*
- **Rôle :** Applique les swaps culturels sur le gold master A3. Remplace les références culturelles françaises (institutions, exemples, noms, format dates/monnaies) par des équivalents cibles. Documente chaque décision dans un swap log
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Input :** `a3_gold_master`, `a1_cultural_flags`, `a2_terminology_decisions`, common_glossary
- **Output :** `adapted_content` (→ `translated_html`), `swap_log`, `cultural_portability_score`

---

#### A5 — Quality Gatekeeper *(contrôle qualité)*
- **Rôle :** Évalue la qualité de la traduction adaptée sur 100 points. Vérifie : fidélité terminologique, cohérence culturelle, respect HTML, fluidité. Si score < 90, déclenche une boucle de correction (max 3 itérations via A3→A4→A5)
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Input :** `translated_html`, `source_html`, `a4_swap_log`, glossaires, `failing_segments` (iter 2+)
- **Output :** `qa_report`, `score_total`, `qa_status` (PASS/FAIL), `failing_segments`
- **Boucle QA :** max 3 itérations. Si score ≥ 90 → A6. Si score < 90 après iter 3 → A6 quand même avec flag

---

#### A6 — Final Proofreader *(relecture finale)*
- **Rôle :** Relecture naturalness et FOPR (Final Output Pre-Review). Vérifie que le texte localisé est idiomatique dans la langue cible, sans artefacts de traduction. Note chaque segment sur une grille ISO 17100. Produit la liste des items FOPR-ready
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Input :** `translated_html` (post-QA), langue cible, domaine
- **Output :** `revised_content` (HTML final), `naturalness_score`, `verdict`, `fopr_ready_items`

---

### Infrastructure Phase 1 (sans IA)

| Composant | Rôle |
|---|---|
| **OC HTML Extraction** | Appel API OC staging → récupère le HTML brut du cours |
| **Pre-Processor** | Découpe le HTML en chapitres/chunks, calcule `pipeline_meta` |
| **Glossary Loader** | Charge common_glossary + TM de domaine depuis GitHub |
| **Detect Domain** | Détecte le domaine pédagogique (IT, business, etc.) |
| **Batch Submitter** | Construit le JSONL, upload vers OpenAI Files API, crée le batch |
| **Batch Poller** | Polling toutes les 15 min, parse les résultats quand batch `completed` |
| **Reassembler** | Réassemble les chunks traduits en HTML complet, 7 checks structurels |
| **Deliver Output** | Push HTML + rapport Markdown sur GitHub (branche review) |

---

## Phase 2 — Media & Annexes Pipeline

> Phase 2 ne s'exécute qu'après Phase 1 complète avec score ≥ 90 (gate obligatoire)

### Architecture globale

```
Formulaire → AWS Downloader → routing par type de fichier
→ A7 (sous-titres) / A8 (images) / A9 (annexes) / A10 (liens)
→ Upload Iconik
```

### Agents Phase 2

#### A7 — Caption Localizer *(sous-titres vidéo)*
- **Rôle :** Localise les fichiers SRT/VTT des vidéos Vimeo. Applique les mêmes décisions terminologiques que Phase 1. Respecte strictement le timing et la structure des sous-titres
- **Modèle :** `gpt-5.5-pro-2026-04-23` *(reasoning)*
- **Temperature :** aucune
- **API :** OpenAI Batch API
- **Input :** fichier SRT brut, glossaire A4, langue source/cible
- **Output :** fichier SRT localisé, segment_log

---

#### A8 — Image Localizer *(images et visuels)* — *à construire*
- **Rôle prévu :** Analyse vision des images (gpt-image-1), édition des textes incrustés, upload vers Iconik collection `images_to_localize`
- **Modèle prévu :** `gpt-5.5-pro-2026-04-23` + `gpt-image-1`
- **Déclenchement :** Manuel (formulaire séparé — A7 ne déclenche pas A8 automatiquement)

#### A9 — Annexes Localizer *(XLSX, DOCX, PPTX, CSV)* — *à construire*
- **Rôle prévu :** Localise le contenu textuel des fichiers structurés. Préserve absolument la mise en forme (colonnes, styles, formules). Applique les swaps A4. Upload vers Iconik `external_files`
- **Modèle prévu :** `gpt-5.5-pro-2026-04-23`

#### A10 — Links Resolver *(liens externes)* — *à construire*
- **Rôle prévu :** Trouve l'équivalent EN des liens FR (gouvernement, Wikipedia, docs techniques). Applique les swaps institutionnels A4. Produit un rapport CSV pushé sur GitHub. Les liens OC sont MANUAL_REVIEW sans exception
- **Modèle prévu :** `gpt-5.5-pro-2026-04-23`

---

## Résumé technique

| Agent | Phase | Modèle | Reasoning | Batch API | Temperature |
|---|---|---|---|---|---|
| GPT-4o Pre-Translation | 1 | `gpt-4o` | Non | ✅ | 0.1 |
| A1 Source Analyst | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A2 Terminology Architect | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A3 MTPE FR-EN | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A3 MTPE EN-FR | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A4 Cultural Adapter | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A5 Quality Gatekeeper | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A6 Final Proofreader | 1 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A7 Caption Localizer | 2 | `gpt-5.5-pro-2026-04-23` | ✅ | ✅ | — |
| A8 Image Localizer | 2 | *à construire* | — | — | — |
| A9 Annexes Localizer | 2 | *à construire* | — | — | — |
| A10 Links Resolver | 2 | *à construire* | — | — | — |

### Note sur les reasoning models et temperature

Les modèles `gpt-5.5-pro` et tous les modèles `-pro` / thinking d'OpenAI **n'acceptent pas de valeur `temperature` personnalisée**. Seule la valeur par défaut (1) est supportée — toute autre valeur renvoie une erreur 400 silencieuse dans le Batch API (`request_counts.failed = N`). → Voir `docs/openai_reasoning_models_temperature.md`
