#!/usr/bin/env bash
# Generate Software Bill of Materials (SBOM) for backend and frontend
# Uses CycloneDX format (JSON)
# Requires: Docker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SBOM_DIR="$PROJECT_DIR/sbom"

mkdir -p "$SBOM_DIR"

echo "Generating backend SBOM..."
docker run --rm \
  -v "$PROJECT_DIR/backend:/app" \
  -w /app \
  node:20-alpine \
  sh -c "npm install --ignore-scripts 2>/dev/null && npx --yes @cyclonedx/cyclonedx-npm --output-file /app/sbom.json --output-format json 2>/dev/null"

mv "$PROJECT_DIR/backend/sbom.json" "$SBOM_DIR/backend-sbom.json"
echo "  -> $SBOM_DIR/backend-sbom.json"

echo "Generating frontend SBOM..."
docker run --rm \
  -v "$PROJECT_DIR/frontend:/app" \
  -w /app \
  node:20-alpine \
  sh -c "npm install --ignore-scripts 2>/dev/null && npx --yes @cyclonedx/cyclonedx-npm --output-file /app/sbom.json --output-format json 2>/dev/null"

mv "$PROJECT_DIR/frontend/sbom.json" "$SBOM_DIR/frontend-sbom.json"
echo "  -> $SBOM_DIR/frontend-sbom.json"

echo "Done! SBOMs generated in $SBOM_DIR/"
