# Phase 8.6 Prompt Opinion Forensic Routing Audit

Generated: `2026-05-05T19:34:00Z`

## Executive conclusion

The integrated browser proof did not fail for a single reason.

Root cause classification:

- A2A proof status: `browser proof harness correlation bug`, plus `real A2A product/runtime output gap`.
- Direct-MCP Prompt 1 status: `stale/wrong BYO workspace routing`, not stale DGK code.
- Direct-MCP Prompt 3 status: `Prompt Opinion synthesis/provider latency`, not proven local MCP tool latency.
- Current public URL state: the run hostname was current during the failed run, but it was offline when rechecked later until a fresh ngrok session was started.
- Current runtime identity: runtimes expose names, versions, tools, provider diagnostics, and task diagnostics, but not branch or commit.

The original A2A lane was misclassified as `chat_path_not_routed`. The browser screenshots and fresh-profile control both show Prompt Opinion selected the external A2A agent and the external runtime returned `runtime_diagnostics` with request/task IDs and downstream MCP correlation. The harness failed to count these hits because it relied on runtime-log deltas from the wrong log files.

The A2A lane still is not green clinically: the runtime received Prompt Opinion A2A requests without the canonical narrative evidence bundle, so Clinical Intelligence reported `insufficient_context`/`unavailable` and the final A2A verdict was `ready_with_caveats`, not the required hidden-risk `not_ready`.

## 1. Commit and runtime identity

- Branch: `int/phase8.6-real-green`
- HEAD: `9827b849c5deed74d6af96816cc5efa6ce76eb0d`
- `git status --short`: clean before writing this report.

Runtime identity exposed now:

| Runtime | Local port | Identity exposed | Branch/commit exposed |
| --- | ---: | --- | --- |
| Discharge Gatekeeper MCP | `5055` | `server_name=Discharge Gatekeeper MCP`, `server_version=1.0.0`, tools list | no |
| Clinical Intelligence MCP | `5056` | `server_name=Clinical Intelligence MCP`, `server_version=1.0.0`, tools list, Google/Gemini provider diagnostics | no |
| external A2A orchestrator | `5057` | `server_name=external A2A orchestrator`, `server_version=1.0.0`, agent card, task diagnostics | no |

Recommendation: add a later non-secret `/version` or `/readyz.version` field with `git_commit`, `git_branch`, `build_time`, and dirty-state indicator. That would have shortened this audit materially.

## 2. Public URL registration audit

Source failed run:

- `output/prompt-opinion-e2e/runs/20260505T185501Z-phase8-6-integration-browser-clean`

Registered public URLs from `reports/registration-verification.json`:

| Surface | Public URL | Local mapping | Updated during failed run? | Prompt Opinion UI state |
| --- | --- | --- | --- | --- |
| Discharge Gatekeeper MCP | `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp` | `/dgk/* -> 127.0.0.1:5055` | no, `updates=[]` | screenshot showed same URL |
| Clinical Intelligence MCP | `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp` | `/ci/* -> 127.0.0.1:5056` | no, `updates=[]` | screenshot showed same URL |
| external A2A orchestrator | `https://underpaid-passion-unloaded.ngrok-free.dev` | `/ -> 127.0.0.1:5057` | no, `updates=[]` | screenshot showed same URL |

Registration state during the failed run:

- DGK registration check: `200`, `green`
- CI registration check: `200`, `green`
- A2A agent-card check: `200`, `green`
- `update_requested=true`, but no registration changed because before and after URLs already matched.

Current recheck:

- At `2026-05-05T19:24:05Z`, the same hostname returned ngrok `ERR_NGROK_3200` offline for DGK, CI, A2A readyz, agent card, and tasks.
- After starting a fresh ngrok session through a local path proxy, the same reserved hostname became reachable again. ngrok did not issue a fresh random hostname in this account/session.

## 3. Runtime reachability audit

Local checks run after starting persistent diagnostic runtimes:

- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`: PASS
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`: PASS

Local `readyz` results:

