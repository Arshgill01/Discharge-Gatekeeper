# Prompt Opinion E2E Validation Report

## Date
2026-04-21

## Validation scope
Complete backend/runtime validation of all three Care Transitions Command services, their readiness surfaces, identity compliance, A2A task lifecycle, direct-MCP fallback, and Prompt Opinion workspace access attempt.

## Auth blocker
**Prompt Opinion workspace access is blocked by missing credentials.**

- Login page reached at: `https://app.promptopinion.ai/account/login`
- Screenshot captured: `output/playwright/01-po-login-page.png`
- No credentials found in repo env files, env vars, or cached browser sessions
- **Cannot validate in-workspace registration, discovery, or UI-level demo without credentials**

## What was validated

### Local prerequisite checks
| Check | Result |
| --- | --- |
| `run-full-system-validation.sh` | ✅ PASS |
| Discharge Gatekeeper MCP release gate | ✅ PASS |
| Clinical Intelligence MCP release gate | ✅ PASS |
| external A2A orchestrator release gate | ✅ PASS |
| Two-MCP integration smoke | ✅ PASS |
| A2A orchestration smoke | ✅ PASS |

### Readiness endpoint validation
| Surface | Endpoint | Status | Identity verified |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | `http://127.0.0.1:5055/readyz` | ✅ ok | `Discharge Gatekeeper MCP` ✅ |
| Clinical Intelligence MCP | `http://127.0.0.1:5056/readyz` | ✅ ok | `Clinical Intelligence MCP` ✅ |
| external A2A orchestrator | `http://127.0.0.1:5057/readyz` | ✅ ok | `external A2A orchestrator` ✅ |
| A2A agent card | `http://127.0.0.1:5057/.well-known/agent-card.json` | ✅ valid | `schema_version=a2a_card_v1`, `streaming=false`, 2 dependencies ✅ |

### Tool surface validation
| MCP | Expected tools | Actual tools | Match |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | assess_discharge_readiness, extract_discharge_blockers, generate_transition_plan, build_clinician_handoff_brief, draft_patient_discharge_instructions | ✅ All 5 present | ✅ |
| Clinical Intelligence MCP | surface_hidden_risks, synthesize_transition_narrative | ✅ Both present | ✅ |

### A2A 3-prompt trap patient validation (2 runs)
| Assertion | Run 1 | Run 2 |
| --- | --- | --- |
| Prompt 1: deterministic.verdict=ready | ✅ | ✅ |
| Prompt 1: final_verdict=not_ready | ✅ | ✅ |
| Prompt 1: hidden_risk_run_status=used | ✅ | ✅ |
| Prompt 1: decision_matrix_row=3 | ✅ | ✅ |
| Prompt 2: contradiction mentions "from ready to not_ready" | ✅ | ✅ |
| Prompt 2: cites Nursing Note evidence | ✅ | ✅ |
| Prompt 2: assistive framing present | ✅ | ✅ |
| Prompt 3: merged_next_steps includes hidden_risk actions | ✅ | ✅ |
| Prompt 3: transition package present | ✅ | ✅ |
| Total time | 324ms | 278ms |

### A2A control path validation
| Assertion | Result |
| --- | --- |
| final_verdict=ready | ✅ |
| hidden_risk_result=no_hidden_risk | ✅ |
| No fabricated escalation | ✅ |

### Direct-MCP fallback validation
| Step | Result |
| --- | --- |
| Prompt 1 via DG MCP: verdict=ready | ✅ |
| Prompt 2 via CI MCP: hidden_risk_present, not_ready | ✅ |
| Prompt 2 via CI MCP: 3 findings, 5 citations | ✅ |
| Prompt 3 via CI MCP synthesize_transition_narrative | ✅ |

### Prompt Opinion workspace validation
| Check | Result |
| --- | --- |
| Login page accessible | ✅ |
| Authenticated workspace access | ❌ BLOCKED - no credentials |
| MCP registration/discovery | ❌ BLOCKED |
| A2A registration/discovery | ❌ BLOCKED |
| In-workspace 3-prompt demo | ❌ BLOCKED |
| In-workspace timed rehearsal | ❌ BLOCKED |

## Artifacts captured
- `output/playwright/01-po-login-page.png` - Prompt Opinion login page screenshot
- `output/prompt-opinion-e2e/local-readiness-evidence.txt` - All readiness endpoint responses
- `output/prompt-opinion-e2e/run1-prompt1.json` - A2A Prompt 1 response (run 1)
- `output/prompt-opinion-e2e/run1-prompt2.json` - A2A Prompt 2 response (run 1)
- `output/prompt-opinion-e2e/run1-prompt3.json` - A2A Prompt 3 response (run 1)
- `output/prompt-opinion-e2e/run2-prompt1.json` - A2A Prompt 1 response (run 2)
- `output/prompt-opinion-e2e/run2-prompt2.json` - A2A Prompt 2 response (run 2)
- `output/prompt-opinion-e2e/run2-prompt3.json` - A2A Prompt 3 response (run 2)
- `output/prompt-opinion-e2e/control-a2a-response.json` - A2A control path response
- `output/prompt-opinion-e2e/fallback-prompt1-raw.json` - Direct MCP fallback Prompt 1
- `output/prompt-opinion-e2e/fallback-prompt2-raw.json` - Direct MCP fallback Prompt 2
- `output/prompt-opinion-e2e/fallback-prompt3-raw.json` - Direct MCP fallback Prompt 3
- `output/prompt-opinion-e2e/timed-rehearsal-results.md` - Detailed timing results

## Open risks
1. **AUTH BLOCKER**: No Prompt Opinion credentials available. Cannot validate workspace registration, discovery, or in-workspace demo path until credentials are provided.
2. **Tunnel requirement**: Prompt Opinion requires public URLs. Need ngrok or similar tunnel for each service before registration.
3. **Allowed hosts**: Each service must have tunnel hostnames added to ALLOWED_HOSTS before Prompt Opinion can reach them.
4. **MCP SSE transport**: Prompt Opinion must support the Streamable HTTP MCP transport (SSE responses). Confirmed working locally.
5. **A2A registration path**: Prompt Opinion may not yet support external A2A agent registration — the docs note this as a potential event-day risk.

## Conclusion
**The system is backend-demo-ready but NOT workspace-demo-ready.**

All backend surfaces, identities, task lifecycles, and fallback paths are validated and passing. The system is architecturally sound and ready for Prompt Opinion registration the moment credentials and tunnel access are provided.

### Next steps to reach full workspace-demo-ready status
1. Obtain Prompt Opinion workspace credentials
2. Set up ngrok tunnels for ports 5055, 5056, 5057
3. Add tunnel hostnames to ALLOWED_HOSTS
4. Register both MCPs in Prompt Opinion workspace
5. Register external A2A orchestrator
6. Run the 3-prompt demo in the actual workspace
7. Capture in-workspace screenshots as evidence
