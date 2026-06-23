# Contrat UI — OC Static Asset Extractor

> Fonctionnalité « Extraction d'assets » de l'UI opérateur. Lis d'abord [`README.md`](README.md).
> Auto-suffisant : tout ce que Codex doit savoir, sans accès au n8n live.
> **C'est le meilleur gabarit d'intégration** : il implémente déjà la boucle async complète
> (upload → traitement en tâche de fond → polling → download).

---

## 1. Ce que fait l'outil

À partir du **HTML d'un cours OpenClassrooms** (uploadé), il récupère **tous les assets statiques
`oc-static.com`** référencés (images **et** documents : pdf/xlsx/ods/docx/pptx/csv), les télécharge
en parallèle, et livre **une archive ZIP**. **Les banners sont exclus automatiquement.**
Outil **autonome** (aucune IA, aucun secret — `oc-static.com` est public). En amont de la Phase 2.

Workflow n8n : `OC Static Asset Extractor` (id `XtF1ec3MgRLNDqBz`, actif). Logique d'extraction
(nœud *Download All*) : regex multi-hôtes `https?://[^\s"'<>]*oc-static\.com/[^\s"'<>]+`, filtre par
**extension en fin d'URL**, exclusion des fichiers dont le nom contient « banner ».

## 2. Endpoints n8n existants (le BFF proxifie ça)

Tous sur `http://<n8n-host>:5678`. **`uploadId` = UUID généré côté client** (corrèle upload→statut→download).

| Méthode | Endpoint | Rôle | Entrée | Sortie |
|---|---|---|---|---|
| `GET` | `/webhook/oc-extractor` | sert la mini-page HTML (réf. UX) | — | `text/html` |
| `POST` | `/webhook/oc-upload` | lance l'extraction en tâche de fond | `multipart/form-data` : `htmlFile` (le .html), `uploadId` | `200` immédiat (fire-and-forget) |
| `GET` | `/webhook/oc-status?id={uploadId}` | progression temps réel (polling) | query `id` | JSON statut (cf. §3) |
| `GET` | `/webhook/oc-download?id={uploadId}` | livre le ZIP (puis nettoie) | query `id` | `application/zip` (`oc_assets.zip`) |

> Le `POST oc-upload` répond tout de suite ; le traitement tourne en fond et écrit un store de statut
> (`progress_<uploadId>.json`). L'UI **poll** `oc-status` jusqu'à `done:true`, puis appelle `oc-download`.
> `oc-download` **supprime** le zip + le statut après lecture (one-shot).

## 3. Schéma de statut (à rendre dans l'UI)
```jsonc
// pendant le traitement
{ "current": 12, "total": 27, "done": false, "errors": [] }
// avant que le job soit prêt (id pas encore connu)
{ "current": 0, "total": 0, "done": false, "notReady": true }
// terminé
{ "current": 27, "total": 27, "done": true, "errors": [], "fileCount": 27 }
// erreurs partielles éventuelles
{ "errors": [ { "url": "https://…", "err": "HTTP 404" } ] }
```
- Barre de progression = `current / total`. `notReady:true` → garder l'état « démarrage ».
- `fileCount` = nb de fichiers réellement dans le ZIP. `errors[]` = téléchargements échoués (afficher en avertissement, non bloquant).

## 4. API que le BFF expose à l'UI (RECOMMANDÉ)
```
POST /api/tools/asset-extractor/run        (multipart: htmlFile)
  → 202 { "job_id": "uuid" }               // le BFF génère l'uploadId et proxifie oc-upload

GET  /api/tools/asset-extractor/:job_id/status
  → 200 { "current", "total", "done", "fileCount", "errors":[] }   // proxy oc-status

GET  /api/tools/asset-extractor/:job_id/download
  → 200 application/zip                      // proxy oc-download (stream)
```
> Le BFF peut aussi exposer un endpoint « liste du contenu du ZIP » (en dézippant côté serveur) pour
> alimenter l'écran d'inspection (§5.3) sans forcer l'utilisateur à télécharger.

## 5. Écrans UI

### 5.1 Lancer
Zone **drag & drop** du fichier `.html` du cours (accept `.html,.htm,.txt`). Bouton « Extraire les assets ».
(V2 possible : déclenchement par `course_id` au lieu de l'upload — à ajouter côté n8n plus tard.)

### 5.2 Progression
Barre `current/total` + libellés d'étapes (Collecte → Compression → Prêt), gestion `notReady`.
Bandeau d'avertissement si `errors[]` non vide (liste repliable).

### 5.3 Résultat & inspection (la valeur ajoutée vs l'outil actuel)
- Bouton **Télécharger le ZIP**.
- **Aperçu du contenu** : table des fichiers (nom, type déduit de l'extension, taille), groupés
  Images / Documents. Compteur « N fichiers, banners exclus ».
- **Chaînage Phase 2** (différenciant) : cases pour sélectionner des assets → boutons « Envoyer à A8
  (images) » / « Envoyer à A9 (annexes) » → déclenche les agents correspondants sans quitter l'écran.

## 6. Cas limites
- `total: 0` → « Aucun asset oc-static trouvé dans ce HTML » (pas une erreur).
- ZIP volumineux → téléchargement en streaming.
- `oc-download` est **one-shot** (supprime après lecture) : si l'utilisateur recharge, relancer un run.
- Idempotence : un même `job_id` ne se relance pas ; nouveau fichier = nouveau job.
- Aucun secret côté front (rien à cacher ici, mais garder le proxy BFF pour l'uniformité).

## 7. Checklist d'acceptation (DoD)
- [ ] Upload d'un `.html` → job lancé, `job_id` renvoyé.
- [ ] Progression live (`current/total`) jusqu'à `done`.
- [ ] Téléchargement du ZIP (contenu : images + documents, **aucun banner**).
- [ ] Aperçu du contenu du ZIP dans l'UI.
- [ ] (Optionnel V1) chaînage « envoyer à A8/A9 ».
- [ ] États vides / erreurs partielles gérés.
