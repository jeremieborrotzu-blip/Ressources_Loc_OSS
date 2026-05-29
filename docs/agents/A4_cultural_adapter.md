# A4 — Cultural Adapter

**Position dans le pipeline :** Après A3 (Gold Master) | Avant A5 (QA)
**Modèle :** GPT-5.4 — Batch API
**Température :** 0.3
**Prompt :** `01_prompts/a4_cultural_adapter_system.txt` + `a4_cultural_adapter_user_template.txt`

---

## Ce qu'il fait

A4 est l'agent de **portabilité culturelle**. Il ne traduit pas — A3 l'a déjà fait. Il détecte là où A3 a traduit un mot au lieu de swapper un concept, et applique l'équivalent fonctionnel dans la culture cible.

**Exemple critique :**
- ❌ "cahier de recette" → "recipe book" *(traduction littérale catastrophique)*
- ✅ "cahier de recette" → "UAT document / acceptance test plan"

---

## Comment il fonctionne

A4 prend **3 décisions** pour chaque terme identifié — et seulement 3 :

| Décision | Quand | Exemple |
|---|---|---|
| `SWAP` | Un équivalent fonctionnel existe | ANSSI → CISA |
| `CONSERVE+EXPLAIN` | Pas d'équivalent propre, ou le terme EST la donnée | région [French administrative region] |
| `NO_CHANGE` | Déjà correct dans A3 | ISO 27001 |

Chaque décision est loggée avec une justification dans `swap_log[]`.

---

## Pourquoi cet agent existe (séparé de A3)

A3 est un expert de la langue. A4 est un expert du contexte institutionnel, réglementaire et méthodologique. Ce sont deux compétences différentes — les fusionner crée des biais. Un agent qui traduit ET adapte culturellement a tendance à rationaliser ses propres erreurs.

**ADR-001 :** 7 agents séparés — l'agent qui traduit ≠ celui qui évalue ≠ celui qui adapte culturellement.

---

## Bibliothèques de swaps (par domaine)

A4 active les swap libraries correspondant au `domain` reçu en input :

| Domaine | Exemples clés |
|---|---|
| **Universel** | QQOQCP→5W2H, RTT→PTO, CDI→at-will, cahier de recette→UAT doc |
| **Cybersécurité** | ANSSI→CISA, SecNumCloud→FedRAMP, PSSI→ISP, EBIOS→NIST SP 800-30 |
| **Data / Analytics** | CNIL→FTC, INSEE→Census Bureau, régions/départements→CONSERVE+EXPLAIN |
| **Business / Ventes** | Pôle emploi→state workforce agency, URSSAF→IRS, AMF→SEC |
| **RH / Recrutement** | CV photo FR→no-photo US, CPF→CONSERVE+EXPLAIN, OPCO→CONSERVE+EXPLAIN |
| **Légal / Compliance** | RGPD→GDPR/CCPA, CDI→at-will, liquidation→Chapter 7 |

**Cas particulier DATA :** les `régions` et `départements` français utilisés comme colonnes de dataset sont **CONSERVÉS** avec explication — ce sont les données, pas une référence culturelle.

---

## Ce qu'il reçoit

```json
{
  "course_id": "...",
  "source_language": "fr",
  "target_language": "en-US",
  "domain": "Data",
  "source_content": "...",
  "a3_gold_master": "...",
  "a1_cultural_flags": [...],
  "a2_terminology_decisions": {...},
  "common_glossary": {...}
}
```

**Isolation partielle :** A4 voit le source pour contexte, mais son travail porte exclusivement sur le draft A3.

---

## Ce qu'il produit

```json
{
  "cultural_portability_score": 23,   // sur 25
  "adapted_content": "...",
  "swap_log": [
    {
      "segment_id": "A4-001",
      "source_term": "QQOQCP",
      "a3_draft_value": "QQOQCP",
      "final_output": "5W2H (Who / What / Where / When / Why / How / How much)",
      "decision_type": "SWAP",
      "swap_category": "methodological",
      "decision_note": "QQOQCP est un acronyme mnémotechnique français sans équivalent direct. 5W2H est le framework analytique standard en anglais couvrant les mêmes 7 questions."
    }
  ],
  "new_flags": [...],
  "temp_glossary_patch": [...]
}
```

---

## Score

`cultural_portability_score` sur 25 — contribue au pilier 4 du score global A5.
- CRITICAL non résolu : −5
- MAJOR non résolu : −3
- MINOR non résolu : −1

---

## Rattachement solution

- **Pipeline :** Phase 1 HTML, étape 5/7
- **Problème résolu :** incohérences culturelles que A3 laisse passer (traduction de mots vs swap de systèmes)
- **Décision qualité remontée par :** équipe QA OC — erreurs de type "recipe book", "a commercial", "schematically"
- **ADR liés :** ADR-001 (séparation des agents), ADR-009 (glossaire A2 injecté dans chaque appel A3-A7)