| Surface | Local endpoint | Result |
| --- | --- | --- |
| DGK | `http://127.0.0.1:5055/readyz` | `200`, tools include `assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions` |
| CI | `http://127.0.0.1:5056/readyz` | `200`, tools include `assess_reconciled_discharge_readiness`, `surface_hidden_risks`, `synthesize_transition_narrative`; provider `google`, model `gemma-4-31b-it`, key present |
| A2A | `http://127.0.0.1:5057/readyz` | `200`, dependencies point to local DGK and CI MCP URLs |
| A2A agent card | `http://127.0.0.1:5057/.well-known/agent-card.json` | `200`, synchronous task lifecycle, HTTP+JSON `/message:send`, nested Prompt Opinion-compatible `/message:send/v1/message:send` |

Public checks after restarting ngrok through the local path proxy:

Timestamp: `2026-05-05T19:25:03Z`

| Surface | Public endpoint | Result |
| --- | --- | --- |
| DGK | `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/readyz` | `200`, current tool list |
| CI | `https://underpaid-passion-unloaded.ngrok-free.dev/ci/readyz` | `200`, current reconciled-readiness tool and Google provider evidence |
| A2A | `https://underpaid-passion-unloaded.ngrok-free.dev/readyz` | `200`, current dependencies |
| A2A agent card | `https://underpaid-passion-unloaded.ngrok-free.dev/.well-known/agent-card.json` | `200`, public absolute URLs in card |
| A2A tasks | `https://underpaid-passion-unloaded.ngrok-free.dev/tasks` | `200`, task store visible |

These responses prove current integrated behavior exists at runtime, but do not prove the exact branch/commit because no runtime exposes that identity.

## 4. A2A forensic audit

Failed run evidence:

- External A2A selected: yes. `screenshots/a2a-consult-selected.txt` shows `Consult with another agent: external A2A orchestrator`.
- Browser network showed Prompt Opinion requests: yes. `reports/browser-network-summary.json` includes `prompt-stream` POSTs with `a2aConnectionId=019db14c-a5c7-7fd7-b0fc-c65abb8255f8`.
- Harness runtime-log-delta showed A2A POSTs: no. It reported zero A2A requests and zero downstream MCP hits.
- Screenshot text contradicted the harness runtime summary: yes. `screenshots/a2a-vc-01-input-disabled.txt` and `screenshots/a2a-vd-01-result.txt` include A2A `runtime_diagnostics` with:
  - request `90698cde-db14-472b-816a-7bc5535c3616`, task `1d6d13d6-facd-4374-b81a-7d72051e17c0`, completed in `142 ms`
  - request `f17bfbd1-6152-4dfc-b412-f50ffb28cf52`, task `43114269-4888-4f2a-a235-38dbdf548400`, completed in `64 ms`
  - downstream calls to both `discharge_gatekeeper_mcp` and `clinical_intelligence_mcp`
  - incoming request path `/message:send/v1/message:send`

Fresh-profile control:

- Run folder: `output/prompt-opinion-e2e/runs/20260505T192610Z-phase8-6-forensic-fresh-profile`
- Profile: `/tmp/ctc-po-forensic-profile-20260505T192610Z`
- Registrations: green, same URLs, no update needed.
- A2A prompt-stream requests: yes, four A2A attempts with `a2aConnectionId`.
- Local A2A logs: yes, four POSTs to `/message:send/v1/message:send`.
- Downstream MCP logs: yes, DGK and CI were hit for A2A prompt 1 style calls.
- Harness summary still reported zero runtime hits because it did not use the per-run log overrides.

Harness bug:

- `run-prompt-opinion-browser-proof.sh` sources `.env.local` after caller-supplied environment variables.
- It restores only a small subset of requested variables after sourcing.
- It does not restore `PROMPT_OPINION_A2A_LOG`, `PROMPT_OPINION_DGK_LOG`, or `PROMPT_OPINION_CI_LOG`.
- In this workspace `.env.local` sets those log vars back to stale default files:
  - `po-community-mcp-main/.pids/external-a2a.log`
  - `po-community-mcp-main/.runtime/two-mcp/discharge-gatekeeper.log`
  - `po-community-mcp-main/.runtime/two-mcp/clinical-intelligence.log`
- Therefore the control run hit the current runtimes, but the harness read stale logs and reported `chat_path_not_routed`.

A2A route classification:

