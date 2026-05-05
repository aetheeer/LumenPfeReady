# Lumen — déploiement Cloudflare Pages + Worker France Travail

Ce dossier est préparé pour GitHub : les secrets ne sont pas dans le code.

## 1. Avant de pousser sur GitHub

Vérifier que ces éléments sont absents :

- `.env`
- `node_modules/`
- `__MACOSX/`
- `.DS_Store`

Le fichier `.env.example` sert uniquement de modèle local.

Important : si un vrai `FRANCE_TRAVAIL_CLIENT_SECRET` a déjà été placé dans un `.env`, il faut le régénérer dans le portail France Travail avant le déploiement.

## 2. Cloudflare Pages

Connecter le repository GitHub à Cloudflare Pages.

Réglages recommandés :

- Framework preset : `None`
- Build command : vide
- Build output directory : `/`

Ajouter dans Cloudflare Pages > Settings > Environment variables :

```txt
LUMEN_ACCESS_CODE=ton-code-prive
```

Le code d'accès n'est pas dans GitHub. Il est lu depuis Cloudflare via `functions/_middleware.js`.

## 3. Worker France Travail

Le Worker est dans :

```txt
worker/
```

Depuis ce dossier :

```bash
cd worker
npm create cloudflare@latest . -- --type=hello-world
# ou installer wrangler globalement / utiliser npx wrangler
```

Puis ajouter les secrets :

```bash
npx wrangler secret put FRANCE_TRAVAIL_CLIENT_ID
npx wrangler secret put FRANCE_TRAVAIL_CLIENT_SECRET
npx wrangler secret put FRANCE_TRAVAIL_SCOPE
```

Valeur du scope :

```txt
api_offresdemploiv2
```

Déployer :

```bash
npx wrangler deploy
```

## 4. URL à déclarer chez France Travail

Déclarer l'URL publique canonique du prototype, idéalement le domaine Cloudflare Pages personnalisé :

```txt
https://lumen.ton-domaine.fr
```

Puis router le Worker sur le même domaine :

```txt
https://lumen.ton-domaine.fr/api/*
```

Ainsi le front appelle :

```txt
/api/offres?motsCles=designer
```

et le Worker appelle France Travail côté serveur sans exposer le secret.

## 5. Test après déploiement

Tester :

```txt
https://lumen.ton-domaine.fr/api/health
https://lumen.ton-domaine.fr/api/offres?motsCles=designer
```

Si `/api/health` ne répond pas, le routing Worker `/api/*` n'est pas correctement attaché.
