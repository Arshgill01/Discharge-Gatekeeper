# Scenario Evidence Table

Generated source artifact: `output/eval/latest/scenario-pack-results.json`

| Scenario | Structured baseline | Narrative result | Final status | What it proves |
| --- | --- | --- | --- | --- |
| Maria trap patient | `ready` | `hidden_risk_present` | `not_ready` | Structured ready can become not_ready when late nursing and case-management notes expose transition blockers. |
| Maria ablation control | `ready` | `no_hidden_risk` | `ready` | Removing contradiction notes prevents escalation. |
| Clean no-risk control | `ready` | `no_hidden_risk` | `ready` | Reassuring narrative evidence does not fabricate hidden risk. |
| Duplicate-signal control | `ready_with_caveats` | `no_hidden_risk` | `ready_with_caveats` | Narrative signals already present in deterministic blockers are suppressed instead of double-counted. |
| Inconclusive missing narrative | `ready` | `inconclusive` | `ready_with_caveats` | Missing narrative evidence requires manual review/caveat without fabricated escalation. |
| Alternative home-support hidden risk | `ready` | `hidden_risk_present` | `not_ready` | A non-oxygen social support contradiction can still change transition status. |
| Medication access hidden risk | `ready` | `hidden_risk_present` | `not_ready` | The detector is not hardcoded to oxygen/stairs; blocked anticoagulation access can stop discharge. |

## Evidence Anchors

| Scenario | Evidence anchors | Blocker categories |
| --- | --- | --- |
| Maria trap patient | Nursing Note 2026-04-18 20:40; Hospitalist Progress Note 2026-04-18 08:10; Case Management Addendum 2026-04-18 20:55 | `clinical_stability`; `equipment_and_transport`; `home_support_and_services` |
| Alternative home-support hidden risk | Case Management Escalation Note 2026-04-18 21:05 | `home_support_and_services` |
| Medication access hidden risk | Pharmacy Addendum 2026-04-18 21:10 | `medication_reconciliation` |

