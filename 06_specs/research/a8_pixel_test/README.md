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

---

## Test 2 — VRAIE image du cours (tableau IKEv1/IKEv2, ch3 image5.png)

- `real_table_source_FR.png` — tableau comparatif FR (image de contenu réelle, 873x608)
- `real_table_localized_EN.png` — localisé EN via gpt-image-2 /images/edits

### Verdict (bien meilleur que le test 1 diagramme)
- ✅ Layout tableau **quasi pixel-perfect** : structure/colonnes/couleurs/fond préservés.
- ✅ Texte éditorial traduit correctement.
- ✅ **Termes techniques tous préservés** : IKEv1/IKEv2, ISAKMP SA, IPsec SA, IKE_SA_INIT,
  IKE_AUTH, RFC 4306/7296, Diffie-Hellman, NAT-T, dates.
- ⚠️ 1 faux-ami : "acquittements" → "acquittals" (devrait être "acknowledgments"),
  MALGRÉ la traduction exacte fournie. → A8 doit VÉRIFIER post-édition (re-OCR +
  comparaison aux traductions attendues, flag si écart).
- Note : `input_fidelity` non supporté par gpt-image-2 (param de gpt-image-1).

### Règle métier : les BANNIÈRES ne sont pas traitées (exclure par nom "banner").
