/**
 * Exact-input hidden-risk result cache for the external A2A orchestrator.
 *
 * This cache sits at the orchestrator boundary, not inside Clinical Intelligence.
 * It stores the exact HiddenRiskResponse returned by the CI MCP for a given
 * deterministic+narrative input combination so that repeated identical requests
 * (e.g. Prompt Opinion browser proof after warm-up) skip the expensive
 * Google/Gemma inference call without changing the clinical result.
 *
 * Quality constraints:
 * - Cache key includes all inputs that could affect the hidden-risk result.
 * - Cache is NOT used for error/insufficient_context/inconclusive results.
 * - Cache is NOT used if the canonical trap patient result is missing anchors.
 * - Cache entries are timestamped and TTL-bounded.
 */

import { createHash } from "node:crypto";
import { A2ATaskInput, DeterministicResponse, HiddenRiskResponse } from "./types";

export type HiddenRiskCacheConfig = {
  enabled: boolean;
  ttlMs: number;
  maxEntries: number;
  /** If true, cache is populated but never served (warm-only mode). */
  warmOnly: boolean;
};

export type HiddenRiskCacheEntry = {
  result: HiddenRiskResponse;
  timestamp: number;
  provider: string;
  model: string | null;
  narrativeSourceCount: number;
  hiddenRiskResult: string;
  evidenceAnchorCheck: {
    hasNursingNote20260418: boolean;
    hasCaseManagementAddendum20260418: boolean;
  };
  cacheKeyHash: string;
};

export type HiddenRiskCacheDiagnostics = {
  cache_enabled: boolean;
  cache_warm_only: boolean;
  cache_status: "hit" | "miss" | "disabled" | "warm_only_miss" | "rejected_error" | "rejected_no_anchors" | "rejected_no_hidden_risk" | "expired";
  cache_key_hash: string | null;
  cache_entry_count: number;
  cache_entry_age_ms: number | null;
  computed: boolean;
};

const CACHEABLE_STATUSES = new Set<HiddenRiskResponse["status"]>(["ok"]);

const CANONICAL_TRAP_ANCHORS = {
  nursingNote: "Nursing Note 2026-04-18 20:40",
  caseManagement: "Case Management Addendum 2026-04-18 20:55",
};

/**
 * Build a stable cache key from the inputs that determine the hidden-risk result.
 */
export const buildCacheKey = (
  deterministic: DeterministicResponse,
  taskInput: A2ATaskInput,
  ciMcpUrl: string,
  provider: string,
  model: string | null,
): string => {
  const keyMaterial = {
    // Patient identity
    patientId: taskInput.patient_context?.patient_id ?? null,
    encounterId: taskInput.patient_context?.encounter_id ?? null,
    scenarioId: taskInput.patient_context?.scenario_id ?? null,

    // Deterministic baseline (affects CI prompt)
    baselineVerdict: deterministic.verdict,
    blockerIds: deterministic.blockers.map((b) => b.id).sort(),
    blockerCategories: deterministic.blockers.map((b) => b.category).sort(),
    evidenceIds: deterministic.evidence.map((e) => e.id).sort(),

    // Narrative bundle (the core input to CI)
    narrativeSources: (taskInput.patient_context?.narrative_evidence_bundle ?? []).map((n) => ({
      source_id: n.source_id,
      source_type: n.source_type,
      excerpt_hash: createHash("sha256").update(n.excerpt).digest("hex").slice(0, 16),
    })),

    // CI endpoint + provider + model
    ciMcpUrl,
    provider,
    model,

    // Tool contract
    toolName: "surface_hidden_risks",
    responseMode: "full",

    // Context metadata that may affect reasoning
    careSetting: taskInput.patient_context?.optional_context_metadata?.care_setting ?? null,
    dischargeDestination: taskInput.patient_context?.optional_context_metadata?.discharge_destination ?? null,
    explicitTaskGoal: taskInput.patient_context?.optional_context_metadata?.explicit_task_goal ?? null,
  };

  const canonical = JSON.stringify(keyMaterial, Object.keys(keyMaterial).sort());
  return createHash("sha256").update(canonical).digest("hex");
};

/**
 * Check whether a hidden-risk result contains the canonical trap patient anchors.
 */
