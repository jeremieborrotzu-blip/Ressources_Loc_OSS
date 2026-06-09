# OC HTML Extractor — Documentation

> Ensemble de workflows n8n — aucune IA — extraction pure via API OC

---

## Rôle

Extrait le contenu HTML complet d'un cours OpenClassrooms depuis l'API OC staging, chapitre par chapitre, et le livre comme un seul bloc HTML propre et structuré, prêt à être injecté dans le pipeline CLS v3.

---

## Les 4 workflows

| Workflow | ID | Usage |
|---|---|---|
| **[CLS] OC HTML Extraction — MAIN** | `0voyHfykeNyO7SoV` | Entrée webhook depuis CLS v3 MAIN |
| **[CLS] OC HTML Extraction — SUB** | `RtYARZLkIJyKeoWz` | Logique d'extraction appelée par CLS v3 |
| **[SUB] OC HTML Course extraction** | `7FmkshRYxsvF4tCj` | Variante appelable depuis d'autres workflows |
| **[MAIN - FORM] OC HTML Course extraction** | `WJPSpr8dELxKu0mT` | Usage manuel via formulaire n8n |

Le workflow utilisé par CLS v3 est **[CLS] OC HTML Extraction — SUB** (`RtYARZLkIJyKeoWz`).

---

## Fonctionnement étape par étape

```
Params (Course ID)
    ↓
Credentials — charge domain, OAuth credentials, Cloudflare Access tokens
    ↓
Get token — POST /oauth2/token → access_token
    ↓
Check token — vérifie que le token est valide
    ├── KO → Stop and Error3 ("Cannot authenticate to OC API")
    └── OK ↓
Get course — GET /courses/{id} → métadonnées du cours
    ↓
If not single page — le cours a-t-il plusieurs chapitres ?
    ├── Page unique → récupère directement le HTML de la page
    └── Multi-chapitres ↓
Get TOC — GET /courses/{id}/table-of-content → structure du cours
    ↓
Parse TOC — construit la liste ordonnée [partIndex, chapterIndex, chapterId, ...]
    ↓
Loop Over Items — itère sur chaque chapitre
    ├── If intro → Get Intro (chapitre 0 = introduction)
    └── Sinon  → Get chapter (GET /courses/{id}/chapters/{chapterId})
    ↓
Save html — stocke le HTML brut de chaque chapitre dans l'item
    ↓
Merge HTML — assemble tous les chapitres en un seul bloc HTML
              injecte les balises <h2> (parties) et <h3> (chapitres)
    ↓
Sanitize HTML — nettoie les attributs parasites :
                supprime id="…" et data-claire-element-id="…"
    ↓
Retourne {html: "..."} au workflow appelant
```

---

## Authentification

L'API OC staging est protégée par deux couches :

**1. Cloudflare Access**
- Headers : `CF-Access-Client-Id` + `CF-Access-Client-Secret`
- Bloque l'accès réseau avant même d'atteindre l'API

**2. OAuth2 client_credentials**
- Endpoint : `POST /oauth2/token`
- Authorization : `Basic {ocBasic}` (base64 `client_id:client_secret`)
- Scope : `user_learning_activity`
- Retourne un `access_token` Bearer utilisé pour tous les appels suivants

**Domaine :** `api-staging.openclassrooms.tech`

---

## Structure du HTML produit

```html
<!-- Introduction (chapitre 0) -->
{html de l'introduction}

<!-- Pour chaque partie -->
<h2>Nom de la partie</h2>
<h3>Nom du chapitre</h3>
{html du chapitre}

<h3>Nom du chapitre suivant</h3>
{html du chapitre suivant}
...
```

Les attributs `id` et `data-claire-element-id` sont supprimés par Sanitize HTML — ils sont propres à la plateforme OC et inutiles pour la localisation.

---

## Gestion des erreurs

4 nœuds `Stop and Error` couvrent les cas d'échec :

| Erreur | Cause |
|---|---|
| `Stop and Error` | Cours introuvable ou accès refusé |
| `Stop and Error1` | Table of contents vide ou malformée |
| `Stop and Error2` | Chapitre introuvable pendant le loop |
| `Stop and Error3` | **Authentification OC échouée** (token invalide ou API staging down → 504) |

L'erreur `Stop and Error3` est la plus fréquente en cas d'incident côté OC (`Cannot authenticate to OC API, please contact @maxime.rancon`).

---

## Ce que l'extracteur ne fait pas

- ❌ Ne télécharge pas les assets (images, fichiers) — rôle de l'OC Asset Extractor
- ❌ Ne découpe pas en chunks — rôle du Pre-Processor CLS v3
- ❌ Ne modifie pas le contenu HTML — extraction fidèle uniquement
- ❌ Ne fonctionne pas si l'API OC staging est down

---

## Dépendances externes

| Service | Usage |
|---|---|
| `api-staging.openclassrooms.tech` | API OC — doit être accessible |
| Cloudflare Access | Authentification réseau — credentials stockés dans n8n |
| Compte OAuth OC | Client credentials — stockés dans n8n |

> **Point de fragilité :** l'extracteur dépend entièrement de la disponibilité de l'API OC staging. En cas de 504, tout le pipeline CLS v3 est bloqué à la première étape.
