#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST_DIR="$ROOT_DIR/dist"
MANIFEST_FILE="$ROOT_DIR/manifest.json"

VERSION=$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST_FILE" | head -n 1)

if [ -z "${VERSION:-}" ]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

ARTIFACT_NAME="claude-project-highlighter-$VERSION.xpi"
ARTIFACT_PATH="$DIST_DIR/$ARTIFACT_NAME"

mkdir -p "$DIST_DIR"
rm -f "$ARTIFACT_PATH"

cd "$ROOT_DIR"
zip -r "$ARTIFACT_PATH" \
  manifest.json \
  content.js \
  content.css \
  popup.html \
  popup.js \
  README.md >/dev/null

echo "$ARTIFACT_PATH"
