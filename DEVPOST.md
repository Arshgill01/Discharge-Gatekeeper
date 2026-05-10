# Care Transitions Command

## A care-transitions control system that catches the hidden discharge contradiction structured data missed — and holds the gate until the FHIR layer says otherwise.

---

## Inspiration

Discharge failure rarely comes from a missing summary. It comes from a contradiction that arrived too late, lived in the wrong layer, and never became explicit work.

The chart can look perfect. Vitals stable. Follow-up scheduled. Medications reconciled. And discharge can still be unsafe because the real story changed after the structured snapshot:

- a late nursing note documents orthopnea and weight gain that the morning assessment never captured
- a pharmacy note reveals the medication bridge is not actually available tonight
- a case-management addendum shows the caregiver who was supposed to pick up the patient cannot come

By the time these contradictions surface in normal workflow, the patient may already be in a cab home. The risk was never in the structured fields. It was in the narrative — and nobody converted that narrative into reviewable, trackable coordination work.

We built **Care Transitions Command** to change the control plane when that happens. Not to describe discharge better. To stop it when the evidence demands, write the blocking work into the EHR, and hold the gate until the EHR says the work is done.

---

## What it does

Care Transitions Command is a Prompt Opinion-native discharge control plane composed of three components:

- **Discharge Gatekeeper MCP** — the deterministic structured discharge spine
- **Clinical Intelligence MCP** — bounded narrative contradiction intelligence
- **external A2A orchestrator** — synchronous prompt-level coordination across both

The primitive is simple and unforgiving:

> **Blocking evidence creates FHIR Tasks. Task completion opens the gate. The system holds discharge until the FHIR layer says otherwise.**

### The 3-prompt demo

**Prompt 1 — `Is this patient safe to discharge today?`**

The structured chart says `ready`. The system checks the notes anyway. A hidden contradiction surfaces. The final answer becomes `not_ready`.

**Prompt 2 — `What hidden risk changed that answer? Show me the contradiction and the evidence.`**

The system points to the exact nursing note, pharmacy note, and case-management addendum that broke the structured posture. Citations are live FHIR `DocumentReference` IDs.

**Prompt 3 — `What exactly must happen before discharge, and prepare the transition package.`**

The contradiction becomes work: prioritized next steps with owners and timing, a clinician handoff brief, and patient-facing hold instructions. Then the system writes blocking FHIR `Task` resources, links each to its evidence through `reasonReference`, and records `Provenance`.

### The held-out demo patient: Daniel Brooks

Daniel looks discharge-ready on every structured field. Then three late notes arrive:

1. **Pharmacy note** — the medication bridge is not available tonight
2. **Nursing note** — late orthopnea and 3-lb weight gain since morning
3. **Case-management note** — pickup logistics failure; no confirmed caregiver tonight

The system escalates to `not_ready`, cites the contradiction, writes blocking FHIR Tasks, records Provenance chains, and refuses to clear discharge until `clinical_stability` resolves.

### Prompt 4 — the re-arbitration moment

A week later, medication access and home monitoring are resolved. The system rereads live `Task.status`. Non-clinical gates clear. But `clinical_stability` is still open because orthopnea persists.

The answer stays `not_ready`.

This is not a summarization tool. It is a control system with memory.

---

## How it works

### Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    Prompt Opinion Workspace                            │
│  Clinician selects patient → general chat agent or BYO               │
│  consults Care Transitions Command (FHIR context forwarded)            │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Patient Scope + FHIR R4 context
                           │  (observations, meds, orders, docs)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Care Transitions Command (local / A2A)                  │
│                                                                       │
│  ┌──────────────────  A2A Orchestrator  ─────────────────────┐      │
│  │ Synchronous JSON-RPC · Agent card · Task envelope          │      │
│  │ Prompt-aware routing · Fusion logic · Re-arbitration loop   │      │
│  └──────────────────────┬────────────────────────────────────┘      │
│                         │                                           │
│        ┌────────────────┼────────────────┐                          │
│        │                │                │                          │
│        ▼                ▼                ▼                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │Discharge │   │  Clinical    │   │   FHIR       │                │
│  │Gatekeeper│   │  Intelligence│   │   Evidence   │                │
│  │   MCP    │   │     MCP      │   │   Ledger     │                │
│  └──────────┘   └──────────────┘   └──────────────┘                │
│       │                │                    │                       │
│       ▼                ▼                    ▼                       │
│  deterministic    note contradiction    Task · Provenance          │
│  structured          detection             · AuditEvent             │
│  baseline         evidence-backed            write-back             │
│                                                                    │
└──────────────────────────────────────────────────────────────────────┘
                           ▲
                           │  FHIR R4 over Bearer token
                           │  (Prompt Opinion workspace-scoped)
                           ▼
            Prompt Opinion FHIR server (workspace-scoped)
