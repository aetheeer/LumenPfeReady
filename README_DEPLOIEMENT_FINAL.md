# LumenPfe — structure correcte Cloudflare Pages

À pousser sur GitHub : le CONTENU de ce dossier, pas le dossier parent zippé.

Structure attendue à la racine GitHub :

```txt
dist/
functions/
worker/
.gitignore
README_DEPLOIEMENT_FINAL.md
```

Configuration Cloudflare Pages :

```txt
Build command : vide
Build output directory : dist
```

Variable d'environnement Cloudflare Pages pour le code d'accès :

```txt
LUMEN_ACCESS_CODE=toncode
```

Important : `functions/_middleware.js` doit rester à la racine GitHub, pas dans `dist/`.

Le fichier `communes.geojson` a été retiré car Cloudflare Pages refuse les fichiers de plus de 25 MiB.
