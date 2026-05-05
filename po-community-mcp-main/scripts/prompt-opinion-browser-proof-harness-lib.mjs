const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];

const normalizeVariantToken = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

export const selectA2AVariants = (variants, selector = "all") => {
  const rawTokens = String(selector || "all")
    .split(",")
    .map(normalizeVariantToken)
    .filter(Boolean);
  const tokens = rawTokens.length ? rawTokens : ["all"];

  if (tokens.includes("all")) {
    return variants;
  }

  const selected = [];
  const unknown = [];
  for (const token of tokens) {
    const match = variants.find((variant) => {
      const id = normalizeVariantToken(variant.id);
      const attemptId = normalizeVariantToken(variant.attemptId);
      const aliases = new Set([id, `v${id}`, `variant${id}`, attemptId]);
      return aliases.has(token);
    });
    if (match && !selected.some((variant) => variant.attemptId === match.attemptId)) {
      selected.push(match);
    } else if (!match) {
      unknown.push(token);
    }
  }

  if (unknown.length) {
    const supported = variants.map((variant) => `v${String(variant.id).toLowerCase()}`).join(", ");
    throw new Error(`Unsupported PROMPT_OPINION_A2A_VARIANTS value(s): ${unknown.join(", ")}. Supported: all, ${supported}`);
  }

  return selected;
};

const extractBalancedJsonAt = (text, openBraceIndex) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBraceIndex, index + 1);
      }
    }
  }

  return null;
};

const extractArtifactMessages = (text) => {
  const source = String(text || "");
  const artifacts = [];
  const label = "ARTIFACT_MESSAGES:";
  let searchIndex = 0;

  while (searchIndex < source.length) {
    const labelIndex = source.indexOf(label, searchIndex);
    if (labelIndex === -1) {
      break;
    }
    const openBraceIndex = source.indexOf("{", labelIndex + label.length);
    if (openBraceIndex === -1) {
      break;
    }
    const jsonText = extractBalancedJsonAt(source, openBraceIndex);
    if (!jsonText) {
      searchIndex = openBraceIndex + 1;
      continue;
    }
    try {
      artifacts.push(JSON.parse(jsonText));
    } catch {
      // Ignore malformed visible artifacts; screenshots can contain truncated text.
    }
    searchIndex = openBraceIndex + jsonText.length;
  }

  return artifacts;
};

export const extractVisibleArtifactMessages = (textSources) =>
  (Array.isArray(textSources) ? textSources : [textSources]).flatMap((text) => extractArtifactMessages(text));

export const extractVisibleRuntimeDiagnostics = (textSources) =>
  extractVisibleArtifactMessages(textSources)
    .map((artifact) => artifact?.runtime_diagnostics)
    .filter(Boolean)
    .filter((diagnostics) => diagnostics.request_id && diagnostics.task_id);

export const summarizeVisibleA2AClinicalPayload = (textSources) => {
  const artifact = extractVisibleArtifactMessages(textSources).at(-1) || null;
  if (!artifact) {
    return {
      found: false,
      final_verdict: null,
      hidden_risk_result: null,
      hidden_risk_run_status: null,
      hidden_risk_citation_count: 0,
      clinical_green_criteria_passed: false,
    };
  }

  const hiddenRiskCitationCount =
    (Array.isArray(artifact.citations?.hidden_risk) ? artifact.citations.hidden_risk.length : 0) +
    (Array.isArray(artifact.hidden_risk?.citations) ? artifact.hidden_risk.citations.length : 0) +
    (Array.isArray(artifact.prompt_payload?.evidence_anchors) ? artifact.prompt_payload.evidence_anchors.length : 0);
  const finalVerdict = artifact.final_verdict || artifact.prompt_payload?.final_verdict || null;
  const hiddenRiskResult = artifact.hidden_risk_result || artifact.hidden_risk?.hidden_risk_summary?.result || null;
  const hiddenRiskRunStatus = artifact.hidden_risk_run_status || artifact.hidden_risk?.status || null;

  return {
    found: true,
    final_verdict: finalVerdict,
    hidden_risk_result: hiddenRiskResult,
    hidden_risk_run_status: hiddenRiskRunStatus,
    hidden_risk_citation_count: hiddenRiskCitationCount,
    clinical_green_criteria_passed:
      finalVerdict === "not_ready" &&
      hiddenRiskResult === "hidden_risk_present" &&
      hiddenRiskCitationCount > 0,
  };
};

