# Ordre de traitement — Règle fondamentale

> Décision validée par retour terrain équipe QA et CLS.

---

## La hiérarchie

```
HTML (chapitres) = SOURCE DE VÉRITÉ ABSOLUE
     │
     │  donne : contexte · ton · terminologie · exemples · décisions culturelles
     ↓
Documents AWS · Annexes PDF/DOCX/XLSX · Images · Liens externes
     = s'alignent sur le HTML — jamais l'inverse
```

---

## Deux phases séquentielles — jamais parallèles

### Phase 1 — HTML complet en premier

```
A1 → A2 → Pre-Translation → A3 → A4 → A5 (boucle ≤3) → A6
```

**Gate de passage :** Phase 2 ne démarre QUE si :
- `status = pass` sur A5/A6
- `score_total ≥ 90`
- Glossaire A2 + decision log A4 disponibles

**Sorties Phase 1 utilisées en Phase 2 :**
- HTML localisé validé (contexte de référence)
- Glossaire A2 (terminologie imposée)
- Decision log A4 (swaps culturels actés)

### Phase 2 — Assets alignés sur le HTML

Chaque annexe, image, lien reçoit EN INPUT les sorties Phase 1.
Garantit : un terme dans le HTML = même terme dans tout document annexe lié.

---

## Boucle QA (Phase 1)

```
A3 → A4 → A5
 ↑          │ score < 90
 └──────────┘ (segments défaillants uniquement — pas le chapitre entier)
             │ score ≥ 90
             ↓
            A6
```

**Optimisation coût :** les itérations 2 et 3 ne retraitent que les segments identifiés par A5 (segment_ids précis). Coût iter 2 ≈ 20% de iter 1. Coût iter 3 ≈ 5%.

**Plafond :** max 3 itérations → escalade humaine (`escalation: true`) si score toujours < 90.

---

## Chunking des chapitres longs

**Seuil :** chapitre > 12 000 tokens HTML → split.

**Points de split sécurisés (par priorité) :**
1. Entre deux `<h4>` — frontière sémantique naturelle OC
2. Entre deux `<h3>` — si pas de h4
3. Après `</p>` avant `<figure>` — dernier recours

**Blocs atomiques — ne JAMAIS couper :**
`<aside>` · `<ul>/<ol>` · `<table>` · `<figure>` · `<pre>` · `<div data-claire-semantic>`

**Contexte de couture :** les 300 derniers tokens du chunk N sont passés en contexte (pas à retraduire) au chunk N+1.

---

## Validation structurelle à la réassemblage (7 checks)

| # | Check | Bloquant |
|---|---|---|
| 1 | Balance HTML — balises ouvrantes = fermantes | Oui |
| 2 | data-claire-semantic — tous présents | Oui |
| 3 | Blocs atomiques intacts | Oui |
| 4 | Pas de phrase orpheline aux coutures | Oui |
| 5 | Ordre h2/h3/h4 logique respecté | Oui |
| 6 | URLs src et href identiques à l'input | Oui |
| 7 | Attributs HTML intacts | Oui |

Échec d'un check → flag `structural_integrity: false` → bloqué avant livraison.
