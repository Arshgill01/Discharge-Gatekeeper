import { ReadinessInput } from "./contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "./scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "./scenario-v2";
import {
  SCENARIO_V1_TRUTH,
  SCENARIO_V2_TRUTH,
  ScenarioTruth,
} from "./scenario-truth";

export type SuccessRegressionCase = {
  id: string;
  description: string;
  input: ReadinessInput;
  expected: ScenarioTruth;
};

export type FailureRegressionCase = {
  id: string;
  description: string;
  input: unknown;
  expected_error: string;
};

export const READINESS_REGRESSION_SUCCESS_CASES: SuccessRegressionCase[] = [
  {
    id: "scenario-v1-primary-not-ready",
    description:
      "Primary demo scenario remains not_ready with high-priority blockers and canonical category coverage.",
    input: FIRST_SYNTHETIC_SCENARIO_V1,
    expected: SCENARIO_V1_TRUTH,
  },
  {
    id: "scenario-v2-caveat-separation",
    description:
      "Second scenario proves medium-priority caveats can produce ready_with_caveats without high-priority blockers.",
    input: SECOND_SYNTHETIC_SCENARIO_V1,
    expected: SCENARIO_V2_TRUTH,
  },
];

export const READINESS_REGRESSION_FAILURE_CASES: FailureRegressionCase[] = [
  {
    id: "failure-missing-patient-context",
    description: "Missing patient context must fail explicitly instead of fabricating a verdict.",
    input: undefined,
    expected_error: "Missing patient context",
  },
  {
    id: "failure-insufficient-evidence",
    description: "Insufficient evidence must fail explicitly.",
    input: {
      ...SECOND_SYNTHETIC_SCENARIO_V1,
      scenario_id: "failure_insufficient_evidence_v1",
      evidence_catalog: [],
    },
    expected_error: "Insufficient evidence",
  },
  {
    id: "failure-contradictory-evidence",
    description:
      "Contradictory evidence flags must be surfaced explicitly before scoring readiness.",
    input: {
      ...SECOND_SYNTHETIC_SCENARIO_V1,
      scenario_id: "failure_contradictory_evidence_v1",
      source_consistency: {
        contradictory_evidence: [
          "Structured discharge checklist says documentation complete while case-management note says key sign-offs are still pending.",
        ],
      },
    },
    expected_error: "Contradictory evidence",
  },
  {
    id: "failure-malformed-input-surface",
    description: "Malformed or incomplete input surface should fail with a clear contract error.",
    input: {
      scenario_id: "failure_malformed_input_v1",
      evidence_catalog: [],
    },
    expected_error: "Malformed readiness input",
  },
];