const downstreamComponents = (diagnostics) => [
  ...(diagnostics.downstream_correlation || []).map((entry) => entry.component),
  ...(diagnostics.downstream_calls || []).map((entry) => entry.component),
];

const callRequestIds = (diagnostics, component) =>
  (diagnostics.downstream_calls || [])
    .filter((entry) => entry.component === component)
    .map((entry) => entry.request_id || entry.propagated_request_id);

const summarizeDiagnostics = (diagnosticsList) => {
  const components = diagnosticsList.flatMap(downstreamComponents);
  const hasDgk = components.includes("discharge_gatekeeper_mcp");
  const hasCi = components.includes("clinical_intelligence_mcp");
  const requestPaths = diagnosticsList.map(
    (diagnostics) => diagnostics.incoming_request_path || diagnostics.incoming_request?.request_path,
  );

  return {
    runtime_evidence_sources: ["runtime_diagnostics_visible_fallback"],
    a2a_route_evidence_source: "runtime_diagnostics_visible_fallback",
    visible_runtime_diagnostics_count: diagnosticsList.length,
    a2a_request_count: diagnosticsList.length,
    a2a_response_count: diagnosticsList.length,
    a2a_2xx_response_count: diagnosticsList.length,
    a2a_task_started_count: diagnosticsList.length,
    a2a_task_finished_count: diagnosticsList.filter((diagnostics) => diagnostics.execution_finished_at).length,
    a2a_paths: unique(requestPaths),
    a2a_response_paths: unique(requestPaths),
    a2a_status_codes: diagnosticsList.length ? [200] : [],
    a2a_request_ids: unique(diagnosticsList.map((diagnostics) => diagnostics.request_id)),
    a2a_task_ids: unique(diagnosticsList.map((diagnostics) => diagnostics.task_id)),
    a2a_correlation_ids: unique(
      diagnosticsList.map((diagnostics) => diagnostics.incoming_request?.correlation_id || diagnostics.correlation_id),
    ),
    discharge_gatekeeper_mcp_request_count: hasDgk ? 1 : 0,
    clinical_intelligence_mcp_request_count: hasCi ? 1 : 0,
    both_mcps_hit: hasDgk && hasCi,
    discharge_gatekeeper_request_ids: unique(
      diagnosticsList.flatMap((diagnostics) => callRequestIds(diagnostics, "discharge_gatekeeper_mcp")),
    ),
    clinical_intelligence_request_ids: unique(
      diagnosticsList.flatMap((diagnostics) => callRequestIds(diagnostics, "clinical_intelligence_mcp")),
    ),
  };
};

export const summarizeVisibleRuntimeDiagnostics = (textSources) => {
  const diagnostics = extractVisibleRuntimeDiagnostics(Array.isArray(textSources) ? textSources : [textSources]);
  if (!diagnostics.length) {
    return null;
  }

  return summarizeDiagnostics([diagnostics.at(-1)]);
};

export const mergeRuntimeSummaryWithVisibleFallback = (runtimeSummary, textSources) => {
  const hasLocalA2aHit = runtimeSummary.a2a_request_count > 0 || runtimeSummary.a2a_task_started_count > 0;
  if (hasLocalA2aHit) {
    return {
      ...runtimeSummary,
      runtime_evidence_sources: unique([...(runtimeSummary.runtime_evidence_sources || []), "runtime_log_delta"]),
      a2a_route_evidence_source: runtimeSummary.a2a_route_evidence_source || "runtime_log_delta",
    };
  }

  const fallback = summarizeVisibleRuntimeDiagnostics(textSources);
  if (!fallback) {
    return {
      ...runtimeSummary,
      runtime_evidence_sources: runtimeSummary.runtime_evidence_sources || [],
      a2a_route_evidence_source: runtimeSummary.a2a_route_evidence_source || null,
    };
  }

  return {
    ...runtimeSummary,
    ...fallback,
  };
};
