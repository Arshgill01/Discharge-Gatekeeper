# Demo Script

## Demo objective
Show judges a workflow that is:
- immediately useful
- clearly AI-native
- clearly interoperable
- obviously feasible today

## Demo length target
2 minutes 20 seconds to 2 minutes 50 seconds.
Leave a small buffer.

## Core story
A patient appears close to discharge, but hidden blockers remain across notes, meds, follow-up, and home support.
Discharge Gatekeeper catches those blockers before an unsafe transition happens.

## Recommended patient shape
A single patient with 3 to 4 blockers is enough.
Do not overload the story.
The output should feel crisp, not chaotic.

## Prompt 1
### User asks
“Is this patient safe to discharge today?”

### What should happen
- Prompt Opinion invokes the MCP toolchain.
- The system assesses discharge readiness.
- The system returns `not_ready` or `ready_with_caveats`.
- The result includes a short blocker summary.

### What the judge should feel
“This is not a chatbot summary. It is making a clear discharge-readiness call.”

## Prompt 2
### User asks
“What exactly is blocking discharge?”

### What should happen
- The system returns a structured blocker list.
- Each blocker includes category, severity, and evidence.
- The reasoning feels grounded and inspectable.

### What the judge should feel
“It found things scattered across the chart and notes that a simple checklist would miss.”

## Prompt 3
### User asks
“Prepare the transition package.”

### What should happen
- The system returns a prioritized next-step plan.
- The system drafts at least one clinician-facing artifact and one patient-facing artifact.

### What the judge should feel
“This could save real time and reduce a risky handoff.”

## On-screen emphasis
During the demo, make sure the audience can quickly see:
- the verdict
- the blockers
- the evidence
- the transition outputs

Do not spend time on low-value UI wandering.

## Narration guidance
Say less.
Explain the value in one sentence per step.
Avoid long architecture speeches.

Suggested framing:
- “We ask one question: is this patient truly safe for discharge today?”
- “The agent synthesizes patient context, FHIR data, and notes.”
- “It returns blockers with evidence, then prepares the transition plan.”

## What not to do
- Do not show more than one patient unless the first story is extremely clean.
- Do not drown the judge in long note text.
- Do not overclaim medical autonomy.
- Do not show speculative dashboards.
- Do not make the demo depend on a fragile manual setup step.

## Backup path
If tool traces or richer outputs fail during a live demo:
- still show the verdict
- still show the blocker list
- still show one transition artifact

The core story must survive partial failure.

## Success test
A judge who looks away for 10 seconds should still understand:
- why the patient is not yet safe to discharge
- what has to happen next
- why this is better than a generic chatbot
