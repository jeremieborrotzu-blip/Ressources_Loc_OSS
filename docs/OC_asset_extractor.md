# OC Static Asset Extractor — Documentation

> Workflow n8n autonome — ID : `XtF1ec3MgRLNDqBz`
> Aucune IA — outil d'extraction et d'empaquetage pur

---

## Rôle

Extrait tous les assets statiques d'un cours OpenClassrooms (images **et** documents téléchargeables) hébergés sur **n'importe quel hôte `oc-static.com`** (`user.oc-static.com`, `course.oc-static.com`, ainsi que le miroir S3 `s3.eu-west-1.amazonaws.com/course.oc-static.com/…`), les télécharge en parallèle et les livre sous forme d'une archive ZIP prête à être traitée. **Les banners sont exclus automatiquement.**

C'est un outil **autonome et indépendant** — il n'est pas intégré dans le pipeline CLS v3. Il est déclenché manuellement via une interface web intégrée.

**URL du formulaire :** `http://localhost:5678/webhook/oc-extractor`

---

## Interface utilisateur

L'extracteur expose sa propre mini-application web via des webhooks n8n :

1. **Page de formulaire** (`GET /webhook/oc-extractor`) — interface HTML où l'utilisateur **dépose (drag & drop) le fichier HTML du cours** (pas une URL)
2. **Traitement** (`POST /webhook/oc-upload`) — reçoit le HTML uploadé, démarre l'extraction en arrière-plan
3. **Polling statut** (`GET /webhook/…/status`) — l'interface interroge régulièrement l'avancement (temps réel)
4. **Téléchargement** (`GET /webhook/…/download`) — livre le ZIP une fois l'extraction terminée

---

## Fonctionnement technique

```
Formulaire (upload du HTML du cours)
    ↓
Download All — scraping de tous les hôtes oc-static.com
    ├── regex : /https?:\/\/[^\s"'<>]*oc-static\.com\/[^\s"'<>]+/g
    ├── filtre extension (fin d'URL) : png/jpg/svg… + pdf/xlsx/ods/docx/pptx/csv/zip…
    ├── exclusion banners : nom de fichier matchant /banner/i
    ├── téléchargement parallèle des assets
    └── construction du ZIP en mémoire (zlib custom, base64 inline)
    ↓
Read Status — polling temps réel de l'avancement
    ↓
Read ZIP — sérialisation de l'archive
    ↓
Return ZIP — livraison au navigateur
```

### Points techniques notables
- **Pas de `fetch()`** : les téléchargements utilisent `require('https')` (contrainte n8n task runner)
- **ZIP custom** : le nœud natif Compression est incompatible avec le binary data inline — implémentation zlib maison en base64
- **Polling côté client** : le statut est interrogé par l'interface toutes les N secondes jusqu'à `status: done`
- **Aucune persistance** : le ZIP est construit en mémoire, pas de stockage intermédiaire

---

## Ce que l'extracteur produit

Une archive `.zip` contenant tous les fichiers statiques `oc-static.com` du cours, **banners exclus** :
- Images (`.png`, `.jpg`, `.gif`, `.svg`, …) — depuis `user.oc-static.com`
- **Documents téléchargeables** (`.pdf`, `.xlsx`, `.ods`, `.docx`, `.pptx`, `.csv`, …) — depuis `course.oc-static.com` (+ miroir S3)
- Éventuellement : polices, icônes, autres ressources statiques

> **Historique :** jusqu'au 2026-06-16, l'extracteur ne scrapait que `user.oc-static.com` → il **ratait tous les documents** (PDF/xlsx/ods…, hébergés sur `course.oc-static.com`) et **embarquait les banners**. Corrigé : scan multi-hôtes `oc-static.com`, filtre par extension en fin d'URL, exclusion des banners par nom de fichier.

---

## Ce que l'extracteur ne fait pas

- ❌ Ne traite pas les vidéos Vimeo (pas hébergées sur oc-static)
- ❌ Ne localise rien — c'est un outil de collecte uniquement
- ❌ Ne s'intègre pas à Iconik directement
- ❌ Ne fait pas partie du pipeline CLS v3

---

## Usage dans le workflow de localisation

L'extracteur est utilisé **en amont** du pipeline Phase 2, manuellement par le chef de projet :

1. Lancer l'extracteur sur le cours source → obtenir le ZIP
2. Inspecter le contenu → identifier les fichiers à localiser
3. Alimenter le pipeline Phase 2 (AWS Downloader / A8 / A9 / A10) avec les assets pertinents

---

## Accès

Déclenché depuis le navigateur via l'URL webhook exposée par n8n.
Workflow ID n8n : `XtF1ec3MgRLNDqBz`
