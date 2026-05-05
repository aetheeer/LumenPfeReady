# Configuration API France Travail — Lumen

Cette version ajoute un serveur local Node.js qui sert le prototype existant et joue le rôle de proxy sécurisé vers l’API France Travail.

## Pourquoi ce serveur ?

La clé secrète France Travail ne doit jamais être écrite dans le JavaScript du navigateur. Le fichier `server.js` récupère le token OAuth côté serveur, puis expose des routes locales simples :

- `GET /api/health`
- `GET /api/france-travail/offres`
- `GET /api/france-travail/offres/:id`
- `GET /api/offres` — alias de compatibilité

## Installation

1. Ouvre le dossier `ConceptLumen` dans VS Code.
2. Copie `.env.example` en `.env`.
3. Dans `.env`, remplace `COLLE_TA_CLE_SECRETE_ICI` par la clé secrète France Travail.
4. Lance :

```bash
npm install
npm run dev
```

Ou double-clique sur `start-server.command` sur macOS.

## URLs utiles

Prototype :

```txt
http://localhost:3000
```

Test serveur :

```txt
http://localhost:3000/api/health
```

Test API offres :

```txt
http://localhost:3000/api/france-travail/offres?motsCles=designer&commune=44109&rayon=20&range=0-9
```

## Côté front

Le fichier `apis/lumenApi.js` contient maintenant :

```js
searchFranceTravailOffers(params)
getFranceTravailOfferDetail(offerId)
```

Le code actuel de la carte n’a pas été modifié. L’intégration visuelle des offres dans la carte pourra être faite ensuite sans casser le prototype existant.

---

## Note Cloudflare

Pour la version hébergée, le front n'appelle plus `/api/france-travail/offres`, mais directement :

```txt
/api/offres?motsCles=designer
```

Le fichier `apis/lumenApi.js` a été adapté en ce sens.
Le proxy local `server.js` reste utile pour tester en local avec `npm install` puis `npm run dev`.
En production, le proxy est assuré par le Cloudflare Worker situé dans `worker/`.
