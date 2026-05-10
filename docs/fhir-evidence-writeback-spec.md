# FHIR Evidence Ledger and Write-Back Spec

## Purpose

This spec defines how Care Transitions Command should turn hidden discharge risk into FHIR-native care coordination artifacts.

The goal is to move from:

> “The model recommends actions.”

to:

> “The system writes FHIR Tasks with evidence references, Provenance chains, and AuditEvents.”

## Core Principle

**No FHIR write-back without FHIR evidence.**

Every discharge-blocking Task must be justified by at least one FHIR resource reference.

## Evidence Ledger

Each Transition Safety Packet should include a FHIR Evidence Ledger.

### Shape

```json
{
  "fhir_server": "https://...",
  "fhir_resources_read": [],
  "structured_evidence": [],
  "narrative_evidence": [],
  "controlling_evidence": [],
  "superseded_evidence": [],
  "resolution_evidence": [],
  "fhir_resources_written": []
}
```

### Evidence Item

```json
{
  "reference": "Observation/maria-spo2-exertion",
  "resourceType": "Observation",
  "id": "maria-spo2-exertion",
  "timestamp": "2026-04-18T20:40:00Z",
  "role": "controlling_evidence",
  "summary": "SpO2 dropped to 82% after exertion/stairs.",
  "supports": ["clinical_stability"],
  "source": "FHIR"
}
```

### Roles

Allowed roles:

- `structured_baseline`
- `narrative_evidence`
- `controlling_evidence`
- `superseded_evidence`
- `blocking_evidence`
- `resolution_evidence`
- `audit_target`
- `task_reason`

## Task Write-Back

### When To Write Tasks

Write blocking Tasks when:

- final status is `not_ready`, or
- status is `ready_with_caveats` and specific gates must be completed before release, or
- manual review is required due to unresolved/inconclusive transition evidence.

Do not write blocking Tasks when:

- final status is `ready`,
- hidden risk result is `no_hidden_risk`,
- evidence is inconclusive and not actionable,
- there is no FHIR source reference.

### Task Shape

```json
{
  "resourceType": "Task",
  "status": "requested",
  "intent": "order",
  "priority": "urgent",
  "code": {
    "text": "Repeat exertional oxygen assessment before discharge"
  },
  "for": {
    "reference": "Patient/maria-alvarez"
  },
  "encounter": {
    "reference": "Encounter/maria-discharge-2026-0418"
  },
  "owner": {
    "reference": "PractitionerRole/bedside-rn"
  },
  "reasonReference": {
    "reference": "Observation/maria-spo2-exertion"
  },
  "note": [
    {
      "text": "Discharge blocked: exertional SpO2 dropped to 82%; reassessment required before home discharge."
    }
  ],
  "meta": {
    "tag": [
      {
        "system": "https://care-transitions-command.local/tags",
        "code": "ctc-generated"
      }
    ]
  }
}
```

### Task Categories

Map blocker categories to Task templates.

#### Clinical Stability

Owner:

- `PractitionerRole/bedside-rn`
- `PractitionerRole/covering-clinician`

Evidence examples:

- abnormal Observation
- nursing note
- late symptom note

Task examples:

- repeat exertional oxygen assessment
- reassess orthopnea/weight change
- clinician sign-off required

#### Equipment / Transport / DME

Owner:

- `PractitionerRole/case-manager`
- DME/vendor role if represented

Evidence examples:

- ServiceRequest
- case-management DocumentReference
- Task/Order status

Task examples:

- confirm oxygen delivery
- confirm walker/DME delivered
- arrange alternate disposition if equipment unavailable

#### Home Support

Owner:

- `PractitionerRole/case-manager`
- family/caregiver pseudo-role if represented

Evidence examples:

- case-management DocumentReference
- social work note

Task examples:

- confirm overnight support
- confirm caregiver availability
- arrange home health / alternate disposition

#### Medication Access

Owner:

- pharmacist
- case manager
- clinician

Evidence examples:

- MedicationRequest
- pharmacy DocumentReference
- coverage/prior authorization note

Task examples:

- approve bridge supply
- confirm medication delivered to bedside
- resolve prior authorization or choose accessible substitute

#### Mobility / Fall Risk

Owner:

- physical therapist
- bedside nurse
- clinician

Evidence examples:

- PT addendum
- nursing safety note
- ServiceRequest for walker/DME

Task examples:

- repeat stair assessment
- confirm walker delivery
- teach-back fall precautions

