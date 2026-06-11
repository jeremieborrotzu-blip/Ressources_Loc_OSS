# LEO v1 — Assets (Phase 2)

> Pipeline de localisation des **assets** d'un cours OC : images, annexes (XLSX/DOCX/
> PPTX/CSV), transcripts vidéo, et liens externes. Déclenché **après** la Phase 1 (HTML),
> via un **2ᵉ formulaire**, et aligné sur le HTML Gold Master validé.

---

## 1. Nom & périmètre

**LEO v1 — Assets** (« Assets » : terme unique, sans ambiguïté avec *editing*, englobant
images + annexes + liens + transcripts). Nom interne du workflow : `[MAIN] CLS v3 — Media
& Annexes` (`iTIkatL9FJ57zLLd`) — à renommer « Assets » à la prochaine modif (sans changer l'ID).

4 agents :
| Agent | Rôle | Modèle | Mode |
|---|---|---|---|
| **A7** Dubbing Transcript Adapter | Adapte les transcripts timés (SRT/VTT) pour le dubbing IA (Rask/HeyGen/ElevenLabs) | gpt-5.5-pro (Batch) | texte timé |
| **A8** Image Localizer | Détecte, triage et **édite** le texte des images (vision + gpt-image-2) | vision + gpt-image-2 | synchrone |
| **A9** Annexes Localizer | Localise XLSX/DOCX/PPTX/CSV en préservant structure/formules | gpt-5.5-pro (Batch) | map / génération |
| **A10** Links Resolver | Résout les liens externes (switch même-source / équivalent cible / preserve) | gpt-5.5-pro (Batch) | + recherche web |

Prompts système (V2) : `01_prompts/a7_dubbing_transcript_adapter_system.md`,
`a8_image_localizer_system.md`, `a9_annexes_localizer_system.md`, `a10_links_resolver_system.md`.

---

## 2. Contrat d'interface P1 → Assets : `phase1_handoff.json`

Produit en fin de Phase 1, poussé dans `07_runs/{source}/output/{target}_phase1_handoff.json`.
C'est le **contexte canonique** que tout agent Assets charge pour rester cohérent avec le HTML.

```json
{
  "meta": { "source_course_id","target_course_id","source_language","target_language",
            "direction","detected_domain","phase1_qa_score" },
  "gold_master": { "html_path","html_url" },
  "glossary": { "common", "domain_tm", "run_terms" },     // termes validés
  "concept_swaps": [ ... ],   // A4 swap_log (SIRET→EIN, RTT→PTO...)
  "cultural_flags": [ ... ],  // A1
  "media_inventory": [ {"type","url","location":"chN","risk"} ],  // A1 — LE DISPATCHER
  "qa": { "a5_scores","a6_issues","structural_checks" }
}
```

### Le `media_inventory` = dispatcher de la Phase 2
| `type` | → agent |
|---|---|
| `image` | A8 |
| `pdf` / `docx` / `xlsx` / `pptx` | A9 |
| `video` / `screencast` | A7 |
| `link` | A10 |

> Le `risk` (`ui_mismatch` / `fr_only` / `ok`) affine le routage des images : à localiser vs à préserver.

---

## 3. Lancement & hiérarchie

- **2 formulaires distincts** (Phase 1 / Assets), même triplet d'IDs (`source` + `target` + direction).
- **Gate de dépendances** : tout flow Assets exige que `{target}_phase1_handoff.json` + le HTML existent sur GitHub → sinon email d'erreur (« lance d'abord la Phase 1 »).
- **Ordre** : A8/A9/A7 en parallèle (après le handoff) ; **A10 en dernier** (agrège les liens du HTML + annexes + images + captions ; A9 lui délègue ses liens via `link_items_for_A10`).

---

## 4. A8 — Image Localizer (dérisqué 2026-06-11)

### Architecture (synchrone, 4 étapes par image)
```
media_inventory (images, hors banners) + HTML Gold Master + glossary + swaps
   1. Download (URL complète user.oc-static.com)
   2. ANALYSE vision → détecte texte, triage, aligne HTML/glossaire → traductions exactes + termes à préserver
   3. ÉDITION gpt-image-2 (/v1/images/edits) avec prompt PIXEL-PERFECT explicite
   4. VÉRIF re-OCR de l'image éditée + comparaison aux traductions → flag si écart
→ push image localisée (GitHub/Iconik) + rapport A8 JSON
```

### Règles métier
- **Bannières exclues** (nom de fichier « banner » / « OC-Course-Banners »).
- **Screenshots UI réels → preserve** (l'édition les falsifierait). Seuls diagrammes / infographies / tableaux sont édités.
- **Identifiants techniques préservés** dans l'image (noms de machines, acronymes, RFC, code, Diffie-Hellman…).

### Résultats du dérisquage (`06_specs/research/a8_pixel_test/`)
- ✅ Édition d'un **tableau réel** (IKEv1/IKEv2) : layout **quasi pixel-perfect**, texte traduit, **tous les termes techniques préservés**.
- ⚠️ L'API `/images/edits` **régénère** (≠ inpainting du ChatGPT web) → léger drift possible ; et un faux-ami a échappé (« acquittements » → « acquittals ») **malgré** la traduction exacte fournie → d'où la **vérification post-édition** obligatoire (étape 4).
- ⚙️ `input_fidelity` non supporté par gpt-image-2.

### Accès aux images
URLs `user.oc-static.com` accessibles **en direct** avec l'URL **complète** (timestamp **+ nom de fichier**). Backup : OC Asset Extractor (`XtF1ec3MgRLNDqBz`, ZIP de tous les assets).

---

## 5. Coûts (réels)

| Poste | Coût |
|---|---|
| A8 — par image (analyse + édition + vérif) | ~$0.10 |
| A8 — par cours (~15 images, ~50 % éditées) | ~$1.5 |

→ Les assets pèsent **~10 %** du coût d'un cours ; le texte (Phase 1, ~$5/partie) domine.
Détail : [pricing gpt-image mesuré sur tokens réels](../../06_specs/research/a8_pixel_test/README.md).

---

## 6. Reste à construire

- **Build Phase 1 Handoff** intégré au pipeline (générer `phase1_handoff.json` automatiquement en fin de P1 — dépend du refactor lot-synchrone, voir [qa_join_and_delivery.md](qa_join_and_delivery.md)).
- **Workflows A8** (synchrone vision+image), **A9**, **A10** (faisabilité A8 validée ; A9/A10 à concevoir).
