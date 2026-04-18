# Phase 0 Failure-Mode Plan

## Purpose
This document defines the minimum behavior that must survive when a layer of `Care Transitions Command` fails.

## Failure hierarchy

| Layer | Failure mode | Required fallback | Demo impact |
| --- | --- | --- | --- |
| `external A2A orchestrator` | registration failure, timeout, unreachable runtime | switch to direct Prompt Opinion calls against the two MCPs | preferred path lost, demo remains viable |
| `Clinical Intelligence MCP` LLM call | model timeout, malformed output, provider outage | keep deterministic answer from `Discharge Gatekeeper MCP`; mark hidden-risk review unavailable | hidden-risk layer lost, baseline demo remains viable |
| live FHIR/context | missing headers, token failure, upstream FHIR outage | use trap-patient bundle or deterministic synthetic input with explicit disclosure | live context lost, scripted demo remains viable |
| `Discharge Gatekeeper MCP` | runtime down, contract failure, unreachable MCP | no safe full fallback inside final architecture | stop and repair before demo |

## A2A failure fallback

### Trigger
- `external A2A orchestrator` cannot be discovered
- end-to-end invocation fails
- response time is not demo-safe

### Required action
1. stop using the A2A path for the live session
2. keep both MCPs registered in Prompt Opinion
3. run the 3-prompt fallback direct-MCP story

### What still works
- deterministic readiness from `Discharge Gatekeeper MCP`
- hidden-risk review from `Clinical Intelligence MCP`
- judge explanation of the target architecture

## LLM call failure fallback

### Trigger
- `Clinical Intelligence MCP` cannot get a model response
- response is not parseable against the hidden-risk contract
- model output omits required citations

### Required action
1. return a structured `clinical_intelligence_unavailable` state
2. keep the deterministic verdict and next steps
3. do not fabricate hidden-risk findings from the absence of output

### What still works
- baseline discharge decision support
- deterministic blockers and next steps
- direct Prompt Opinion demo path

## Live FHIR/context failure fallback

### Trigger
- Prompt Opinion does not forward usable patient context
- upstream FHIR server is unavailable
- the A2A or MCP runtime cannot resolve live patient data reliably

### Required action
1. switch to the trap-patient bundle
2. disclose that the session is using the demo-safe synthetic context
3. preserve citations and parseability exactly as in the live path

### What still works
- end-to-end deterministic discharge assessment
- hidden-risk review over provided narrative inputs
- full 3-prompt judge demo

## Demo-safe fallback path

This is the minimum acceptable live-demo fallback:
1. Prompt Opinion invokes `Discharge Gatekeeper MCP` directly
2. Prompt Opinion invokes `Clinical Intelligence MCP` directly for hidden-risk review
3. the operator narrates the architecture honestly as `2 MCPs + 1 external A2A`, while using the direct-MCP backup path because it is safer for the session

Rules:
- no extra fourth prompt
- no custom UI
- no claim that the A2A layer is active if it is not

## What must still work even if the ambitious layer fails
- `Discharge Gatekeeper MCP` registration and invocation
- parseable deterministic output with blockers, evidence, and next steps
- `Clinical Intelligence MCP` direct invocation when its own runtime is healthy
- the 3-prompt story: verdict, hidden risk, next actions
- citation visibility
- assistive, non-autonomous safety framing

## Non-recoverable conditions before a live demo
Do not proceed with the judge path if any of these remain unresolved:
- `Discharge Gatekeeper MCP` is not reachable
- deterministic output is not parseable
- blocker or next-step output is missing
- identities shown to the user do not match the frozen names
