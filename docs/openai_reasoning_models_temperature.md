# OpenAI Reasoning Models — Incompatibilité `temperature`

## Règle

> **Les modèles "reasoning" (thinking) d'OpenAI n'acceptent pas de valeur `temperature` autre que la valeur par défaut (1).**

Tenter de passer `temperature: 0.1` (ou toute autre valeur ≠ 1) provoque une erreur **400** sur chaque requête batch.

---

## Modèles concernés

Tous les modèles de la famille "reasoning" / "pro" chez OpenAI :

| Modèle | Thinking | `temperature` custom supporté |
|---|---|---|
| `gpt-5.5-pro-2026-04-23` | ✅ | ❌ |
| `gpt-5.5-2026-04-23` | ✅ | ❌ |
| `gpt-5.4-pro-2026-03-05` | ✅ | ❌ |
| `gpt-5.4-2026-03-05` | ❌ standard | ✅ |
| `gpt-5.2-2025-12-11` | ❌ standard | ✅ |

**Règle simple :** si le modèle est un `-pro` ou contient du raisonnement interne, ne pas envoyer `temperature`.

---

## Message d'erreur source

Retourné par l'OpenAI Batch API dans le fichier d'erreur (`error_file_id`) :

```json
{
  "response": {
    "status_code": 400,
    "body": {
      "error": {
        "message": "Unsupported value: 'temperature' does not support 0.1 with this model. Only the default (1) value is supported.",
        "type": "invalid_request_error",
        "param": "temperature",
        "code": "unsupported_value"
      }
    }
  }
}
```

Le batch apparaît `completed` mais avec `request_counts.completed = 0` et `request_counts.failed = N` (toutes les requêtes échouent silencieusement).

---

## Pourquoi

Les modèles reasoning contrôlent la qualité et la cohérence de leur output via un processus de **raisonnement interne** (chain-of-thought caché). Le paramètre `temperature` — qui contrôle l'entropie du sampling — n'a pas de sens dans ce contexte : il est géré en interne par le modèle.

---

## Fix appliqué dans CLS v3

**Fichier :** `04_n8n_flows/CLS_v3/[SUB] CLS v3 — Batch Submitter.json` — node `Build JSONL`

```javascript
// ❌ AVANT — injectait temperature même si non fournie
body: {
  model: inp.model || 'gpt-4o',
  messages: [...],
  max_completion_tokens: inp.max_tokens || 16000,
  temperature: inp.temperature ?? 0.1   // fallback 0.1 → erreur sur reasoning models
}

// ✅ APRÈS — temperature omise si non passée explicitement par l'agent
const body = {
  model: inp.model || 'gpt-4o',
  messages: [...],
  max_completion_tokens: inp.max_tokens || 16000
};
if (inp.temperature !== undefined && inp.temperature !== null) {
  body.temperature = inp.temperature;
}
```

Les Build Messages des agents A1–A7 n'envoient plus `temperature` → aucun paramètre dans le corps → compatible avec tous les modèles.

---

## Règle pour les futures montées de version

> **Avant de monter de version sur un nouveau modèle OpenAI :**
> 1. Vérifier dans la liste des modèles si c'est un modèle reasoning (`-pro`, `o-series`, ou description "thinking")
> 2. Si reasoning → ne pas passer `temperature` (ni `top_p`)
> 3. Tester avec un mini-batch (1 requête, `max_completion_tokens: 5`) sans temperature **avant** de lancer un vrai run
> 4. Lire le fichier `error_file_id` si `request_counts.failed > 0` — l'erreur est explicite

Le Batch Submitter CLS v3 est déjà blindé : il n'envoie `temperature` que si l'agent la fournit explicitement.
