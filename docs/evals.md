# Evals

## Evaluation goal
Protect the product from becoming a vague discharge chatbot.
The system should consistently produce:
- a clear verdict
- blocker categories
- evidence
- a practical next-step plan

## Core acceptance prompts
### Prompt A
“Is this patient safe to discharge today?”

Expected behavior:
- returns one canonical verdict
- does not hedge into useless prose
- gives the top blockers or the top reasons for readiness

### Prompt B
“What exactly is blocking discharge?”

Expected behavior:
- returns a structured blocker list
- each blocker has category and severity or priority
- each blocker has an evidence basis

### Prompt C
“What must happen before the patient leaves?”

Expected behavior:
- returns a prioritized checklist
- avoids vague generic advice
- aligns with the blocker list

### Prompt D
“Prepare the transition package.”

Expected behavior:
- produces at least one clinician-facing artifact
- produces at least one patient-facing artifact
- stays consistent with the verdict and blockers

## Negative tests
### Missing patient context
Prompt:
“Is this patient safe to discharge today?”
with no patient context available

Expected behavior:
- fails clearly
- states what context is missing
- does not fabricate a verdict

### Weak evidence case
Prompt:
“Is this patient safe to discharge today?”
for a patient with insufficient notes or incomplete resources

Expected behavior:
- expresses that evidence is insufficient
- avoids false confidence
- says what additional evidence would help

### Contradictory notes
Prompt:
“What is blocking discharge?”
for a case where one note says discharge is likely and another flags unresolved home oxygen needs

Expected behavior:
- highlights the conflict
- does not collapse into a single unsupported answer
- surfaces the unresolved blocker

## Output rubric
### 1) Verdict clarity
Bad:
- long paragraph with no explicit verdict
Good:
- immediate verdict plus one-sentence summary

### 2) Blocker usefulness
Bad:
- vague categories like “clinical concern”
Good:
- concrete blockers tied to action and evidence

### 3) Evidence grounding
Bad:
- confident claims with no source basis
Good:
- obvious linkage to note text or structured context

### 4) Actionability
Bad:
- generic “follow up as needed”
Good:
- specific next actions and owners

### 5) Safety framing
Bad:
- implies autonomous discharge authority
Good:
- frames outputs as assistive support for clinician review

## Regression checklist
Run this whenever tool logic changes:
- verdict still uses canonical labels
- blocker categories remain stable
- outputs still mention evidence
- patient-facing content remains simple
- system still fails usefully when context is missing

## Minimum MVP pass bar
The MVP passes if:
- Prompt A works for the demo patient
- Prompt B returns at least three real blockers
- Prompt C returns a sensible plan
- Prompt D returns one usable artifact

## V1 readiness smoke checks (Agent 3 slice)
Tool under test: `assess_discharge_readiness`

Required response contract keys:
- `verdict`
- `blockers`
- `evidence`
- `next_steps`
- `summary`

Accepted v1 verdict states:
- `ready`
- `ready_with_caveats`
- `not_ready`

Accepted v1 blocker categories:
- `clinical`
- `medications`
- `follow_up`
- `education`
- `home_support`
- `logistics`

First scenario expectation (`first_synthetic_discharge_slice_v1`):
- verdict is `not_ready`
- blocker list contains all six categories above
- every blocker references evidence by ID
- `next_steps` aligns one-to-one with blockers and preserves priority

Smoke prompts for this scenario:
1. `Can this patient be safely discharged today?`
2. `What exactly is blocking discharge right now?`
3. `What must happen before this patient leaves?`

Expected outputs:
- Prompt 1: explicit `not_ready` verdict with a concise summary
- Prompt 2: six blockers with category + priority + evidence linkage
- Prompt 3: ordered `next_steps` mapped to blocker IDs

Smoke command:
- `npm run smoke:readiness` (from `po-community-mcp-main/typescript`)

Pass condition:
- smoke script exits 0 and prints `SMOKE PASS: assess_discharge_readiness v1`

Fail condition:
- missing required response keys
- non-canonical verdict/category labels
- evidence IDs referenced by blockers are not present in `evidence`
- verdict deviates from expected first-scenario output
