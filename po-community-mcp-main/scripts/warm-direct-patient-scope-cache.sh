#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PO_COMMUNITY_ROOT}/.." && pwd)"

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

cd "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript"
npx tsx scripts/warm-direct-patient-scope-cache.ts
