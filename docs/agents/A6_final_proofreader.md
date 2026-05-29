# A6 — Final Proofreader

**Position dans le pipeline :** Après A5 PASS (score ≥ 90) | Avant livraison
**Modèle :** GPT-5.4 — Batch API
**Température :** 0.2
**Prompt :** `01_prompts/a6_final_proofreader_system.txt` + `a6_final_proofreader_user_template.txt`

---

## Ce qu'il fait

A6 est le **dernier filtre avant livraison**. Il lit le contenu localisé exactement comme un lecteur natif — sans jamais voir le texte source. Il détecte ce qui sonne encore "traduit" : galicismes résiduels, mauvaises collocations, phrases trop lourdes, titres non-impératifs.

**Son verdict est binaire :** `ready_to_publish` ou `needs_revision`.

---

## Pourquoi l'isolation totale (ISO 17100 §5.3.3 adapté)

Un relecteur qui voit le texte source a tendance à accepter des formulations bancales parce qu'elles "ont du sens vu l'original". A6 lit comme un lecteur — pas comme un traducteur. Il ne sait pas ce que le français disait. Il sait seulement si l'anglais (ou le français cible) est naturel et publiable.

**Ce qu'A6 ne reçoit PAS :** source, rapports A1/A2/A3/A4, glossaires de domaine.
**Ce qu'A6 reçoit :** uniquement `adapted_content` (output A4/A5) + `target_language` + `domain`.

**Exception :** les règles OC obligatoires s'appliquent même en isolation (Let's Recap!, Over To You!, titres impératifs, langage inclusif).

---

## Les 5 critères de naturalité

| Critère | Ce qu'il vérifie | Exemple d'erreur détectée |
|---|---|---|
| **1. Son natif** | Le texte sonne-t-il écrit directement en cible ? | "Schematically" utilisé comme marqueur de discours |
| **2. Pas de calques** | Faux amis, structures calquées du français | "a commercial" pour "a sales rep" |
| **3. Rythme** | Phrases trop longues, passif excessif, nominalisation | "make a decision" → "decide" |
| **4. Collocations** | Paires verbe-nom idiomatiques | "do an effort" → "make an effort" |
| **5. Publiable** | Grammaire, majuscules, titres impératifs, inclusif | "policeman" → "police officer" |

---

## Calques documentés à détecter (liste évolutive)

| Calque | Correction |
|---|---|
| "a commercial" | "a sales rep" / "a salesperson" |
| "animate a session" | "run / facilitate / lead a session" |
| "realize a project" | "carry out / complete / deliver" |
| "eventually" (= éventuellement) | "possibly" / "if applicable" |
| "actual / actually" (= actuel) | "current / currently" |
| "sensitize" | "raise awareness" |
| "valorize" | "highlight / showcase / leverage" |
| "schematically" | "simply put" / "in essence" |
| "form" (= former qqn) | "train" / "develop" |

---

## Ce qu'il produit

```json
{
  "naturalness_score": 8.5,        // sur 10
  "verdict": "ready_to_publish",
  "issue_log": [
    {
      "issue_id": "A6-003",
      "severity": "MAJOR",
      "checklist_category": "calque",
      "location": "P1C3 §4",
      "draft_value": "animate the training session",
      "suggested_fix": "facilitate the training session",
      "decision_note": "'Animate' est un calque de 'animer' — en anglais US, on 'facilitates' ou 'runs' une session."
    }
  ],
  "fopr_ready_items": [...],       // compatible FOPR OSS Review Log
  "revised_content": "..."
}
```

**FOPR compatibility :** chaque item CRITICAL/MAJOR est formaté pour injection directe dans le tableau FOPR OSS Localisation — Human Review Log.xlsx (colonnes : Location | Source | Target | Issue | Change made or suggested).

---

## Scoring et seuil

| Score | Verdict | Action |
|---|---|---|
| ≥ 8 | `ready_to_publish` | Passe à la livraison |
| < 8 | `needs_revision` | A5 reroute les segments vers A3 |

Pénalités : CRITICAL −3 | MAJOR −1 | MINOR −0.5

---

## Mode seam_check

Si le chapitre a été **chunké** (Pre-Processor a splitté), A6 reçoit `seam_check_required: true` et vérifie spécifiquement :
- Cohérence terminologique aux jointures de chunks
- Absence de rupture pédagogique aux coutures
- Pas de répétition ou d'omission aux points de jointure

---

## Rattachement solution

- **Pipeline :** Phase 1 HTML, étape 7/7 (dernière avant livraison)
- **Problème résolu :** contenu qui passe A5 (score ≥ 90) mais sonne encore traduit pour un lecteur natif
- **Décision qualité remontée par :** équipe CLS — galicismes résiduels non détectés par QA quantitatif
- **Standard de référence :** ISO 17100 §5.3.3 (révision en isolation)
- **Checklist source :** Post Editing Checklist.docx (catégories 2, 5, 6, 7 — applicables sans source)
- **ADR liés :** ADR-004 (A6 Final Proofreader en isolation totale)
