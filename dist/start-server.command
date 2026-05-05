#!/usr/bin/env bash

# Script de lancement du serveur Lumen avec proxy API France Travail (macOS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installe. Installe-le depuis https://nodejs.org puis relance ce fichier."
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
fi

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "Fichier .env absent. Creation depuis .env.example..."
    cp .env.example .env
    echo ""
    echo "ACTION REQUISE : ouvre le fichier .env et renseigne tes variables (dont FRANCE_TRAVAIL_CLIENT_SECRET)."
    echo "Puis relance start-server.command."
    echo ""
    read -r -p "Appuie sur Entree pour fermer..."
    exit 1
  fi
fi

# Installe les dependances au premier lancement
if [ ! -d "node_modules" ]; then
  echo "Installation des dependances npm..."
  npm install
fi

# Ouvre le navigateur en arriere-plan, sans bloquer le serveur
(
  sleep 1
  open "$URL" >/dev/null 2>&1 || true
) &

echo "----------------------------------------"
echo "Lancement de Lumen + API France Travail"
echo "Dossier : $SCRIPT_DIR"
echo "URL     : $URL"
echo "Arret   : Ctrl+C"
echo "----------------------------------------"

PORT="$PORT" npm run dev
#!/usr/bin/env bash

# Script de lancement du serveur Lumen avec proxy API France Travail (macOS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installe. Installe-le depuis https://nodejs.org puis relance ce fichier."
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Fichier .env absent. Creation depuis .env.example..."
  cp .env.example .env
  echo ""
  echo "ACTION REQUISE : ouvre le fichier .env et remplace FRANCE_TRAVAIL_CLIENT_SECRET par ta cle secrete."
  echo "Puis relance start-server.command."
  echo ""
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
fi

# Installe les dependances au premier lancement
if [ ! -d "node_modules" ]; then
  echo "Installation des dependances npm..."
  npm install
fi

# Ouvre le navigateur en arriere-plan, sans bloquer le serveur
(
  sleep 1
  open "$URL" >/dev/null 2>&1 || true
) &

echo "----------------------------------------"
echo "Lancement de Lumen + API France Travail"
echo "Dossier : $SCRIPT_DIR"
echo "URL     : $URL"
echo "Arret   : Ctrl+C"
echo "----------------------------------------"

PORT="$PORT" npm run dev
