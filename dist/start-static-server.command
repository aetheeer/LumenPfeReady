#!/usr/bin/env bash

# Script de lancement du serveur statique Lumen (macOS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8080}"
URL="http://localhost:${PORT}"

cd "$SCRIPT_DIR"

echo "----------------------------------------"
echo "Lancement du serveur statique Lumen"
echo "Dossier : $SCRIPT_DIR"
echo "URL     : $URL"
echo "----------------------------------------"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Python n'est pas installe."
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
fi

# Ouvre le navigateur en arriere-plan, sans bloquer le serveur
(
  sleep 1
  open "$URL" >/dev/null 2>&1 || true
) &

echo "Commande executee : $PYTHON_CMD -m http.server $PORT"
echo "Arret du serveur   : Ctrl+C"
echo ""

"$PYTHON_CMD" -m http.server "$PORT"
#!/usr/bin/env bash

# Script de lancement du serveur Lumen (macOS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8080}"
URL="http://localhost:${PORT}"

cd "$SCRIPT_DIR"

echo "----------------------------------------"
echo "Lancement du serveur Lumen"
echo "Dossier : $SCRIPT_DIR"
echo "URL     : $URL"
echo "----------------------------------------"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Python n'est pas installe."
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
fi

# Ouvre le navigateur en arriere-plan, sans bloquer le serveur
(
  sleep 1
  open "$URL" >/dev/null 2>&1 || true
) &

echo "Commande executee : $PYTHON_CMD -m http.server $PORT"
echo "Arret du serveur   : Ctrl+C"
echo ""

"$PYTHON_CMD" -m http.server "$PORT"