- Not `registration_only`: registration and discovery were green.
- Not `stale_registration` during the failed run: registered URLs matched and connection tests passed.
- Not `wrong_profile`: a new browser profile reproduced selection and runtime execution.
- Not `platform_no_route`: Prompt Opinion did route to the external runtime.
- Correct route classification: `harness_correlation_bug`.
- Remaining product classification: `real_product_runtime_output_gap`, because A2A did not hydrate the narrative evidence bundle and returned `ready_with_caveats` instead of the required `not_ready`.

## 5. Direct-MCP forensic audit

Failed run Direct-MCP visible tools:

| Prompt | Expected by runbook | Observed in screenshot | Outcome |
| --- | --- | --- | --- |
| Prompt 1 | `assess_reconciled_discharge_readiness` | `assess_discharge_readiness` | baseline structured `ready` only |
| Prompt 2 | `surface_hidden_risks` | no visible function call persisted | no final assistant transcript |
| Prompt 3 | `synthesize_transition_narrative` | no visible function call persisted | Prompt Opinion timeout/cancel |

Fresh-profile Direct Prompt 1:

- The new profile still selected `Care Transitions Command BYO Fallback`.
- Screenshot `fallback-p1-01-result.txt` still shows `Tool: assess_discharge_readiness`.
- Output remained baseline structured ready:
  - "Based on the structured baseline review, the patient is currently marked as ready for discharge."
- That rules out stale browser profile as the main Direct Prompt 1 cause.

Most likely Direct Prompt 1 cause:

- Prompt Opinion workspace/BYO agent state is stale or wrong for Prompt 1.
- It is invoking the DGK baseline path instead of the CI reconciled readiness tool.
- This does not look like stale DGK code because the current CI registration advertises `assess_reconciled_discharge_readiness`, and current CI `readyz` exposes that tool.

Direct-MCP runtime hit caveat:

- Fresh control logs show Prompt Opinion contacted public DGK and CI MCP endpoints during the Direct Prompt 1 period, but the visible UI answer came from `assess_discharge_readiness`.
- The logs prove MCP transport activity, not the exact selected tool name. The UI is the reliable source for the user-visible selected tool.

## 6. Prompt 3 timeout audit

Failed run Prompt 3:

- Attempt: `FALLBACK-P3-01`
- Started: `2026-05-05T19:04:49.591Z`
- First settle trace: `2026-05-05T19:04:52.175Z`, UI was `Responding...`
- Timeout appeared: `2026-05-05T19:05:53.921Z`
- Error text: `The LLM took too long to respond and the operation was cancelled`
- Settle reason: `visible_error_before_runtime`
- Visible assistant transcript: no
- Visible timeout/error banner: yes

Interpretation:

- The timeout appeared after about 61 seconds of Prompt Opinion `Responding...`.
- The error came from the Prompt Opinion conversation/prompt-stream path, not from the local MCP runtime logs.
- The run did not prove Direct Prompt 3 local MCP tool latency because no current log correlation was captured for that attempt.
- A2A runtime Prompt 3-style tasks in both the failed run screenshots and fresh control completed quickly (`64 ms` and `40 ms`), so local A2A/MCP latency is not the best explanation.
- Most likely cause: Prompt Opinion LLM synthesis/provider timeout after or around tool routing, compounded by prior failed/large context turns.

## 7. Fresh profile control

Command scope:

- New browser profile.
- Registration update enabled.
- Same reserved public hostname, but fresh ngrok session.
- A2A lane ran all harness variants because the current script has no single-variant selector.
- Direct lane limited to Prompt 1 with `PROMPT_OPINION_DIRECT_PROMPTS=prompt1`.
- Direct Prompt 3 was skipped to avoid repeating a known Prompt Opinion synthesis timeout.

Control result:

- Registration state stayed green.
- A2A selection stayed green.
- Prompt Opinion routed to A2A runtime. Runtime logs show POSTs at:
  - `2026-05-05T19:27:49.457Z`
  - `2026-05-05T19:28:36.039Z`
  - `2026-05-05T19:29:17.557Z`
  - `2026-05-05T19:30:02.026Z`
