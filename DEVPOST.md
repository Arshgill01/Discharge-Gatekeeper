# Care Transitions Command

## Inspiration

Discharge failure rarely comes from a missing summary.

It comes from a contradiction that arrived too late, lived in the wrong layer, and never became explicit work.

The chart can look clean:

- vitals are stable
- follow-up exists
- medications are entered

And discharge can still be unsafe because the real story changed after the structured snapshot:

- the patient cannot actually get the medication tonight
- symptoms worsened after the morning assessment
- the home support plan is weaker than the chart implies

We built Care Transitions Command to change the control plane when that happens, not just describe it better.

<table>
  <tr>
    <td bgcolor="#F3E8FF">
      <strong>The wedge</strong><br/>
      This is not a generic discharge copilot. It is a discharge contradiction system. It starts from a deterministic structured baseline, checks whether late narrative evidence breaks that posture, and turns the contradiction into visible FHIR coordination work.
    </td>
  </tr>
</table>

## What it does

Care Transitions Command is a Prompt Opinion-native discharge control plane built from:

- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

The primitive is:

**Blocking evidence creates FHIR Tasks. Task completion opens the gate. The system holds discharge until the FHIR layer says otherwise.**

In the held-out Daniel Brooks demo:

- the deterministic chart looks discharge-ready
- a pharmacy note shows the medication bridge is not actually available
- a nursing note shows late orthopnea and weight gain concern
- a case-management note shows pickup logistics failure tonight

The system escalates to `not_ready`, cites the contradiction, writes blocking FHIR Tasks, records Provenance, and re-arbitrates when some tasks resolve.

## How it works

Structured EHR resources — observations, medications, orders — flow through Prompt Opinion’s FHIR context. Narrative notes live in the care documentation layer, accessed through the Clinical Intelligence MCP.

The live direct lane uses Prompt Opinion Patient Scope with `Care Transitions Command BYO Fallback`.
The architecture-proof lane keeps the synchronous `external A2A orchestrator`.

End-to-end flow:

1. Prompt Opinion forwards Patient Scope context.
2. `Discharge Gatekeeper MCP` computes the structured baseline.
3. `Clinical Intelligence MCP` checks note contradiction against that baseline.
4. Blocking evidence becomes FHIR `Task` resources.
5. `Provenance` links each task to the actual blocking evidence.
6. Prompt 4 rereads `Task.status` and re-arbitrates from the FHIR layer.

<table>
  <tr>
    <td bgcolor="#EDE9FE">
      <strong>Why this feels different in the demo</strong><br/>
      Prompt 1 changes the answer. Prompt 3 creates the work. Prompt 4 refuses to lie about progress. If only the non-clinical gates resolve, discharge still stays held.
    </td>
  </tr>
</table>

## How we built it

- TypeScript MCP runtimes for DGK and Clinical Intelligence
- synchronous A2A runtime with JSON-RPC, `/tasks`, and `/message:send` surfaces
- seeded FHIR bundles for Daniel, Maria, Eleanor, and Olivia
- Prompt Opinion Patient Scope integration
- PO workspace FHIR writeback for `Task` and `Provenance`
- polling re-arbitration instead of pretending real webhook / subscription behavior we cannot prove

### Real Daniel task example

```json
{
  "resourceType": "Task",
  "id": "dd4c6f79-5183-437d-9be0-8bca41f1240f",
  "status": "requested",
  "for": {
    "reference": "Patient/db4b066b-200f-405f-9fe4-c52eefbc1425"
  },
  "reasonReference": {
    "reference": "DocumentReference/7978a116-881e-4280-871f-1c16c59dc500"
  },
  "code": {
    "text": "Reassess late symptom change and document whether discharge remains safe today."
  }
}
```

## Live FHIR Workspace Evidence

After a complete Daniel Brooks discharge assessment, the following resources exist on Prompt Opinion’s workspace FHIR server:

### Blocking Evidence

- `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500` — Nursing Note 2026-04-19 18:40
- `DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14` — Case Management Note 2026-04-19 19:05
- `DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69` — Pharmacy Note 2026-04-19 18:15

### Discharge-Blocking Tasks

