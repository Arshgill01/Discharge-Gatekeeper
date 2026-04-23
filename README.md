# Care Transitions Command

Care Transitions Command is the system identity for this repo.
It is a healthcare handoff-control system for Prompt Opinion built around three components:
- **Discharge Gatekeeper MCP**
- **Clinical Intelligence MCP**
- **external A2A orchestrator**

The system exists to answer one high-value question:
**Is this patient actually safe to discharge today, or is there a hidden risk buried in the notes?**

## What this repo is locking

### Discharge Gatekeeper MCP
Owns the deterministic structured discharge spine:
- structured patient-context normalization
- readiness posture
- blocker taxonomy
- next-step transition scaffolding

### Clinical Intelligence MCP
Exists because the structured chart can look clean while the dangerous contradiction lives in narrative evidence.
It owns:
- note and document contradiction detection
- hidden-risk discovery
- evidence-backed escalation against the structured posture

### external A2A orchestrator
Exists because the final product is not two disconnected MCPs.
It owns:
- prompt-level coordination
- when to escalate from structured posture to narrative review
- one fused response per prompt inside Prompt Opinion

## What the 3-prompt demo is trying to prove
1. The patient looks acceptable on the deterministic discharge spine.
2. The system catches a hidden contradiction in the notes and flips the answer.
3. The system turns that finding into a concrete transition package.

The point is not generic summarization.
The point is that **Care Transitions Command prevents an unsafe discharge that would have been missed by structured context alone**.

## Hard constraints
- top-level system identity stays `Care Transitions Command`
- keep `Discharge Gatekeeper MCP` as the existing MCP identity
- add `Clinical Intelligence MCP` as the second MCP identity
- use one `external A2A orchestrator`
- architecture stays `2 MCPs + 1 external A2A`
- no custom frontend
- no third MCP
- synchronous external A2A request/response surface
- no A2A streaming
- Prompt Opinion is the user-facing surface

## Read first
- [Phase 0 vision lock](docs/phase0-vision-lock.md)
- [Product brief](docs/product-brief.md)
- [Architecture](docs/architecture.md)
- [Demo script](docs/demo-script.md)
- [Trap patient spec](docs/phase0-trap-patient-spec.md)
- [Prompt Opinion complete verification guide](docs/prompt-opinion-complete-verification-guide.md)
- [Phase 2 two-MCP operator runbook](docs/phase2-two-mcp-operator-runbook.md)
- [Data plan](docs/data-plan.md)
- [Live plan](PLAN.md)

## Current release sequence
1. Phase 7: restore the synchronous contract, remove stale streaming-oriented planning drift, and lock the live demo rules.
2. Phase 8: freeze submission packaging only after the current run-folder evidence marks the primary and backup lanes correctly.

## Current implementation note
The repo already contains the implemented runtime surfaces for:
- **Discharge Gatekeeper MCP**
- **Clinical Intelligence MCP**
- **external A2A orchestrator**

The current repo-level task is not foundational architecture invention.
It is keeping the docs, operator rules, and submission surfaces aligned to the locked synchronous contract and the real Phase 7/8 state.

## Non-goals
- custom frontend work
- generic hospital dashboarding
- autonomous discharge authority
- broad care-management sprawl
- adding more agents or MCPs than the locked architecture requires
