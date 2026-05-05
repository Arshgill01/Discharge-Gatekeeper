#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
REQUESTED_PROVIDER="${CLINICAL_INTELLIGENCE_LLM_PROVIDER:-}"
REQUESTED_MODEL="${CLINICAL_INTELLIGENCE_GOOGLE_MODEL:-}"

red() {
  printf '\033[31m%s\033[0m\n' "$*"
}

yellow() {
  printf '\033[33m%s\033[0m\n' "$*"
}

green() {
  printf '\033[32m%s\033[0m\n' "$*"
}

presence() {
  local name="$1"
  local value="${!name:-}"
  if [[ -n "${value}" ]]; then
    echo "present"
  else
    echo "absent"
  fi
}

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
else
  yellow "[runtime-provider] .env.local: absent"
fi

PROVIDER="${REQUESTED_PROVIDER:-${CLINICAL_INTELLIGENCE_LLM_PROVIDER:-heuristic}}"
MODEL="${REQUESTED_MODEL:-${CLINICAL_INTELLIGENCE_GOOGLE_MODEL:-gemma-4-31b-it}}"
GOOGLE_KEY_PRESENT="$(presence GOOGLE_API_KEY)"
GEMINI_KEY_PRESENT="$(presence GEMINI_API_KEY)"

echo "[runtime-provider] .env.local: $([[ -f "${ENV_FILE}" ]] && echo present || echo absent)"
echo "[runtime-provider] provider: ${PROVIDER}"
echo "[runtime-provider] model: ${MODEL}"
echo "[runtime-provider] GOOGLE_API_KEY: ${GOOGLE_KEY_PRESENT}"
echo "[runtime-provider] GEMINI_API_KEY: ${GEMINI_KEY_PRESENT}"

case "${PROVIDER}" in
  google)
    if [[ "${GOOGLE_KEY_PRESENT}" == "present" || "${GEMINI_KEY_PRESENT}" == "present" ]]; then
      green "[runtime-provider] status: GREEN google provider configured with key present"
      exit 0
    fi
    red "[runtime-provider] status: RED google provider requested but GOOGLE_API_KEY/GEMINI_API_KEY is absent"
    exit 2
    ;;
  heuristic)
    yellow "[runtime-provider] status: YELLOW heuristic provider configured; valid for deterministic local regression only"
    exit 0
    ;;
  "")
    yellow "[runtime-provider] status: YELLOW provider unset; runtime defaults to heuristic"
    exit 0
    ;;
  *)
    red "[runtime-provider] status: RED unsupported CLINICAL_INTELLIGENCE_LLM_PROVIDER '${PROVIDER}'"
    exit 3
    ;;
esac
