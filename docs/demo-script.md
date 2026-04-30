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
- the A2A layer is synchronous request/response, not streaming
- Prompt Opinion is the only user-facing surface

Primary live demo path:
- Direct-MCP 3 prompts in Prompt Opinion:
  - Prompt 1 via `Discharge Gatekeeper MCP`
  - Prompt 2 via `Clinical Intelligence MCP`
  - Prompt 3 via `Clinical Intelligence MCP.synthesize_transition_narrative`

Architecture proof path:
- one-turn Prompt Opinion -> `external A2A orchestrator` -> both MCPs -> one synchronous reconciled response

Exploratory path only:
- full A2A 3-prompt flow stays non-primary unless a current run folder proves it green

Current workspace note:
- the intended fallback story remains one BYO operator path, but the 2026-04-21 continuation pass isolated a Prompt Opinion dual-MCP BYO execution problem.
- if that blocker is still present on demo day, the narrowest stable workspace fallback is to use the dedicated single-tool Clinical Intelligence BYO agents for Prompt 2 and Prompt 3 while keeping the architecture explanation accurate.
- Phase 8.5 route-lock: Direct-MCP is the judged live lane until the current run folder proves a stronger option.
- the stable A2A claim is one-turn assembled proof only unless a current run folder proves the full 3-prompt A2A lane green.
- 2026-04-30 authenticated browser evidence did not prove either target lane fully green. Direct-MCP Prompt 2 and Prompt 3 are usable, but Prompt 1 still lands on the structured-only `ready` baseline. A2A route-lock variants B/C prove Prompt Opinion can reach the external runtime and both MCPs, but the assembled clinical answer is not yet acceptable because the runtime is not hydrating the canonical narrative bundle from Prompt Opinion prompt-only A2A calls.

Run-status source of truth before any demo:
- `output/prompt-opinion-e2e/latest/reports/status-summary.md`
- `output/prompt-opinion-e2e/latest/notes/experiment-matrix.md`
- `output/prompt-opinion-e2e/latest/notes/request-id-correlation.md`
- `output/prompt-opinion-e2e/latest/notes/workspace-evidence.md`

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
- the contradiction story is preserved even when the judged lane is Direct-MCP and the A2A lane is shown separately as architecture proof

Judge should notice at Prompt 1:
- the baseline structured posture is still visible (`ready`)
- the final reconciled answer is already escalated (`not_ready`)
- hidden-risk review status is explicit, not implied

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
Judge should notice at this moment:
- the contradiction is explicit (`structured baseline looked ready` vs `note evidence makes home discharge unsafe now`)
- citations anchor the exact nursing/case-management sources that forced escalation
- Prompt 2 stays focused on contradiction evidence, not transition-package action-list noise

## Prompt 3
User prompt:
`What exactly must happen before discharge, and prepare the transition package.`

Operator constraint:
- keep the requested transition package concise enough for Prompt Opinion to finish without platform LLM timeout. The 2026-04-30 full run hit a visible timeout on Prompt 3 after partial output; the immediate direct-lane retry completed without the timeout banner, but the safe fix is still to reduce context/tool-response size and cap transition-package verbosity.

Show on screen:
- prioritized next steps with owner and timing
- clinician handoff brief
- patient-facing hold/discharge guidance aligned to the blockers
- evidence-linked rationale for the top actions

What this proves:
- the system moves from detection to execution
- the contradiction is operationalized into a usable transition package
- the fallback/non-A2A path can still deliver a complete transition package from the two MCPs
- A2A path is demo-safe because transition actions are reconciled in the same payload as final disposition context

Judge should notice at Prompt 3:
- the contradiction has been converted into concrete next actions
- the final posture remains `not_ready` until those actions are done
- the output remains assistive and non-autonomous

## Fallback/non-A2A operator path
Use this direct two-MCP order when A2A discovery or `/tasks` invocation fails:
1. Prompt 1 via `Discharge Gatekeeper MCP` baseline + manual two-MCP verdict narration
2. Prompt 2 via `Clinical Intelligence MCP` contradiction and citations
3. Prompt 3 via `Clinical Intelligence MCP.synthesize_transition_narrative` so the fallback path still returns a concrete transition package after the hidden-risk escalation

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

## If time is short
Keep these in order:
1. Prompt 2 contradiction + citations (strongest moment)
2. Prompt 1 baseline-vs-final posture change
3. Prompt 3 top 2-3 pre-discharge actions
4. A2A mechanics detail

## Fallback rule
If the richer display degrades, preserve the story in this order:
1. final verdict
2. structured posture before escalation
3. exact contradiction
4. top next steps

Switch to direct two-MCP fallback immediately when:
- the current run folder does not mark `A2A-main` as `green`, or
- A2A agent card discovery fails, or
- `POST /tasks` does not return one clean synchronous response in rehearsal, or
- the request-id correlation note cannot prove a real Prompt Opinion hit on the external runtime

## Done check
A judge should be able to explain the product in one sentence:
"It caught the hidden note contradiction that turned a discharge-ready chart into an unsafe discharge."

Judge feeling target at the contradiction moment:
"The structured chart looked fine, but this system found the specific note evidence that changed the real-world discharge risk."

## Operator status lock
Do not go live until status is explicit:
- `green`: the current run folder proves the lane end-to-end and the lane is eligible to be primary
- `yellow`: proof is partial or missing a required artifact; the lane cannot be primary
- `red`: a blocking defect, failed required validation, or missing required evidence makes the lane unusable

Promotion rule:
- use `A2A-main` as the live lane only when both `A2A-main` and `Direct-MCP fallback` are `green` in the current run folder
- if `A2A-main` is `yellow` or `red` and `Direct-MCP fallback` is `green`, run the fallback lane and keep the architecture narration accurate
- if `A2A-main` is not green, the operator notes must say whether the blocker is `registration_only`, `chat_path_not_routed`, `runtime_hit_but_no_transcript`, or `runtime_hit_but_downstream_failure`