- A2A runtime completed each task in `40-135 ms`.
- A2A visible output remained `ready_with_caveats` due missing narrative evidence.
- Direct Prompt 1 still used `assess_discharge_readiness` and returned baseline `ready`.
- Harness status remained yellow/red because it read stale log files from `.env.local`, not the temporary diagnostic logs.

## 8. Root cause classification

Primary reason the integrated browser proof failed despite local validation passing:

1. `browser_proof_harness_bug`: runtime hit accounting is unreliable when per-run log path overrides are needed, because the wrapper does not preserve those overrides after sourcing `.env.local`.
2. `workspace_byo_routing_stale`: Direct Prompt 1 in Prompt Opinion is bound/routed to `assess_discharge_readiness`, not `assess_reconciled_discharge_readiness`.
3. `a2a_prompt_payload_gap`: Prompt Opinion A2A execution reaches the runtime but does not provide the canonical narrative evidence bundle, so the runtime safely returns `ready_with_caveats`/manual review instead of the demo `not_ready` contradiction moment.
4. `prompt_opinion_synthesis_timeout`: Direct Prompt 3 fails in Prompt Opinion after about 61 seconds; current evidence points to Prompt Opinion LLM synthesis/provider latency, not local MCP task latency.

## 9. Next smallest patch

Smallest harness-only patch:

- In `po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh`, preserve and restore all caller-supplied `PROMPT_OPINION_*` overrides that affect routing and evidence collection, especially:
  - `PROMPT_OPINION_E2E_RUN_ID`
  - `PROMPT_OPINION_E2E_RUN_DIR`
  - `PROMPT_OPINION_BROWSER_PROFILE_DIR`
  - `PROMPT_OPINION_UPDATE_REGISTRATIONS`
  - `PROMPT_OPINION_DGK_PUBLIC_URL`
  - `PROMPT_OPINION_CI_PUBLIC_URL`
  - `PROMPT_OPINION_A2A_PUBLIC_URL`
  - `PROMPT_OPINION_DGK_LOG`
  - `PROMPT_OPINION_CI_LOG`
  - `PROMPT_OPINION_A2A_LOG`
  - `PROMPT_OPINION_DIRECT_PROMPTS`
- Add an A2A runtime-diagnostics fallback parser from visible `ARTIFACT_MESSAGES.runtime_diagnostics` in screenshots/network responses, so route proof is not solely dependent on local log files.
- Add an A2A variant selector to avoid running all variants during forensic controls.

Smallest workspace/operator fix:

- Inspect and update `Care Transitions Command BYO Fallback` so Prompt 1 selects `Clinical Intelligence MCP.assess_reconciled_discharge_readiness`, not `Discharge Gatekeeper MCP.assess_discharge_readiness`.

Smallest product/runtime fix, separately from this audit:

- Fix A2A prompt hydration so Prompt Opinion A2A calls include or retrieve the canonical narrative evidence bundle. Without that, A2A can route correctly and still fail the demo by returning `ready_with_caveats`.

## 10. Commands run for validation

Key commands:

- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `./po-community-mcp-main/scripts/check-runtime-provider-config.sh`
- `./po-community-mcp-main/scripts/start-a2a-local.sh`
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- `curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' http://127.0.0.1:5055/readyz`
- `curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' http://127.0.0.1:5056/readyz`
- `curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' http://127.0.0.1:5057/readyz`
- `curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' http://127.0.0.1:5057/.well-known/agent-card.json`
- `curl -sS -m 10 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' https://underpaid-passion-unloaded.ngrok-free.dev/dgk/readyz`
- `curl -sS -m 10 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' https://underpaid-passion-unloaded.ngrok-free.dev/ci/readyz`
- `curl -sS -m 10 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' https://underpaid-passion-unloaded.ngrok-free.dev/readyz`
- `curl -sS -m 10 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' https://underpaid-passion-unloaded.ngrok-free.dev/.well-known/agent-card.json`
- `curl -sS -m 10 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' https://underpaid-passion-unloaded.ngrok-free.dev/tasks`
- `PROMPT_OPINION_E2E_RUN_ID=20260505T192610Z-phase8-6-forensic-fresh-profile ... ./po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh`

Supporting artifact reads used `jq`, `sed`, `rg`, `find`, `tail`, `ps`, `lsof`, `command -v`, and `date`.
