#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if ! command -v npx >/dev/null 2>&1; then
  echo "[po-browser-proof] npx is required. Install Node.js/npm before running browser proof." >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/output/playwright"

OVERRIDE_ENV_VARS=(
  CLINICAL_INTELLIGENCE_LLM_PROVIDER
  CLINICAL_INTELLIGENCE_GOOGLE_MODEL
  CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS
  PROMPT_OPINION_E2E_RUN_ID
  PROMPT_OPINION_E2E_RUN_DIR
  PROMPT_OPINION_BROWSER_PROFILE_DIR
  PROMPT_OPINION_UPDATE_REGISTRATIONS
  PROMPT_OPINION_DGK_PUBLIC_URL
  PROMPT_OPINION_CI_PUBLIC_URL
  PROMPT_OPINION_A2A_PUBLIC_URL
  PROMPT_OPINION_DGK_LOG
  PROMPT_OPINION_CI_LOG
  PROMPT_OPINION_A2A_LOG
  PROMPT_OPINION_DIRECT_PROMPTS
  PROMPT_OPINION_BROWSER_LANES
  PROMPT_OPINION_A2A_VARIANTS
  PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER
  PROMPT_OPINION_PROMPT_TIMEOUT_MS
)

preserve_env_var() {
  local name="$1"
  local set_name="REQUESTED_${name}_SET"
  local value_name="REQUESTED_${name}"

  if [[ "${!name+x}" == "x" ]]; then
    printf -v "${set_name}" "%s" "1"
    printf -v "${value_name}" "%s" "${!name}"
  else
    printf -v "${set_name}" "%s" "0"
    printf -v "${value_name}" "%s" ""
  fi
}

restore_env_var() {
  local name="$1"
  local set_name="REQUESTED_${name}_SET"
  local value_name="REQUESTED_${name}"

  if [[ "${!set_name:-0}" == "1" ]]; then
    export "${name}=${!value_name}"
  fi
}

for name in "${OVERRIDE_ENV_VARS[@]}"; do
  preserve_env_var "${name}"
done

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

for name in "${OVERRIDE_ENV_VARS[@]}"; do
  restore_env_var "${name}"
done

if [[ "${PROMPT_OPINION_BROWSER_PROOF_PRINT_ENV_AND_EXIT:-0}" == "1" ]]; then
  for name in "${OVERRIDE_ENV_VARS[@]}"; do
    printf "%s=%s\n" "${name}" "${!name:-}"
  done
  exit 0
fi

if [[ "${PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER:-0}" == "1" ]]; then
  CLINICAL_INTELLIGENCE_LLM_PROVIDER=google "${SCRIPT_DIR}/check-runtime-provider-config.sh"
else
  "${SCRIPT_DIR}/check-runtime-provider-config.sh"
fi

exec npx --yes --package playwright node "${SCRIPT_DIR}/prompt-opinion-browser-proof.mjs"