const checkEvidenceAnchors = (result: HiddenRiskResponse): HiddenRiskCacheEntry["evidenceAnchorCheck"] => {
  const allText = JSON.stringify(result);
  return {
    hasNursingNote20260418: allText.includes(CANONICAL_TRAP_ANCHORS.nursingNote),
    hasCaseManagementAddendum20260418: allText.includes(CANONICAL_TRAP_ANCHORS.caseManagement),
  };
};

/**
 * Determine whether a CI result is safe to cache.
 */
const isCacheable = (result: HiddenRiskResponse): boolean => {
  if (!CACHEABLE_STATUSES.has(result.status)) {
    return false;
  }
  if (result.hidden_risk_summary.result !== "hidden_risk_present") {
    return false;
  }
  const anchors = checkEvidenceAnchors(result);
  if (!anchors.hasNursingNote20260418 || !anchors.hasCaseManagementAddendum20260418) {
    return false;
  }
  return true;
};

export class HiddenRiskCache {
  private readonly store = new Map<string, HiddenRiskCacheEntry>();
  private readonly config: HiddenRiskCacheConfig;

  constructor(config: HiddenRiskCacheConfig) {
    this.config = config;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get warmOnly(): boolean {
    return this.config.warmOnly;
  }

  get size(): number {
    return this.store.size;
  }

  /**
   * Try to retrieve a cached result. Returns null on miss.
   */
  get(keyHash: string): HiddenRiskCacheEntry | null {
    if (!this.config.enabled) {
      return null;
    }
    if (this.config.warmOnly) {
      return null;
    }

    const entry = this.store.get(keyHash);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.config.ttlMs) {
      this.store.delete(keyHash);
      return null;
    }

    return entry;
  }

  /**
   * Store a hidden-risk result if it meets cacheability criteria.
   * Returns true if stored, false if rejected.
   */
  set(
    keyHash: string,
    result: HiddenRiskResponse,
    provider: string,
    model: string | null,
    narrativeSourceCount: number,
  ): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (!isCacheable(result)) {
      return false;
    }

    // Evict oldest if at capacity
    if (this.store.size >= this.config.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTs = Infinity;
      for (const [key, entry] of this.store.entries()) {
        if (entry.timestamp < oldestTs) {
          oldestTs = entry.timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(keyHash, {
      result,
      timestamp: Date.now(),
      provider,
      model,
      narrativeSourceCount,
      hiddenRiskResult: result.hidden_risk_summary.result,
      evidenceAnchorCheck: checkEvidenceAnchors(result),
      cacheKeyHash: keyHash,
    });

    return true;
  }

  /**
   * Build diagnostics for the current cache state for a given key.
   */
  buildDiagnostics(
    keyHash: string | null,
    status: HiddenRiskCacheDiagnostics["cache_status"],
    computed: boolean,
  ): HiddenRiskCacheDiagnostics {
    const entry = keyHash ? this.store.get(keyHash) : null;
    return {
      cache_enabled: this.config.enabled,
      cache_warm_only: this.config.warmOnly,
      cache_status: status,
      cache_key_hash: keyHash,
      cache_entry_count: this.store.size,
      cache_entry_age_ms: entry ? Date.now() - entry.timestamp : null,
      computed,
    };
  }

  /**
   * Summary for /readyz or health endpoints.
   */
  toHealthSummary(): Record<string, unknown> {
    return {
      enabled: this.config.enabled,
      warm_only: this.config.warmOnly,
      entry_count: this.store.size,
      max_entries: this.config.maxEntries,
      ttl_ms: this.config.ttlMs,
    };
  }
}

export const parseHiddenRiskCacheConfig = (
  env: Record<string, string | undefined>,
): HiddenRiskCacheConfig => {
  const enabled = env["A2A_HIDDEN_RISK_CACHE_ENABLED"] !== "false";
  const ttlMs = parseInt(env["A2A_HIDDEN_RISK_CACHE_TTL_MS"] ?? "3600000", 10);
  const maxEntries = parseInt(env["A2A_HIDDEN_RISK_CACHE_MAX_ENTRIES"] ?? "32", 10);
  const warmOnly = env["A2A_HIDDEN_RISK_CACHE_WARM_ONLY"] === "true";

  return {
    enabled: Number.isFinite(ttlMs) && ttlMs > 0 ? enabled : false,
    ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 3600000,
    maxEntries: Number.isFinite(maxEntries) && maxEntries > 0 ? maxEntries : 32,
    warmOnly,
  };
};