```

### Component responsibilities

**Discharge Gatekeeper MCP**
- Computes the deterministic structured discharge posture from FHIR observations, medications, orders, and encounters
- Normalizes patient context against a canonical 8-category blocker taxonomy
- Emits provisional verdicts: `ready`, `ready_with_caveats`, `not_ready`
- Never reasons over free-text notes

**Clinical Intelligence MCP**
- Reads narrative evidence from FHIR `DocumentReference` resources
- Detects contradictions against the structured baseline using bounded reasoning
- Returns cited findings with explicit `DocumentReference` anchors
- Never fabricates hidden risk when no contradiction exists

**external A2A orchestrator**
- Receives the Prompt Opinion prompt
- Calls Discharge Gatekeeper MCP first, then Clinical Intelligence MCP when note review is warranted
- Fuses deterministic and narrative evidence into one user-visible answer
- Writes blocking FHIR `Task` resources with `reasonReference` links
- Records `Provenance` chains from evidence to task
- Supports polling re-arbitration: rereads `Task.status` before changing a prior verdict

---

## Stack

| Layer | Tech |
|---|---|
| Agent framework | Model Context Protocol (MCP) SDK v1.25.1 |
| Runtime | TypeScript 5.8, Express 5.1, tsx |
| Validation | Zod 4.2 |
| FHIR client | `@smile-cdr/fhirts` 2.3.0 + native REST |
| Protocol | A2A v1 over JSON-RPC 2.0 (synchronous) |
| Context propagation | Prompt Opinion Patient Scope + FHIR R4 Bearer token |
| LLM | Google Gemini 2.5 Flash (bounded note reasoning only) |
| Hosting | Local ngrok + Prompt Opinion workspace |
| Evidence layer | FHIR R4 `Task`, `Provenance`, `DocumentReference` |

---

## What only generative AI can do here

A rules engine can check whether SpO2 is below 90%. It cannot read a free-text nursing note and understand that "patient became visibly dyspneic after six stairs" contradicts the structured resting SpO2 of 94%. It cannot connect that note to the case-management addendum stating "oxygen vendor cannot deliver until tomorrow morning" and produce the insight that discharge home tonight is unsafe for three separate reasons. And it certainly cannot do this for every possible note-writing style, every possible combination of late-arriving documents, and every possible clinical scenario without pre-enumerating every cross-product by hand.

Care Transitions Command's generative AI layer does three things rule-based software cannot:

1. **Unstructured narrative → structured clinical contradiction.** Nursing notes, pharmacy clarifications, and case-management addenda are free-text documents written by humans for humans, in wildly varying styles. Gemini extracts the specific claim that contradicts the structured baseline and maps it to a canonical blocker category. A rules engine fails at heterogeneous unstructured input.

2. **Open-ended evidence composition.** The Clinical Intelligence MCP decides which notes to read, when a contradiction is strong enough to escalate, when evidence is inconclusive and should return `manual_review_required`, and how to compose the contradiction summary — all at runtime, given the patient's actual documents. A rules engine has to enumerate every branch at design time.

3. **Cross-layer synthesis at the patient level.** The signature insight ("the structured chart said ready, but this nursing note changes the answer") emerges from joining two independent data sources (deterministic structured posture + narrative contradiction) at inference time. The deterministic layer can tell you the chart looks fine. The narrative layer can tell you the note is concerning. Connecting them into a single coherent clinical narrative with evidence citations is reasoning, not lookup.

---

## What's deterministic vs what's LLM

The deterministic layer exists because generative AI should not invent discharge blockers, fabricate evidence, or hallucinate FHIR resources. It is a safety and credibility choice, not an absence of AI.

**Deterministic (no LLM):**
- structured patient-context normalization
- canonical blocker taxonomy and severity scoring
- FHIR `Task` resource drafting with deterministic UUIDv5 generation
- `Provenance` chain construction
- re-arbitration polling logic
- red-flag rule evaluation against structured observations

**LLM (Gemini 2.5 Flash, bounded):**
- free-text note interpretation and contradiction detection
- evidence-to-blocker mapping from narrative content
- plain-language contradiction summaries
- clinician handoff brief composition
- patient-facing discharge instruction generation

We never ask the model to invent a clinical fact, generate a FHIR resource shape from scratch, or produce a blocker that does not have a note-backed citation. Every clinical claim has a `DocumentReference` anchor. The model's job is to read unstructured input, decide which contradictions matter, reason across the structured outputs, and write the result. A rules engine cannot do any of those at the open-ended scope this clinical workflow demands.

---

## How a request flows

1. **Clinician opens Prompt Opinion**, selects a patient, and asks: *"Is this patient safe to discharge today?"*
2. **Prompt Opinion forwards** the FHIR context (Patient, Encounter, Observations, Medications, DocumentReferences) through Patient Scope.
3. **The orchestrator** calls Discharge Gatekeeper MCP to compute the deterministic structured baseline.
4. **If note review is warranted**, the orchestrator calls Clinical Intelligence MCP to inspect `DocumentReference` resources for contradictions.
5. **The orchestrator fuses** both outputs into a single reconciled verdict.
6. **If the verdict is `not_ready`**, the orchestrator drafts blocking FHIR `Task` resources, links each to its evidence via `reasonReference`, and records `Provenance`.
7. **The response returns** inside Prompt Opinion's chat with the final verdict, contradiction summary, citations, and next-step package.
8. **On re-arbitration** (Prompt 4), the orchestrator re-queries live `Task.status` from the workspace FHIR server before updating the verdict.

End-to-end, a single discharge assessment completes in under 30 seconds against the live Prompt Opinion FHIR workspace.

---

## Challenges we ran into

**A2A v1 dialect mismatch.** The platform's A2A v1 validation expects a rich agent card with public URL, protocol version, non-empty skills, and `text/plain` modes. Our initial sparse card produced a hard `422` during Prompt Opinion external-agent validation. Fix: a complete agent-card generator that exposes all required fields and keeps the runtime compatible with platform validation.

**FHIR context alignment across three runtimes.** Prompt Opinion Patient Scope, MCP tool bindings, and visible chat transcripts had to stay aligned across Discharge Gatekeeper MCP, Clinical Intelligence MCP, and the external A2A orchestrator. Any drift produced silent failures where the tool executed but the transcript showed no result. Fix: explicit request-id correlation logging and smoke checks that verify end-to-end evidence persistence.

**Held-out demo patient vs. regression trap.** The natural instinct is to build the demo around the patient whose notes you hand-curated. We forced a held-out Daniel Brooks lane: his notes were never edited to make the contradiction more dramatic, and his structured baseline was never tweaked to make the flip more obvious. If the system works on Daniel, it works on any patient with a real contradiction. If it only works on Maria, it is a demo hack.

**FHIR write-back honesty.** We could have claimed "we integrate with Epic" or "we use FHIR Subscriptions." We do not. We write real `Task` and `Provenance` resources to Prompt Opinion's workspace FHIR server. We document exactly which resources work live and which shapes the platform still rejects (`AuditEvent`). We use polling re-arbitration instead of claiming webhook behavior we cannot demonstrate.

**Stale ngrok and runtime state.** During repeated live proof sessions, tunnel URLs changed, MCP registrations became stale, and smoke checks passed locally while the workspace saw stale tool definitions. Fix: a full bootstrap-and-registration script that tears down and rebuilds the Prompt Opinion connection before every judged session.

---

## Accomplishments that we're proud of

- A **held-out live demo patient** (Daniel Brooks) whose contradiction lane writes real Prompt Opinion `Task` and `Provenance` artifacts — no demo hacks, no hand-tuned notes.
- A **clean control patient** (Olivia Chen) who stays `ready`, triggers zero blocking Tasks, and proves the system does not force escalation when no contradiction exists.
- A **Prompt 4 re-arbitration path** that rereads live `Task.status` and still refuses to clear discharge when `clinical_stability` is unresolved — proving the system has memory, not just prose.
- A **scenario-matrix safety case** (Eleanor Singh) for mobility, fall risk, and home-support failure — showing the contradiction pattern generalizes beyond one patient.
- A **direct Prompt Opinion lane and an A2A architecture lane** that both stay inspectable and honest about which is primary and which is fallback.
- A **deterministic + LLM hybrid** where every drug interaction, vital threshold, and FHIR resource shape is hardcoded, and every contradiction finding has a `DocumentReference` citation.

---

## What we learned

- **The most credible healthcare AI moment is not "better summarization."** It is contradiction detection with bounded evidence, explicit citations, and a verdict that changes because of what the model found.
- **The product becomes more real when evidence changes the coordination state.** A model that explains why discharge should be held is useful. A system that writes a FHIR Task, links it to the evidence, and refuses to clear discharge until that Task completes is a control plane.
- **Polling re-arbitration is a far more honest proof primitive** than claiming live webhook or FHIR Subscription behavior you cannot demonstrate to a judge in real time.
- **Platform constraints are not bugs to hide.** Prompt Opinion's workspace FHIR server rejects certain `AuditEvent` shapes. We document that honestly, keep local `AuditEvent` proof green, and do not pretend the live path is more complete than it is.
- **Single coherent system, multiple skills wins.** A previous architecture exploration had us considering streaming multi-agent choreography. The winning simplification was: two MCPs with sharp boundaries, one synchronous orchestrator, one patient at a time.

---

## What's next for Care Transitions Command

- **Native marketplace publication.** When Prompt Opinion enables publishing for this subscription tier, publish both MCPs with clear identity boundaries and the A2A orchestrator as the preferred assembled-agent path.
- **Persistent task memory across sessions.** Each consult is currently a fresh run. A clinical-grade version should track day-over-day task resolution and surface trend alerts when blockers stall for too long.
- **Expanded procedure and specialty coverage.** The current blocker taxonomy is general medicine. A clinical-grade version would partner with hospital medicine and surgical teams on specialty-specific contradiction patterns.
- **Native FHIR ServiceRequest output.** Today the drafter emits `Task` + `Provenance`. A production version would also draft `ServiceRequest` for follow-up imaging, `Appointment` for re-review, and `Communication` for patient-facing alerts.
- **Clinical validation.** A prospective observational study comparing standard discharge planning against Care Transitions Command-augmented review on patients with late-arriving narrative documentation.

---

## Safety, privacy, and feasibility

- **Synthetic data by design for the hackathon; production-ready for real FHIR.** Demo patients are hand-built FHIR transaction bundles so the project complies with the no-PHI rule. The same agent code runs unchanged against a real institutional FHIR server: it speaks FHIR R4 over Bearer token, the protocol every modern EHR exposes.
- **Decision support, not autonomous discharge.** Every blocking Task is `status="requested"`, not `completed`. Every drafted resource carries `review_required: true`. A licensed clinician must approve before anything reaches finality.
- **Defers to the care team.** Patient-facing language never says "you cannot leave." It says "contact your care team before discharge."
- **Boundaries on scope.** The system classifies severity and recommends actions. It does not diagnose, it does not order, it does not auto-message patients. It is a specialist consult, invoked by a clinician, scoped to a single workspace and a single patient at a time.
- **Compliance posture.** Prompt Opinion Patient Scope means the agent operates entirely under the workspace's existing FHIR authorization; we never store credentials, we never persist patient data between requests, and the FHIR token is request-scoped. That posture is HIPAA- and GDPR-compatible by construction.

This is feasible in a real healthcare system today. The technical plumbing (FHIR R4, deterministic discharge rules, MCP-based tool composition, A2A v1 synchronous orchestration) is production-grade and already standard at institutions with active interoperability programs. The agent layer adds the integrative reasoning that does not exist between those primitives today. The path from this submission to a clinical pilot is a validation and procurement conversation, not a re-architecture.

---

## Proof artifacts

| Artifact | Location |
|---|---|
| Endgame audit | `output/endgame/runs/20260510T101519Z/final-endgame-audit.md` |
| FHIR consolidation proof | `output/endgame/runs/20260510T160443Z-fhir-consolidation/po-workspace-proof/summary.md` |
| Daniel full browser proof (P1-P4) | `output/playwright/20260510T-final-daniel-p1-p4-autoprep/` |
| Olivia clean control | `output/playwright/20260510T-final-olivia-p1-longwait/` |
| A2A consult proof | `output/playwright/20260510T-final-a2a-vc-longwait/` |

**Daniel Brooks** — held-out live demo patient. Structured `ready` → note contradiction → `not_ready` → blocking Tasks → Prompt 4 re-arbitration still holds.

**Olivia Chen** — clean control. `ready`, `no_hidden_risk`, zero blocking Tasks.

**Eleanor Singh** — scenario-matrix safety case. `not_ready` with mobility / fall / home-support failure.

**Maria Alvarez** — regression trap. Contradiction remains conservative and avoids Daniel bleed.
