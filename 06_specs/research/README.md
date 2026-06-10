# Recherche / références externes

Dossier pour les documents de recherche volumineux (PDF, études) qui informent
les décisions d'architecture.

**Convention :** les PDF lourds sont **gardés en local et NON versionnés** (voir
`.gitignore`). On versionne uniquement les **synthèses `.md`** et les décisions qui
en découlent.

## Documents (local, non versionnés)

| Fichier | Sujet | Statut |
|---|---|---|
| `Mastering RAG 2026.pdf` (~32 Mo) | Chunking pour RAG | **Écarté** — orienté RAG (retrieval), hors sujet pour notre traduction exhaustive. Voir ci-dessous. |

## Note — sujet « optimisation du chunking » (manager)

Le manager a demandé de calibrer la taille de chunk du Pre-Processor sur la **fenêtre
de performance** de `gpt-5.5-pro` (pas juste « entrer dans la context window »).

⚠️ Notre pipeline = **traduction exhaustive séquentielle**, PAS du RAG. Aucun embedding,
aucune base vectorielle, aucun retrieval — tous les chunks sont traduits dans l'ordre
puis réassemblés. L'optimum de chunk en RAG (petits chunks = retrieval précis) est
**l'inverse** de l'optimum en traduction (chunks trop petits = perte de contexte de
couture, incohérences de style/terminologie entre morceaux).

**Vraie question :** quelle taille de chunk maximise la **qualité de traduction**
(fidélité + cohérence), en tenant compte du « lost in the middle ».

**Approche recommandée :** test empirique — traduire le même chapitre à 2-3 tailles de
chunk et comparer les scores A5/A6. La théorie seule ne donnera pas notre optimum
(dépend du modèle + du type de contenu : HTML pédagogique technique).

> Indice concret du run 8787276 : le chunk de ~58k caractères (ch4) a obtenu un score
> A5 de **40/100** — symptôme probable d'un chunk trop gros, mal traité par le modèle.
> Argument empirique en faveur d'un seuil de chunk plus bas que les 12k tokens actuels.
