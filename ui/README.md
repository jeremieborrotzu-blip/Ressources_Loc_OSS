# LEO v1 — Super UI (poste de pilotage de localisation)

Interface opérateur **autonome** au-dessus du pipeline LEO (n8n). Ouvrir `ui/index.html` dans un
navigateur. Aucun build, aucun secret. Prototype destiné à être câblé au **BFF** (cf.
[`../docs/ui_integration/`](../docs/ui_integration/)).

> Poste d'ops de localisation : **lancer**, **suivre**, **arbitrer** (human-in-the-loop).
> Logo : déposer le PNG fourni dans `ui/assets/leo-logo.png` (remplace le SVG de secours).

---

## 1. Les 3 espaces (sidebar)
- **🚀 Lancer** — lanceur intelligent (détection auto du statut, estimation de coût, moteur de dépendances).
- **📡 Suivi** — monitoring des runs (statut/progression/coût/sorties). *mock → en prod : API n8n.*
- **✅ Revue** — human-in-the-loop : A5 Quality Gate (≥90), A10 liens « manual review », A8 images préservées/localisées.

## 2. Le modèle métier (ce qui pilote le lanceur)

Le **Type de contenu** est la 1ʳᵉ décision et il commande l'**identité** :

| | **COURS (HTML)** | **PROJET (GDoc → DOCX)** |
|---|---|---|
| **Identité** | `Source Course ID` + `Target Course ID` | `GDoc URL` (source) + `Parcours ID` + `N° projet` *(naming des dossiers de sortie — rien n'est « cherché » avec)* |
| **Phase 1 — Contenu** | Localiser HTML → 8 fichiers GitHub (Gold Master) · + Audit/Score/QA | Localiser GDoc → **DOCX miroir** (mise en forme intégralement préservée) · + Audit/Score/QA |
| **Phase 2 — Assets & Liens** *(scanne la source)* | images **A8** · annexes/docs **A9** · liens **A10** · transcripts vidéo **A7** | images **A8** · docs liés (xlsx/pptx/docx) **A9** · liens **A10** — *pas d'A7 (pas de vidéo : le projet est relié à un cours)* |

Cadrage commun aux deux : `Source/Target Language`, `Domain`, `Email`.

## 3. Règles de dépendance (le « penser à tout »)
1. **Type de contenu** → identité conditionnelle (IDs cours **vs** GDoc + Parcours/Pn). Validation par type
   (IDs 4–8 chiffres ; `Pn` pour le projet ; GDoc URL).
2. **Contenu d'abord, toujours** : la Phase 2 (assets & liens) est **verrouillée** tant que le contenu n'est
   pas localisé. Déblocage : (a) contenu déjà traduit, **ou** (b) **lancement chaîné** (« Localiser » coché).
   → Vrai pour **cours ET projet**.
3. **Actions Phase 1 = cases indépendantes & combinables** (audit seul, QA seul…). Seul « Localiser » produit le livrable.
4. **Agents Phase 2 combinables & indépendants** ; **A10 toujours en dernier** ; **A7 = cours uniquement**.
5. **OC Asset Extractor** indépendant. Bouton **Lancer** gated (≥1 action + champs requis valides + prérequis).

## 4. Sortie (payload BFF)
```json
{ "content_type":"COURS|PROJET","email":"…","source_language":"fr|en","target_language":"en-US|fr-FR","domain":null,
  "identity": {"source_course_id":"…","target_course_id":"…"}            // COURS
            | {"gdoc_url":"…","parcours_id":"1047","project_no":"P2","output":"DOCX"},  // PROJET
  "phase1": null | {"localize":bool,"audit_a1":bool,"localizability_score":bool,"quality_check":bool},
  "phase2": null | {"a7":bool,"a8":bool,"a9":bool,"a10":bool},
  "tools":  null | {"asset_extractor":true}, "chained": bool }
```

## 5. Roadmap de câblage (BFF → n8n)
1. **Statut contenu** : `GET /api/content/:id/status` → le BFF lit l'arbre GitHub `07_runs/` (cours) → `{done, source, langs, inventory}`.
2. **Lancer** : le BFF traduit le payload en soumissions n8n (Phase 1 `f146189f…`, Phase 2 `leo-assets` ; projet = flux GDoc→DOCX). Si `chained`, enchaîne après livraison du contenu.
3. **Suivi** : API n8n `/executions` (dé-flatter le format `flatted`) ou store de progression.
4. **Revue** : lire les rapports (A5 scores, A10 `links_report.csv`, A8 flags) → écrans d'arbitrage → réinjecter.
5. **Secrets** : tous côté BFF, **jamais** dans le front.

> ⚠️ Hors périmètre pour l'instant : le flux **Notion** (extract `.md` → localisation → re-push automatisé)
> est une idée long-terme **non encore conçue** — à ne pas implémenter tant qu'elle n'est pas cadrée.
