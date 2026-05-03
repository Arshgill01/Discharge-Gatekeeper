#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SHARED_ENV_PATH="${CTC_SHARED_ENV_PATH:-${HOME}/.config/care-transitions-command/phase8.env}"
TARGET_ENV_PATH="${REPO_ROOT}/.env.local"

print_key_presence() {
  local key="$1"
  if grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=" "${SHARED_ENV_PATH}"; then
    echo "  ${key}: present"
  else
    echo "  ${key}: absent"
  fi
}

if [[ ! -f "${SHARED_ENV_PATH}" ]]; then
  echo "[link-shared-env] shared env file not found: ${SHARED_ENV_PATH}" >&2
  echo "[link-shared-env] set CTC_SHARED_ENV_PATH or create ${HOME}/.config/care-transitions-command/phase8.env" >&2
  exit 1
fi

if [[ -e "${TARGET_ENV_PATH}" && ! -L "${TARGET_ENV_PATH}" ]]; then
  echo "[link-shared-env] refusing to replace non-symlink .env.local: ${TARGET_ENV_PATH}" >&2
  exit 1
fi

ln -sfn "${SHARED_ENV_PATH}" "${TARGET_ENV_PATH}"

echo "[link-shared-env] linked .env.local -> ${SHARED_ENV_PATH}"
echo "[link-shared-env] key presence only; secret values are not printed"
print_key_presence "CLINICAL_INTELLIGENCE_LLM_PROVIDER"
print_key_presence "CLINICAL_INTELLIGENCE_GOOGLE_MODEL"
print_key_presence "GOOGLE_API_KEY"
print_key_presence "GEMINI_API_KEY"
