# Référence — anciens SUB workflows (legacy, qui fonctionnent)

Workflows de prod antérieurs, conservés comme **référence technique** pour LEO v1.

| Fichier | Sert de référence pour |
|---|---|
| `Copy videos to iconik.json` | **Séquence d'upload Iconik S3** (create asset → format → fileset → upload URL → PUT S3 → patch CLOSED). Base pour A7/A8/A9. |
| `Get captions.json` | **Extraction des transcripts/captions Vimeo** — base pour A7. |
| `HTML Course get.json` | Extraction HTML cours OC (ancienne version). |

> ⚠️ Référence uniquement (ne pas activer tels quels). La séquence d'upload S3 vérifiée
> est documentée dans la mémoire iconik-api-reference.
