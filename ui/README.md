# LEO v1 — Super UI (poste de pilotage de localisation)

Interface opérateur **autonome** au-dessus du pipeline LEO (n8n). Ouvrir `ui/index.html` dans un
navigateur. Aucun build, aucun secret. Prototype destiné à être câblé au **BFF** (cf.
[`../docs/ui_integration/`](../docs/ui_integration/)).

> Conçue à partir d'une connaissance fine du pipeline : ce n'est pas un formulaire, c'est un **poste
> de pilotage d'ops de localisation** — lancer, suivre, et **arbitrer** (human-in-the-loop).

## Logo
Déposer le PNG fourni dans `ui/assets/leo-logo.png` → remplace automatiquement le logo SVG de secours.

---

## 1. Les 3 espaces (sidebar)

### 🚀 Lancer — le lanceur intelligent
- **Détection auto du statut Phase 1** : on tape le `Target Course ID` → l'UI dit si une traduction
  existe déjà, et **pré-remplit** source / langues + affiche l'**inventaire** (X images / Y annexes /
  Z liens / vidéos) depuis le handoff. *(prototype : mock `8970456` ; prod : BFF lit l'arbre GitHub `07_runs/`.)*
- **Séparation visuelle** Phase 1 « Contenu » (bleu/indigo) / Phase 2 « Multimédia & Assets » (orange) / Outils (teal).
- **Champs réels** des formulaires n8n (Source/Target ID, langues, email, Content Type COURS/PROJET,
  Domain, options avancées : HTML file, GDoc URL, UI Context, Video ID/SRT).
- **Estimation de coût IA** en direct (basée sur les coûts réels mesurés : ~$15 texte, ~$0.10/image…),
  affinée par l'inventaire détecté.
- **Plan d'exécution** live (ordre, prérequis, avertissements) + bouton **Lancer** gated.

### 📡 Suivi — monitoring des runs
Tableau des exécutions (statut running/success/error, progression, coût, sorties Iconik/GitHub).
*(prototype : données fictives ; prod : API n8n `/executions` + store de progression — pattern de l'OC Asset Extractor.)*

### ✅ Revue — human-in-the-loop (la valeur métier)
Les décisions qui demandent un œil humain :
- **A5 Quality Gate** : scores /100, valider ≥90 ou relancer A3→A5.
- **A10 Liens** : arbitrer les résolutions « manual review » (lien OC, blog FR sans équivalent…).
- **A8 Images** : préservées (vraies UI) vs localisées — possibilité de forcer.

---

## 2. Moteur de dépendances (le « penser à tout »)

| Champ | Règle |
|---|---|
| `Target Course ID` | requis dès qu'une action est sélectionnée |
| `Email` | requis dès qu'une action est sélectionnée |
| `Source Course ID`, `Source/Target Language` | requis **si** une action Phase 1 est cochée |
| `GDoc URL` | requis **si** Content Type = PROJET |

**Règles (exceptions)**
1. **Phase 2 verrouillée** sans Gold Master Phase 1. Déverrouillage : (a) le cours est déjà traduit
   (statut BFF), **ou** (b) **lancement chaîné** = « Localiser le cours (HTML) » coché dans le même envoi.
2. **Actions Phase 1 = cases indépendantes & combinables** : Localiser HTML / Audit A1 / Score /
   Quality Check — chacune lançable **seule**. Seule « Localiser HTML » produit le Gold Master.
3. **Agents Phase 2 combinables & indépendants** ; **A10 toujours en dernier** (il agrège).
4. **OC Asset Extractor indépendant** (aucun prérequis).
5. Le bouton **Lancer** ne s'active qu'avec ≥1 action + champs requis valides + pas de Phase 2 sans prérequis.

---

## 3. Sortie (payload BFF)
```json
{ "target_course_id":"…", "email":"…",
  "phase1": null | {"content_type":"HTML|GDOC","source_course_id":"…","gdoc_url":null,
     "source_language":"fr|en","target_language":"en-US|fr-FR","domain":null,
     "localize_html":bool,"audit_a1":bool,"localizability_score":bool,"quality_check":bool,"html_file":null},
  "phase2": null | {"a7":bool,"a8":bool,"a9":bool,"a10":bool,"ui_context":null,"video_id":null},
  "tools": null | {"asset_extractor":true}, "chained": bool }
```

---

## 4. Roadmap de câblage (BFF → n8n)
1. **Statut Phase 1** : `GET /api/courses/:id/status` → le BFF lit l'arbre GitHub `07_runs/{src}/output/{target}_localized_*.html` (+ handoff) → renvoie `{done, source, langs, inventory}`.
2. **Lancer** : le BFF traduit le payload en soumissions aux webhooks/forms n8n (Phase 1 `f146189f…`, Phase 2 `leo-assets`) ; si `chained`, enchaîne après livraison.
3. **Suivi** : API n8n `/executions` (dé-flatter le format `flatted`) ou store de progression.
4. **Revue** : lire les rapports (A5 scores, A10 `links_report.csv`, A8 flags) → écrans d'arbitrage → réinjecter les décisions.
5. **Secrets** : tous côté BFF, **jamais** dans le front (cf. `docs/ui_integration/README.md`).
