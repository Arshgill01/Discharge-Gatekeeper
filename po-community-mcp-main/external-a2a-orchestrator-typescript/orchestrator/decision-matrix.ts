import {
  CanonicalVerdict,
  DispositionImpact,
  HiddenRiskResult,
} from "../types";

export type DecisionMatrixOutput = {
  row: number;
  finalVerdict: CanonicalVerdict;
  manualReviewRequired: boolean;
  action: string;
};

const ensureKnownImpact = (impact: DispositionImpact): DispositionImpact => {
  return impact;
};

export const applyDecisionMatrix = (
  structuredVerdict: CanonicalVerdict,
  hiddenRiskResult: HiddenRiskResult,
  hiddenRiskImpact: DispositionImpact,
): DecisionMatrixOutput => {
  const impact = ensureKnownImpact(hiddenRiskImpact);

  if (structuredVerdict === "ready" && hiddenRiskResult === "no_hidden_risk" && impact === "none") {
    return {
      row: 1,
      finalVerdict: "ready",
      manualReviewRequired: false,
      action: "preserve deterministic output",
    };
  }

  if (structuredVerdict === "ready" && hiddenRiskResult === "hidden_risk_present" && impact === "caveat") {
    return {
      row: 2,
      finalVerdict: "ready_with_caveats",
      manualReviewRequired: false,
      action: "add cited hidden-risk caveat and keep deterministic blockers intact",
    };
  }

  if (structuredVerdict === "ready" && hiddenRiskResult === "hidden_risk_present" && impact === "not_ready") {
    return {
      row: 3,
      finalVerdict: "not_ready",
      manualReviewRequired: false,
      action: "add cited hidden-risk blocker and escalate disposition",
    };
  }

  if (structuredVerdict === "ready_with_caveats" && hiddenRiskResult === "no_hidden_risk" && impact === "none") {
    return {
      row: 4,
      finalVerdict: "ready_with_caveats",
      manualReviewRequired: false,
      action: "preserve deterministic caveats",
    };
  }

  if (structuredVerdict === "ready_with_caveats" && hiddenRiskResult === "hidden_risk_present" && impact === "caveat") {
    return {
      row: 5,
      finalVerdict: "ready_with_caveats",
      manualReviewRequired: false,
      action: "append hidden-risk finding without downgrading below caveat state",
    };
  }

  if (structuredVerdict === "ready_with_caveats" && hiddenRiskResult === "hidden_risk_present" && impact === "not_ready") {
    return {
      row: 6,
      finalVerdict: "not_ready",
      manualReviewRequired: false,
      action: "escalate from caveat to blocker state",
    };
  }

  if (structuredVerdict === "not_ready" && hiddenRiskResult === "no_hidden_risk" && impact === "none") {
    return {
      row: 7,
      finalVerdict: "not_ready",
      manualReviewRequired: false,
      action: "preserve deterministic blocker state",
    };
  }

  if (structuredVerdict === "not_ready" && hiddenRiskResult === "hidden_risk_present" && impact === "caveat") {
    return {
      row: 8,
      finalVerdict: "not_ready",
      manualReviewRequired: false,
      action: "keep not_ready and add hidden-risk context if non-duplicate",
    };
  }

  if (structuredVerdict === "not_ready" && hiddenRiskResult === "hidden_risk_present" && impact === "not_ready") {
    return {
      row: 9,
      finalVerdict: "not_ready",
      manualReviewRequired: false,
      action: "keep not_ready and append hidden-risk blocker evidence",
    };
  }

  if (structuredVerdict === "ready" && hiddenRiskResult === "inconclusive" && impact === "uncertain") {
    return {
      row: 10,
      finalVerdict: "ready_with_caveats",
      manualReviewRequired: true,
      action: "downgrade one level because unresolved hidden-risk ambiguity cannot remain ready",
    };
  }

  if (structuredVerdict === "ready_with_caveats" && hiddenRiskResult === "inconclusive" && impact === "uncertain") {
    return {
      row: 11,
      finalVerdict: "ready_with_caveats",
      manualReviewRequired: true,
      action: "preserve caveat state and attach manual review",
    };
  }

  if (structuredVerdict === "not_ready" && hiddenRiskResult === "inconclusive" && impact === "uncertain") {
    return {
      row: 12,
      finalVerdict: "not_ready",
      manualReviewRequired: true,
      action: "preserve blocker state and attach manual review",
    };
  }

  throw new Error(
    `Unsupported decision-matrix combination: structured=${structuredVerdict}, hiddenRiskResult=${hiddenRiskResult}, hiddenRiskImpact=${hiddenRiskImpact}`,
  );
};
