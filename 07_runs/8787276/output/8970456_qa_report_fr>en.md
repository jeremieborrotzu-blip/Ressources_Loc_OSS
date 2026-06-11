# QA Report — 8970456

| Field | Value |
|---|---|
| Source ID | `8787276` |
| Target ID | `8970456` |
| Direction | fr>en |
| QA Score (moyenne A5) | **99.8/100** |
| Chunks | 4 (tous PASS ≥90) |

> ⚠️ Livrable **assemblé manuellement** depuis les sorties A4/A5 du run de la nuit (2026-06-11), le pipeline n'ayant pas atteint A6 (bug du Buffer corrigé séparément). Contenu = sortie A4 (adapté culturellement) **sans le polish A6 final**. Qualité A5 validée (tous chunks ≥90).

## État des lieux du HTML de sortie

**Verdict structurel : ✅ HTML équilibré**

**Métriques :** 33,343 caractères · 1 partie(s) (h2) · 3 h3 · 8 chapitres (h4) · 33 blocs de code · 0 liens · 9 images

## Scores par chapitre (A5)

| Chunk | Chapitre | Score |
|---|---|---|
| ch0 | Course Introduction | 100/100 |
| ch2 | Tirez un maximum de ce cours | 100/100 |
| ch3 | Découvrez la topologie utilisée | 99/100 |
| ch4 | Configurez IPSEC | 100/100 |

## Limites connues (à corriger dans le pipeline)
- Titre de **partie h2** « Configurez un VPN IPSEC dans Cisco Packet Tracer » : non traduit par les agents (hors chunks) → traduit manuellement ici en « Configure a Site-to-Site IPsec VPN in Cisco Packet Tracer ». À gérer dans Pre-Processor/Reassembler.
- **A6 non appliqué** (proofreading final ISO 17100) — le run sera rejoué proprement une fois le join réparé.
