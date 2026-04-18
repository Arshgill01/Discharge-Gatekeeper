# Demo Script

## Goal
Deliver a 3-prompt Prompt Opinion demo that proves Care Transitions Command can stop an unsafe discharge when the hidden risk only becomes visible after note contradiction review.

## Demo thesis
The patient looks discharge-ready on the deterministic structured spine.
The notes contradict that posture.
The system catches the contradiction, flips the answer, and tells the team what happens next.

## Locked demo architecture
The demo story assumes:
- Discharge Gatekeeper MCP produces the structured posture
- Clinical Intelligence MCP surfaces the hidden contradiction
- the external A2A orchestrator fuses both into one answer
- Prompt Opinion is the only user-facing surface

## Canonical patient
Use the patient defined in `docs/phase0-trap-patient-spec.md`.

Structured posture before note escalation:
- `ready`

Final system posture after contradiction review:
- `not_ready`

## Prompt 1
User prompt:
`Is this patient safe to discharge today?`

Show on screen:
- final verdict: `not_ready`
- one-line explanation that the structured discharge spine looked ready, but narrative evidence forced escalation
- blocker count and top blocker categories
- hidden-risk layer status from `Clinical Intelligence MCP` (`ok`, `inconclusive`, `insufficient_context`, or `error`)

What this proves:
- the system is not doing generic summarization
- the answer can change when evidence outside the structured snapshot matters
- Prompt 1 is stronger than the old structured-only story because it preserves baseline `ready` and still lands on final `not_ready`

## Prompt 2
User prompt:
`What hidden risk changed that answer? Show me the contradiction and the evidence.`

Show on screen:
- the structured posture before escalation: `ready`
- the contradiction summary
- the exact note-backed hidden risk
- explicit citation anchors to the contradiction source(s)
- impacted blocker categories:
  - `clinical_stability`
  - `equipment_and_transport`
  - `home_support_and_services`

What this proves:
- the AI factor is contradiction detection, not vague prose
- the system can point to the evidence that changed the decision
- if no hidden risk exists, the system can explicitly show bounded `no_hidden_risk` behavior rather than forced escalation
- the hidden-risk signal is note-dependent (if contradiction notes are absent, escalation should not occur)

This is the holy-shit moment.

## Prompt 3
User prompt:
`What exactly must happen before discharge, and prepare the transition package.`

Show on screen:
- prioritized next steps with owner and timing
- clinician handoff brief
- patient-facing hold/discharge guidance aligned to the blockers
- evidence-linked rationale for the top actions

What this proves:
- the system moves from detection to execution
- the contradiction is operationalized into a usable transition package
- the fallback/non-A2A path can still deliver a complete transition package from the two MCPs

## Fallback/non-A2A operator path
Use this direct two-MCP order when A2A is unavailable or intentionally disabled in Phase 2:
1. Prompt 1 via `Discharge Gatekeeper MCP` baseline + manual two-MCP verdict narration
2. Prompt 2 via `Clinical Intelligence MCP` contradiction and citations
3. Prompt 3 via `Discharge Gatekeeper MCP` transition package with cited escalation context narrated by operator

Quality gates for this fallback path:
- trap patient: baseline `ready` then final `not_ready` after contradiction review
- control patient: explicit `no_hidden_risk`, no forced escalation
- contradiction proof: visible citation anchors for the nursing contradiction note and case-management addendum

## Narration lines
- Prompt 1: "The structured chart looked ready, but the system did not stop there."
- Prompt 2: "This note contradiction is why discharge becomes unsafe."
- Prompt 3: "Now the team gets the exact actions and handoff package needed to hold discharge safely."

## Show vs skip
Show:
- final verdict
- structured posture before escalation
- exact contradiction summary
- source-linked blockers
- next-step owners

Skip:
- generic architecture explanation
- raw note walls
- extra patients
- custom UI mockups
- roadmap features outside the 3-prompt story

## Fallback rule
If the richer display degrades, preserve the story in this order:
1. final verdict
2. structured posture before escalation
3. exact contradiction
4. top next steps

## Done check
A judge should be able to explain the product in one sentence:
"It caught the hidden note contradiction that turned a discharge-ready chart into an unsafe discharge."

Judge feeling target at the contradiction moment:
"The structured chart looked fine, but this system found the specific note evidence that changed the real-world discharge risk."
