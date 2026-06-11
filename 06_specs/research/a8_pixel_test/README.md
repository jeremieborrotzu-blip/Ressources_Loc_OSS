# A8 — Test de dérisquage édition d'image (2026-06-11)

Test de l'API OpenAI `gpt-image-2` (`/v1/images/edits`) pour valider la
localisation d'image avec prompt "pixel-perfect".

- `test_source_FR.png` — image générée (gpt-image-2) avec texte FR
- `test_localized_EN.png` — même image localisée EN via /images/edits

## Verdict
- ✅ Traduction correcte, layout/couleurs/composition cohérents → **excellent pour
  diagrammes / infographies / illustrations**.
- ⚠️ **Pas pixel-perfect strict** : léger drift de position/taille, reformulation
  ("Encrypted IPsec tunnel" → "IPSEC encrypted tunnel"). L'API régénère, elle ne
  fait pas l'inpainting chirurgical du ChatGPT web.
- ❌ **Inadapté aux screenshots UI réels** (falsifierait l'interface) → preserve/manual_review.
- Pour pixel-perfect sur cas critiques : masque (inpainting zone texte) = étape +1.

## Obstacle séparé identifié
Les images source OC (`user.oc-static.com`) renvoient **403 (S3 AccessDenied)** en
accès direct → A8 a besoin d'un accès authentifié (token OC / OC Asset Extractor).
