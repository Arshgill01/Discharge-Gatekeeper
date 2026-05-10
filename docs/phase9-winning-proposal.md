# Phase 9 Winning Proposal — Care Transitions Command

## Status

Care Transitions Command has crossed from architecture invention into final proof and product-elevation mode.

The current system is built around:

1. **Discharge Gatekeeper MCP**
   - deterministic structured discharge readiness
   - canonical blocker taxonomy
   - next-step scaffolding

2. **Clinical Intelligence MCP**
   - bounded narrative contradiction detection
   - hidden-risk discovery
   - evidence-backed escalation

3. **External A2A orchestrator**
   - fuses the structured and narrative views
   - supports a single Prompt Opinion answer
   - proves the multi-component architecture

The core demo remains:

> A patient looks discharge-ready from structured chart data, but late narrative evidence reveals a hidden transition risk. The system preserves the structured baseline, catches the contradiction, flips the final status to `not_ready`, and produces the transition actions.

## Winning Thesis

Care Transitions Command is not a discharge prediction app.

It is an **evidence-chained transition control system**.

The system exists because discharge readiness is not only a static clinical state. It is a transition feasibility state.

A patient may look ready in structured data while still being unsafe to send home because the real blocker lives in narrative notes, case-management updates, therapy observations, or late operational context.

## One-Line Pitch

Care Transitions Command catches note-level contradictions that turn a discharge-ready chart into an unsafe transition, then produces an evidence-cited action package for clinician review.

## Judge Feeling Target

At the contradiction moment, the judge should feel:

> “The structured chart looked safe, but this system caught the exact late-note evidence that would have made discharge unsafe tonight.”

This is the holy-shit moment.

## What Makes This Different

Weak framing:

> “An AI predicts whether a patient can be discharged.”

Strong framing:

> “A care-transitions control system reconciles structured discharge readiness against narrative contradiction evidence, cites the exact hidden risk, and turns it into concrete actions for clinician review.”

The project should never feel like a generic classifier.

It should feel like infrastructure for preventing unsafe transitions.

## Product Primitive

The core artifact is the **Transition Safety Packet**.

Every meaningful answer should either produce or rely on this packet.

The packet contains:

1. structured baseline
2. narrative contradiction
3. reconciled transition status
4. cited evidence
5. owner/action/timing transition package
6. safety invariants
7. MCP/A2A trace

This packet is the thing that makes the system feel like a real healthcare workflow, not a chatbot.

## Core Workflow

```text
Structured chart / FHIR-like context
        ↓
Discharge Gatekeeper MCP
        ↓
Structured baseline: ready

Narrative notes / documents
        ↓
Clinical Intelligence MCP
        ↓
Hidden contradiction: present

Structured + narrative reconciliation
        ↓
Transition Safety Packet
        ↓
Final status: not_ready
        ↓
Action package for clinician review
```

## Required Demo Shape

The final demo must stay to three prompts:

1. `Is this patient safe to discharge today?`
2. `What hidden risk changed that answer? Show me the contradiction and the evidence.`
3. `What exactly must happen before discharge, and prepare the transition package.`

Prompt 2 is the centerpiece.

Prompt 1 sets up the baseline-vs-final flip.

Prompt 3 proves actionability.

## Hard Constraints

- Keep architecture at `2 MCPs + 1 external A2A orchestrator`.
- No custom frontend.
- No third MCP.
- No A2A streaming.
- Prompt Opinion remains the user-facing surface.
- Do not make autonomous discharge claims.
- Do not turn the project into diagnosis generation.
- Do not add broad hospital dashboard sprawl.
- Do not overclaim A2A status beyond current evidence.
- Do not bury the contradiction in long prose.

## Current Main Risks

### 1. It can look like discharge prediction

If the demo simply answers `not_ready`, the project feels ordinary.

The structured baseline vs narrative contradiction must be visible in the first screenful.

### 2. A2A live path may remain less stable than Direct-MCP

The architecture should still be A2A-ready, but the judged live lane must be selected based on evidence.

If Direct-MCP is the stable Prompt Opinion-visible path, use Direct-MCP as primary and show A2A as architecture/runtime proof.

### 3. Prompt 3 can become too verbose

Prompt 3 should not be a wall of text.

It should show top actions only:

- hold discharge
- repeat exertional oxygen/stair assessment
- confirm oxygen delivery
- confirm overnight support or alternate disposition
- document handoff and patient-facing guidance

### 4. Hidden-risk detection can look fixture-shaped

The system must show controls and ablations:

- trap patient escalates
- clean control does not escalate
- missing narrative does not fabricate
- duplicate signal is suppressed
- alternative hidden risk works

A small evidence table is enough.

## Phase 9 Goal

Phase 9 turns the working baseline into a winner-level product.

The final output should feel like:

> “This is the safety layer a real care team would want before discharge.”

Not:

> “This is a hackathon LLM demo.”

## Phase 9 Success Criteria

Phase 9 is successful when:

1. The baseline proof is green and reproducible.
2. The Transition Safety Packet is implemented or clearly surfaced.
3. Prompt 2 is evidence-first and visually undeniable.
4. Prompt 3 is compact and stable.
5. Safety invariants are visible.
6. Scenario/control evidence is packaged.
7. Judge-facing docs tell one clean story.
8. Submission does not overclaim unstable lanes.
9. The final 3-minute demo makes the hidden contradiction unforgettable.
