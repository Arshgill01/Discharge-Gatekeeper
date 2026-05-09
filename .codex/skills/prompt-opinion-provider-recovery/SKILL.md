---
name: "prompt-opinion-provider-recovery"
description: "Isolate and recover Prompt Opinion post-tool failures for Care Transitions Command proofs. Use when Prompt Opinion shows provider-looking errors, post-tool transcript timeouts, missing assistant persistence after valid FunctionResponse, BYO sequencing uncertainty, model configuration drift, or when deciding whether a provider change is evidence-backed before rerunning Test 1."
---

# Prompt Opinion Failure Isolation

## Purpose

Isolate Prompt Opinion post-tool failures without assuming the model provider is the only cause, without changing clinical logic, and without overclaiming backend evidence as visible Prompt Opinion proof.

Use this after artifacts show the MCP/runtime returned a valid compact response but Prompt Opinion failed to synthesize or persist the assistant transcript.

## Guardrails

- Do not print, commit, or paste API keys.
- Do not edit `.env.local` unless explicitly asked.
- Do not accept FunctionResponse persistence as Test 1 success unless the user explicitly changes the proof standard.
- Do not change clinical prompts/output if the FunctionResponse already contains the required verdict, baseline, hidden-risk result, and anchors.
- Do not run Test 2 while Test 1 is still red.

## Evidence To Capture First

From the failing run folder, preserve:

- `reports/direct-mcp-status.json`
- `reports/browser-network-events.json`
- `reports/browser-network-summary.json`
- `reports/runtime-log-delta.json`
- `screenshots/*result.txt`
- `screenshots/*result.png`

Classify the failure as post-tool Prompt Opinion failure only when:

- Prompt Opinion registration is current
- public/local readiness passed
- runtime/MCP logs show expected hits
- network stream includes a valid FunctionResponse
- visible assistant transcript is missing or timeout/cancelled/failure appears after the tool response

Do not narrow the cause to the provider unless the full error body, a reproducible same-provider control, or a provider-swap A/B test supports that conclusion.

## Provider Inventory

Inspect key presence by name only:

```sh
node -e 'const fs=require("fs"); const s=fs.existsSync(".env.local")?fs.readFileSync(".env.local","utf8"):""; for (const n of ["OPENAI_API_KEY","ANTHROPIC_API_KEY","CLAUDE_API_KEY","GOOGLE_API_KEY","GEMINI_API_KEY","AZURE_OPENAI_API_KEY","AZURE_OPENAI_ENDPOINT"]) { const m=s.match(new RegExp("^"+n+"=(.*)$","m")); console.log(`${n}=${m&&m[1]&&!/^\\s*$/.test(m[1])?"present":"missing"}`); }'
```

If only Google/Gemini keys are available, record that fact. Do not infer that Google/Gemma caused the failure just because no other keys exist.

## Prompt Opinion Config API Clues

The frontend has used these endpoints:

- `GET /api/workspaces/:workspaceId/configs/list?excludeEmbedding=true`
- `POST /api/workspaces/:workspaceId/configs`
- `PUT /api/workspaces/:workspaceId/configs/:configId`
- `POST /api/workspaces/:workspaceId/configs/:configId/set-as-default`
- `POST /api/workspaces/:workspaceId/configs/:configId/test-json-response-format`

Use the browser/harness session to inspect request shapes before creating or changing configs. Record only redacted request summaries.

## Isolation Flow

1. Open the Prompt Opinion workspace model configuration page.
2. Record current configs with provider, model, default flag, and redacted key state.
3. Extract the most complete available Prompt Opinion prompt-stream error body without exposing secrets.
4. Check whether the failure is consistent across:
   - Prompt 1 post-tool completion
   - Prompt 2 post-tool completion
   - Prompt 3 no-tool or transition-package path
5. Identify whether the likely layer is:
   - provider/model
   - transcript persistence/rendering
   - BYO agent sequencing/tool routing
   - conversation size/context accumulation
   - harness settle/visibility expectation
6. Only add or switch providers if the evidence specifically points to provider/model failure or the user asks for a provider A/B test.
7. If provider changes are made, capture screenshots and network summaries proving the config is current.
8. Rerun Test 1 in a fresh run folder with a full precheck only after the chosen recovery has been applied.

## Success Standard

Recovery is successful only if the fresh Test 1 visible Prompt Opinion transcript passes all Direct-MCP requirements:

- `not_ready`
- structured baseline `ready`
- hidden-risk result present
- both evidence anchors
- Prompt 3 transition package
- no timeout/cancelled/failure banner

FunctionResponse logs remain partial diagnostic evidence, not proof gate success.
