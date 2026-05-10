# Phase 10: FHIR-native discharge control plane with Prompt Opinion proof

## Summary

This branch turns Care Transitions Command into a FHIR-native discharge control plane on top of the locked `2 MCPs + 1 external A2A` architecture.

It adds:

- FHIR bundle seeding for Daniel Brooks, Maria Alvarez, Eleanor Singh, and Olivia Chen
- FHIR-native structured ingest into `Discharge Gatekeeper MCP`
- live/patient-scope contradiction handling in `Clinical Intelligence MCP`
- FHIR `Task` write-back for blocking discharge gates
- `Provenance` and `AuditEvent` write-back
- polling re-arbitration that rereads FHIR Task state before changing discharge status
- Prompt Opinion Patient Scope hardening for the held-out Daniel path

## Major features

- `Discharge Gatekeeper MCP` preserves the deterministic structured baseline.
- `Clinical Intelligence MCP` now supports direct Patient-scope FHIR routing and a dedicated `rearbitrate_discharge_readiness` tool for Prompt 4.
- `external A2A orchestrator` retains the synchronous architecture-proof lane and shared write-back / re-arbitration behavior.
- Prompt Opinion patient UUIDs for Daniel / Maria / Olivia are mapped into the seeded local fixture store for honest local demo proof of FHIR reads, Task write-back, Provenance, AuditEvent, and re-arbitration.

## Daniel held-out proof

Strong preserved direct-lane artifacts exist in:

- `output/endgame/runs/20260510T101519Z/daniel-preflight-chat.txt`
- `output/endgame/runs/20260510T101519Z/daniel-p1.txt`
- `output/endgame/runs/20260510T101519Z/daniel-rerun-p2.txt`
- `output/endgame/runs/20260510T101519Z/daniel-rerun-p3.txt`
- `output/endgame/runs/20260510T101519Z/daniel-rerun-p4-final.txt`
- `output/endgame/runs/20260510T101519Z/daniel-rerun-p4-current.json`

What those artifacts show:

- Prompt 1: structured baseline `ready`, final `not_ready`, Daniel FHIR refs visible
- Prompt 2: contradiction and evidence from Daniel pharmacy, nursing, and case-management notes
- Prompt 3: transition package with visible Task / Provenance / AuditEvent refs
- Prompt 4: partial resolution proves medication + home-monitoring gates resolve while `clinical_stability` remains unresolved

## Olivia clean control

Current preserved control artifacts:

- `output/endgame/runs/20260510T101519Z/olivia-rerun-p1-final.txt`
- `output/endgame/runs/20260510T101519Z/final-targeted-proof-2.json`

Current result:

- final verdict `ready`
- explicit `hidden_risk_result: no_hidden_risk`
- zero blocking Tasks

## FHIR Task / Provenance / AuditEvent write-back

Repo-native proof commands:

- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-task-writeback`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-audit-writeback`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-rearbitration`
- `npx tsx po-community-mcp-main/clinical-intelligence-typescript/smoke/fhir-direct-patient-scope-smoke.ts`

## Re-arbitration proof

Prompt 4 is implemented as a real re-arbitration path:

- `rearbitrate_discharge_readiness` forces the re-arbitration trigger phrase
- FHIR Task state is reread
- only resolved gates are cleared
- `clinical_stability` remains unresolved when orthopnea persists

## Tests run

- `git diff --check`
- `npm --prefix po-community-mcp-main/typescript run typecheck`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run typecheck`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run typecheck`
- `npm --prefix po-community-mcp-main/typescript run smoke:demo-path`
- `npm --prefix po-community-mcp-main/typescript run smoke:fhir-bundles`
- `npm --prefix po-community-mcp-main/typescript run smoke:fhir-native-ingest`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:hidden-risk`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:narrative`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:scenario-matrix`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:fhir-narrative-ingest`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:fhir-ledger`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-visible-output`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-task-writeback`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-audit-writeback`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-rearbitration`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:fhir-heldout-scenarios`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-compatibility`

## Known yellows / blockers

- Fresh Prompt Opinion browser reproducibility is still unstable in the current endgame run:
  - new conversations sometimes fail `prompt-stream` with HTTP `422` `An unexpected error has occurred`
  - fresh browser-native textarea entry with `keyboard.type()` still persisted zero messages on a fresh conversation
- Marketplace publication is not yet green:
  - MCPs currently show `isPublished: false`
  - BYO / A2A state currently shows `marketplacePublished: false`
- A2A current endgame status is still `yellow`, not green

## Screenshots / run folders

- endgame run folder: `output/endgame/runs/20260510T101519Z/`
- historical Prompt Opinion proof bundles: `output/prompt-opinion-e2e/runs/`

## Safety statement

Care Transitions Command does not claim autonomous discharge authority. It supports clinician review by surfacing readiness posture, contradictions, blockers, evidence, next actions, and FHIR coordination artifacts.