#### Patient Education / Teach-Back

Owner:

- nurse/care team

Evidence examples:

- nursing note
- discharge education note

Task examples:

- repeat teach-back
- update discharge instructions
- document understanding of red flags

## Provenance Write-Back

Each generated Task should have a Provenance resource.

### Provenance Shape

```json
{
  "resourceType": "Provenance",
  "target": [
    {
      "reference": "Task/discharge-block-clinical-001"
    }
  ],
  "recorded": "2026-04-18T20:58:00Z",
  "agent": [
    {
      "role": [
        {
          "text": "CareTransitionsCommand"
        }
      ],
      "who": {
        "display": "Clinical Intelligence MCP"
      }
    }
  ],
  "entity": [
    {
      "role": "source",
      "what": {
        "reference": "Observation/maria-spo2-exertion"
      }
    },
    {
      "role": "source",
      "what": {
        "reference": "DocumentReference/maria-nursing-note-2040"
      }
    }
  ]
}
```

### Requirements

- target must reference the created Task or verdict artifact if represented.
- entity must include source evidence.
- agent should identify Care Transitions Command / relevant MCP.
- no secrets or provider keys.

## AuditEvent Write-Back

Create an AuditEvent for:

- initial assessment,
- not_ready verdict,
- Task write-back batch,
- Task completion/re-arbitration,
- status transition to ready_with_caveats/ready,
- manual review escalation.

### AuditEvent Shape

```json
{
  "resourceType": "AuditEvent",
  "type": {
    "system": "http://terminology.hl7.org/CodeSystem/audit-event-type",
    "code": "rest",
    "display": "RESTful Operation"
  },
  "action": "E",
  "recorded": "2026-04-18T20:58:00Z",
  "outcome": "0",
  "agent": [
    {
      "name": "CareTransitionsCommand"
    }
  ],
  "entity": [
    {
      "what": {
        "reference": "Patient/maria-alvarez"
      },
      "role": {
        "text": "patient"
      }
    },
    {
      "what": {
        "reference": "Observation/maria-spo2-exertion"
      },
      "role": {
        "text": "evidence"
      }
    }
  ],
  "purposeOfEvent": [
    {
      "text": "Discharge readiness assessment"
    }
  ]
}
```

### Requirements

- include patient and encounter when possible.
- include evidence references.
- include verdict/status in detail or entity description if supported by implementation.
- write a new AuditEvent on re-arbitration.

## Polling-Based Re-Arbitration

### Why Polling

Do not rely on external FHIR Subscription delivery for the core demo.

Polling is deterministic:

```text
Search Task?encounter=<encounter>&_tag=ctc-generated
  → inspect statuses
  → compare against required gates
  → re-arbitrate
```

### Task Statuses

Support at least:

- `requested`
- `in-progress`
- `completed`
- `cancelled`
- `failed`

### Gate Resolution Rules

A gate is resolved when:

- associated Task is `completed`, and
- required evidence is present or completion note is adequate, and
- no contradictory later evidence re-opens the gate.

A gate remains unresolved when:

- Task is not completed,
- Task completion lacks required evidence,
- later evidence contradicts the claimed resolution.

### Re-Arbitration Output

```json
{
  "previous_status": "not_ready",
  "updated_status": "ready_with_caveats",
  "resolved_gates": [],
  "unresolved_gates": [],
  "new_evidence": [],
  "audit_event_written": "AuditEvent/...",
  "provenance_written": "Provenance/..."
}
```

## Safety Invariants

Add or enforce:

```text
no_task_without_fhir_source
no_ready_with_active_blocking_task
no_status_clearance_without_task_resolution
no_resolution_without_evidence
no_uncited_escalation
manual_review_on_uncertainty
```

## Acceptance Scenarios

### Maria

Initial:

- writes clinical/equipment/support Tasks.
- writes Provenance for each Task.
- writes AuditEvent for not_ready.

Partial resolution:

- completing equipment Task alone does not clear final status.

Full resolution:

- all required gates completed with adequate evidence.
- status becomes ready_with_caveats or configured conservative equivalent.
- new AuditEvent written.

### Daniel

Initial:

- writes medication access / clinical reassessment / home monitoring Tasks.

Partial resolution:

- medication bridge and home scale resolved.
- clinical concern still unresolved if orthopnea/weight issue remains.

### Olivia

Initial:

- no hidden risk.
- no blocking Tasks written.
- optional AuditEvent for assessment only.
