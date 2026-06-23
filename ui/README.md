# LEO v1 — Super UI (prototype)

Prototype **interactif et autonome** de l'interface de pilotage LEO. Aucun build, aucun secret :
ouvrir `ui/index.html` dans un navigateur.

> But de ce prototype : valider **l'IA des options + le moteur de dépendances + l'UX** (séparation
> Phase 1 / Phase 2, champs conditionnels) **avant** de le câbler à n8n via le BFF (cf.
> [`../docs/ui_integration/`](../docs/ui_integration/)).

## Logo
Déposer le PNG fourni dans `ui/assets/leo-logo.png` → il remplace automatiquement le logo SVG de secours.

## Modèle de dépendances encodé (le « penser à tout »)

**Champs**
- `Target Course ID` — **toujours requis** dès qu'une action est sélectionnée (7 chiffres).
- `Email` — **conditionnel** : requis seulement si le toggle « rapport par email » est activé.
- `Source Course ID` + `Direction` — **conditionnels** : requis seulement si la Phase 1 est activée.

**Règles (exceptions)**
1. **Phase 2 verrouillée** tant qu'il n'existe pas de traduction Phase 1 (Gold Master) pour le cours.
   Déverrouillage par : (a) le cours a déjà une Phase 1 (statut renvoyé par le BFF), **ou**
   (b) **lancement chaîné** = Phase 1 « Localisation complète » cochée dans le même envoi.
2. **Modes Phase 1 exclusifs** (Audit / Score / Quality Check / Localisation complète) — un seul.
   Seule « Localisation complète » produit le livrable qui débloque la Phase 2.
3. **Agents Phase 2 combinables & indépendants** (toute combinaison de A7/A8/A9/A10).
   **A10 s'exécute toujours en dernier** (il agrège les liens des autres).
4. **OC Asset Extractor = indépendant** (aucun prérequis Phase 1).
5. Le bouton **Lancer** ne s'active que si : ≥1 action + tous les champs requis valides + pas de Phase 2 sans prérequis.

**Séparation visuelle**
- Phase 1 « Contenu » = thème **bleu/indigo** (la bulle de traduction du logo).
- Phase 2 « Multimédia & Assets » = thème **orange** (l'icône document/asset du logo).
- Outils = thème **teal**.

## Sortie
Le bouton « Lancer LEO » produit le **payload** destiné au BFF (affiché en prototype, pas d'appel réel) :
```json
{ "target_course_id":"…", "email":null|"…",
  "phase1":null|{"mode":"audit|score|qa|full","source_course_id":"…","direction":"fr>en|en>fr"},
  "phase2":null|{"a7":bool,"a8":bool,"a9":bool,"a10":bool},
  "tools":null|{"asset_extractor":true}, "chained":bool }
```
> Note démo : un interrupteur « simuler Phase 1 déjà faite » permet de tester le déverrouillage de la
> Phase 2 sans backend. En prod, ce statut viendra du BFF (lecture de l'arbre GitHub `07_runs/`).

## Prochaine étape
Brancher ce front au **BFF** (cf. contrats `docs/ui_integration/`) : `target_course_id` → vrai statut
Phase 1, puis `POST` vers les webhooks n8n (form `leo-assets` / Phase 1) avec suivi d'exécution.
