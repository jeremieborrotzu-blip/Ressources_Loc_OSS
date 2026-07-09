# 🚀 Redéployer LEO sur un nouveau Mac (depuis ce HDD)

Ce que contient le HDD :
- `STRATEGIE DE PEMT/Ressources_Loc_OSS/`  → le projet complet (code BFF+UI, exports, TM, docs, ET l'état local bff/review_state + bff/downloads)
- `n8n_backup_20260709/`                   → snapshot du volume n8n (workflows) + clé + README + config
- (option) fichiers de mémoire / décisions d'archi

---

## 0. Prérequis à installer sur le nouveau Mac
- **Docker Desktop** (installer + lancer, attendre que la baleine soit stable)
- **Node.js 18+** (le BFF utilise fetch/FormData natifs → Node 18 minimum)
- **Git**

## 1. Copier le dossier de travail sur le disque INTERNE
Ne pas travailler depuis le HDD exFAT (git capricieux + lent). Copier vers le home :
```
cp -R "/Volumes/<TON_HDD>/N8N_LOCAL/STRATEGIE DE PEMT/Ressources_Loc_OSS" ~/LEO
```
(le sous-dossier `bff/review_state/` et `bff/downloads/` viennent avec = ton état de revue préservé)

## 2. Restaurer n8n (les workflows)
Docker ne partage pas /Volumes par défaut → copie d'abord l'archive dans le home :
```
cp "/Volumes/<TON_HDD>/N8N_LOCAL/n8n_backup_20260709/n8n_volume.tar.gz" ~/
docker volume create n8n_local_n8n_data
docker run --rm -v n8n_local_n8n_data:/data -v ~/:/backup alpine tar xzf /backup/n8n_volume.tar.gz -C /data
```
Lancer n8n avec **la MÊME clé de chiffrement** (sinon les credentials sont illisibles) — clé = `N8N_ENCRYPTION_KEY` dans `n8n_backup_20260709/n8n_env.txt` :
```
docker run -d --name n8n -p 5678:5678 \
  -e N8N_ENCRYPTION_KEY='<clé copiée depuis n8n_env.txt>' \
  -v n8n_local_n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```
Vérifier : http://localhost:5678 s'ouvre et les workflows sont là.

## 3. Lancer le BFF
```
cd ~/LEO/bff
npm install
node server.js      # sert l'UI sur http://localhost:4317
```

## 4. Ouvrir l'interface
http://localhost:4317/leo-v1.1.html

---

## ⚠️ 5. Rebrancher TES propres credentials (indispensable pour faire tourner)
Les secrets OC sont inline dans les Code nodes n8n et **seront révoqués** au départ de l'entreprise :
- **OpenAI** (facturation OC) → mettre TA clé `sk-...` dans les nodes agents / leo-adhoc.
- **Iconik** (app_id / Auth-Token / storage_id) → ton propre Iconik, ou remplacer par un autre stockage (S3…).
- **API OC staging** (`ocBasic` + Cloudflare cfId/cfSecret) → ne marchera plus (API interne OC). L'extraction par ID est morte de toute façon → partir d'un **HTML fourni via le form n8n**.
- **Vimeo** (A7) → ta clé si besoin.
- **GitHub** : le remote `jeremieborrotzu-blip` sera inaccessible → repointer `git remote set-url origin <ton-repo-perso>`.

Tant que tu n'as pas rebranché au moins **ta clé OpenAI**, les agents ne tournent pas — mais l'UI, la revue, l'état, les workflows sont tous là et inspectables.

## Ordre de dépendance (résumé)
Docker → volume n8n → clé → n8n up → BFF (npm) → UI → tes credentials.