- `Task/dd4c6f79-5183-437d-9be0-8bca41f1240f` — `clinical_stability` — `requested`
  - `reasonReference: DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`
- `Task/98f80645-4c01-4d02-a930-5094312503ce` — `medication_reconciliation` — `completed`
  - `reasonReference: DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69`
- `Task/3ed46a0f-d377-4ec7-8fea-7376d107cbfb` — `patient_education` — `completed`
  - `reasonReference: DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`

### Provenance Chains

- `Provenance/a594498d-1005-45df-ab2b-2630d351d6ad` → `Task/dd4c6f79-5183-437d-9be0-8bca41f1240f` ← `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`
- `Provenance/2c19c796-c14e-4a98-8bbc-d996bb4773fc` → `Task/98f80645-4c01-4d02-a930-5094312503ce` ← `DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69`
- `Provenance/7676e2ff-6ec1-4537-bc42-8507070c61f9` → `Task/3ed46a0f-d377-4ec7-8fea-7376d107cbfb` ← `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`

### Audit Trail

- Prompt Opinion’s workspace FHIR server still rejects our live `AuditEvent` write shape.
- Local repo-side `AuditEvent` proof still exists and stays green.
- The current live PO proof chain is therefore `DocumentReference` + `Task` + `Provenance`.

These resources are independently queryable at:

`https://app.promptopinion.ai/api/workspaces/<workspace-id>/fhir/`

## Challenges we ran into

- making a held-out Daniel lane work instead of a Maria-specific demo hack
- getting Prompt Opinion Patient Scope, MCP tools, and visible transcripts to stay aligned
- handling stale ngrok / runtime state during repeated live proofs
- proving FHIR-native writeback honestly without overclaiming production hospital connectivity
- discovering that Prompt Opinion’s live `AuditEvent` parser shape is stricter than our current write shape

## Accomplishments that we're proud of

- a held-out Daniel contradiction lane that writes real PO `Task` and `Provenance` artifacts
- a clean Olivia Chen control that stays `ready` and writes zero blocking Tasks
- a Prompt 4 path that rereads real `Task.status` and still refuses to clear discharge when `clinical_stability` is unresolved
- Eleanor Singh present in the scenario matrix as a mobility / fall / home-support safety case
- a direct Prompt Opinion lane and an A2A architecture lane that both stay inspectable

## What we learned

- the most credible healthcare AI moment is not “better summarization,” it is contradiction detection with bounded evidence
- the product becomes more real when evidence changes the FHIR coordination state, not when the model just explains what should happen
- polling re-arbitration is a far more honest proof primitive than claiming live webhook / subscription behavior we cannot demonstrate
- Prompt Opinion workspace capabilities can become a real platform constraint; those constraints need to be logged explicitly, not hidden

## What’s next

- make marketplace publication green if Prompt Opinion enables publishing for this subscription / workspace
- harden the final publish / discoverability path for MCPs and the A2A surface
- keep improving the quality of the proof bundle and judge-facing packaging without changing the locked architecture
- keep expanding held-out scenario coverage while preserving the same deterministic-plus-contradiction wedge

## Safety and feasibility

- no autonomous discharge authority
- no production hospital deployment claim
- no full Epic SMART integration claim
- no real FHIR Subscription / webhook claim
- no clinician replacement claim

For the local proof lane, Prompt Opinion patient UUIDs for Daniel, Maria, Olivia, and Eleanor are mapped into seeded local FHIR bundles so the deterministic structured reads remain inspectable and reproducible without pretending this is a production hospital EHR integration.

## Proof artifacts

- endgame proof root: `output/endgame/runs/20260510T101519Z/`
- FHIR consolidation proof root: `output/endgame/runs/20260510T160443Z-fhir-consolidation/`
- current Daniel full browser proof:
  - `output/playwright/20260510T-final-daniel-p1-p4-autoprep/`
- current Olivia control:
  - `output/playwright/20260510T-final-olivia-p1-longwait/`
- current A2A proof:
  - `output/playwright/20260510T-final-a2a-vc-longwait/`

Daniel Brooks is the held-out live demo patient.
Olivia Chen is the clean control.
Eleanor Singh is the scenario-matrix safety case.
Maria Alvarez remains the regression trap.
