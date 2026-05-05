#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if ! command -v npx >/dev/null 2>&1; then
  echo "[po-browser-proof] npx is required. Install Node.js/npm before running browser proof." >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/output/playwright"

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

if [[ "${PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER:-0}" == "1" ]]; then
  CLINICAL_INTELLIGENCE_LLM_PROVIDER=google "${SCRIPT_DIR}/check-runtime-provider-config.sh"
else
  "${SCRIPT_DIR}/check-runtime-provider-config.sh"
fi

exec npx --yes --package playwright node "${SCRIPT_DIR}/prompt-opinion-browser-proof.mjs"
