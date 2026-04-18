# Phase 0 Vision Lock

## Final system identity
The system is **Care Transitions Command**.

It is composed of:
1. **Discharge Gatekeeper MCP**
2. **Clinical Intelligence MCP**
3. **external A2A orchestrator**

This is the locked phase-0 north star for the repo.

## Final system definition
Care Transitions Command is a Prompt Opinion-native care-transitions system that uses a deterministic discharge spine plus bounded narrative contradiction intelligence to stop unsafe discharge and return the next transition actions.

## Locked responsibilities

### Discharge Gatekeeper MCP
Owns:
- deterministic structured discharge posture
- canonical blocker taxonomy
- structured evidence grounding
- prioritized next-step spine

### Clinical Intelligence MCP
Owns:
- note and document contradiction detection
- hidden-risk escalation against the structured posture
- concise source-backed contradiction summaries

### external A2A orchestrator
Owns:
- prompt-level coordination
- MCP invocation order
- final response assembly inside Prompt Opinion

## Locked demo proof
The final demo must prove:
1. the structured picture looked discharge-ready
2. the note bundle revealed a contradiction
3. the final answer became `not_ready`
4. the system cited the contradiction
5. the system translated that finding into a transition package

This contradiction moment is the core spec.

## In scope
- `2 MCPs + 1 external A2A`
- Prompt Opinion as the user-facing surface
- deterministic discharge-readiness support
- bounded note contradiction intelligence
- blocker evidence
- next-step transition planning
- clinician and patient discharge artifacts
- one canonical trap patient for the primary demo

## Explicitly out of scope
- custom frontend work
- a third MCP
- A2A streaming
- generic hospital dashboarding
- diagnosis generation
- autonomous discharge authority
- broad care-management scope
- speculative multi-agent choreography beyond the locked architecture

## Frozen language
Use these exact system and component names:
- `Care Transitions Command`
- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

Use these exact verdict states:
- `ready`
- `ready_with_caveats`
- `not_ready`

Use these exact blocker categories:
- `clinical_stability`
- `pending_diagnostics`
- `medication_reconciliation`
- `follow_up_and_referrals`
- `patient_education`
- `home_support_and_services`
- `equipment_and_transport`
- `administrative_and_documentation`

## Phase sequence locked by this doc
1. phase-0 vision lock
2. Discharge Gatekeeper MCP structured spine
3. Clinical Intelligence MCP contradiction layer
4. external A2A orchestrator
5. Prompt Opinion demo hardening
6. submission lock

## Decision rule
If a future proposal changes system identity, component identity, architecture count, or the contradiction-centered demo story, log a decision first before changing other docs or code.
