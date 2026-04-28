#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if ! command -v npx >/dev/null 2>&1; then
  echo "[po-browser-proof] npx is required. Install Node.js/npm before running browser proof." >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/output/playwright"

exec npx --yes --package playwright node "${SCRIPT_DIR}/prompt-opinion-browser-proof.mjs"
