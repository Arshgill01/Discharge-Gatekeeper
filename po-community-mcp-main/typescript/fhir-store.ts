import axios from "axios";
import fs from "node:fs";
import path from "node:path";

export type FhirResourceLike = Record<string, unknown>;

type FhirBundleEntry = {
  fullUrl?: string;
  resource?: FhirResourceLike;
  request?: {
    method?: string;
    url?: string;
  };
};

type FhirTransactionBundle = {
  resourceType: "Bundle";
  type?: string;
  entry?: FhirBundleEntry[];
};

type LocalFhirStoreState = {
  metadata: {
    fhir_server: string;
    store_mode: "local_bundle";
    seeded_at: string;
    bundle_ids: string[];
  };
  resources: Record<string, FhirResourceLike>;
};

export type FhirBundleFixtureSummary = {
  bundle_id: string;
  file_path: string;
  resource_count: number;
  patient_ids: string[];
  encounter_ids: string[];
};

export type SeedFhirBundlesResult = {
  mode: "local_bundle" | "remote";
  fhir_server: string;
  store_path: string | null;
  bundle_ids: string[];
  resource_count: number;
  patient_ids: string[];
  encounter_ids: string[];
  written_references: string[];
  bundle_summaries: FhirBundleFixtureSummary[];
};

export const DEFAULT_LOCAL_FHIR_BASE_URL = "local-fhir://care-transitions-command";
export const DEFAULT_LOCAL_FHIR_STORE_PATH = path.resolve(
  __dirname,
  "..",
  ".runtime",
  "fhir",
  "store.json",
);
export const FHIR_BUNDLE_FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "fhir",
  "bundles",
);

const EMPTY_LOCAL_STORE_STATE = (): LocalFhirStoreState => ({
  metadata: {
    fhir_server: DEFAULT_LOCAL_FHIR_BASE_URL,
    store_mode: "local_bundle",
    seeded_at: new Date(0).toISOString(),
    bundle_ids: [],
  },
  resources: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, "");
};

const getResourceType = (resource: FhirResourceLike): string => {
  const resourceType = readString(resource["resourceType"]);
  if (!resourceType) {
    throw new Error("FHIR resource is missing resourceType.");
  }

  return resourceType;
};

const getResourceId = (resource: FhirResourceLike): string => {
  const resourceId = readString(resource["id"]);
  if (!resourceId) {
    throw new Error(`FHIR resource ${getResourceType(resource)} is missing id.`);
  }

  return resourceId;
};

const toReference = (resource: FhirResourceLike): string => {
  return `${getResourceType(resource)}/${getResourceId(resource)}`;
};

const ensureLocalStoreDir = (storePath: string): void => {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
};

const readJsonFile = (filePath: string): unknown => {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJsonFile = (filePath: string, value: unknown): void => {
  ensureLocalStoreDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const collectByPath = (root: unknown, dottedPath: string): unknown[] => {
  const parts = dottedPath.split(".");
  let currentValues: unknown[] = [root];

  for (const part of parts) {
    currentValues = currentValues.flatMap((value) => {
      if (Array.isArray(value)) {
        return value
          .map((entry) => (isRecord(entry) ? entry[part] : undefined))
          .filter((entry) => entry !== undefined);
      }

      if (!isRecord(value)) {
        return [];
      }

      const nextValue = value[part];
      return nextValue === undefined ? [] : [nextValue];
    });
  }

  return currentValues;
};

const collectReferenceStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectReferenceStrings(entry));
  }

  if (!isRecord(value)) {
    return [];
  }

  const reference = readString(value["reference"]);
  return reference ? [reference] : [];
};

const RESOURCE_ID_ALIASES: Record<string, string> = {
  "db4b066b-200f-405f-9fe4-c52eefbc1425": "daniel-brooks",
  "179930bf-2ad5-441b-8762-ec700b82e2ca": "maria-alvarez",
  "be404f97-dfa6-4875-b715-0ec8599b7d22": "olivia-chen",
  "27af5200-8e45-4394-9d49-e3129e7c7f25": "eleanor-singh",
  "cbd60b4b-e4af-4657-8ad7-df51cd782e69": "daniel-pharmacy-note-1815",
  "7978a116-881e-4280-871f-1c16c59dc500": "daniel-nursing-note-1840",
  "d7ebe424-afd0-46d6-957c-26bf381c1e14": "daniel-case-mgmt-note-1905",
  "9121c9d7-0a44-434a-a9cc-e7c33e77ce76": "maria-nursing-note-2040",
  "3080140a-f532-4207-b092-bb7e90bf869e": "maria-case-mgmt-2055",
  "5ce0ae41-4700-4d3e-b886-e495e4e1dac7": "olivia-nursing-note",
  "e04831dd-01ea-4064-bbdc-9eca17cd98ce": "olivia-pharmacy-note",
  "bf30ce40-178d-485a-82dc-7ecee981e87d": "eleanor-pt-addendum-1650",
  "12d4243c-90c1-4529-9a07-fc5298fedd14": "eleanor-nursing-note-1720",
  "7c643bc4-ce7d-4523-9fb7-5e7f04bc7ec2": "eleanor-case-mgmt-note-1745",
};

const RESOURCE_REFERENCE_ALIASES: Record<string, string> = {
  "Patient/db4b066b-200f-405f-9fe4-c52eefbc1425": "Patient/daniel-brooks",
  "Patient/179930bf-2ad5-441b-8762-ec700b82e2ca": "Patient/maria-alvarez",
  "Patient/be404f97-dfa6-4875-b715-0ec8599b7d22": "Patient/olivia-chen",
  "Patient/27af5200-8e45-4394-9d49-e3129e7c7f25": "Patient/eleanor-singh",
  "DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69": "DocumentReference/daniel-pharmacy-note-1815",
  "DocumentReference/7978a116-881e-4280-871f-1c16c59dc500": "DocumentReference/daniel-nursing-note-1840",
  "DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14": "DocumentReference/daniel-case-mgmt-note-1905",
  "DocumentReference/9121c9d7-0a44-434a-a9cc-e7c33e77ce76": "DocumentReference/maria-nursing-note-2040",
  "DocumentReference/3080140a-f532-4207-b092-bb7e90bf869e": "DocumentReference/maria-case-mgmt-2055",
  "DocumentReference/5ce0ae41-4700-4d3e-b886-e495e4e1dac7": "DocumentReference/olivia-nursing-note",
  "DocumentReference/e04831dd-01ea-4064-bbdc-9eca17cd98ce": "DocumentReference/olivia-pharmacy-note",
  "DocumentReference/bf30ce40-178d-485a-82dc-7ecee981e87d": "DocumentReference/eleanor-pt-addendum-1650",
  "DocumentReference/12d4243c-90c1-4529-9a07-fc5298fedd14": "DocumentReference/eleanor-nursing-note-1720",
  "DocumentReference/7c643bc4-ce7d-4523-9fb7-5e7f04bc7ec2": "DocumentReference/eleanor-case-mgmt-note-1745",
};

const expandSearchAliases = (searchValue: string): string[] => {
  const canonical = RESOURCE_ID_ALIASES[searchValue];
  return canonical ? [searchValue, canonical] : [searchValue];
};

const expandReferenceAliases = (referenceOrId: string): string[] => {
  const byReference = RESOURCE_REFERENCE_ALIASES[referenceOrId];
  if (byReference) {
    return [referenceOrId, byReference];
  }

  return expandSearchAliases(referenceOrId);
};

const referenceMatches = (candidate: string, searchValue: string): boolean => {
  return expandReferenceAliases(searchValue).some(
    (value) => candidate === value || candidate.endsWith(`/${value}`),
  );
};

const matchesResourceId = (resource: FhirResourceLike, searchValue: string): boolean => {
  return expandSearchAliases(searchValue).includes(getResourceId(resource));
};

const matchesReferencePath = (
  resource: FhirResourceLike,
  dottedPaths: string[],
  searchValue: string,
): boolean => {
  return dottedPaths.some((dottedPath) =>
    collectByPath(resource, dottedPath)
      .flatMap((value) => collectReferenceStrings(value))
      .some((candidate) => referenceMatches(candidate, searchValue)),
  );
};

const matchesStatus = (resource: FhirResourceLike, status: string): boolean => {
  return readString(resource["status"]) === status;
};

const matchesTag = (resource: FhirResourceLike, searchValue: string): boolean => {
  const meta = resource["meta"];
  if (!isRecord(meta)) {
    return false;
  }

  return asArray(meta["tag"]).some((tag) => {
    if (!isRecord(tag)) {
      return false;
    }

    const system = readString(tag["system"]);
    const code = readString(tag["code"]);
    if (!code) {
      return false;
    }

    return searchValue.includes("|")
      ? `${system ?? ""}|${code}` === searchValue
      : code === searchValue;
  });
};

const getFixtureBundlePath = (bundleId: string): string => {
  return path.join(FHIR_BUNDLE_FIXTURE_DIR, `${bundleId}.json`);
};

const parseTransactionBundle = (raw: unknown, filePath: string): FhirTransactionBundle => {
  if (!isRecord(raw) || raw["resourceType"] !== "Bundle") {
    throw new Error(`FHIR fixture ${filePath} must be a Bundle resource.`);
  }

  return raw as FhirTransactionBundle;
};

const coerceBundleEntryResource = (entry: FhirBundleEntry): FhirResourceLike => {
  if (!entry.resource || !isRecord(entry.resource)) {
    throw new Error("FHIR bundle entry is missing a resource.");
  }

  const clonedResource = JSON.parse(JSON.stringify(entry.resource)) as FhirResourceLike;
  const requestUrl = readString(entry.request?.url);
  if (!readString(clonedResource["id"]) && requestUrl?.includes("/")) {
    const idFromRequest = requestUrl.split("/")[1];
    if (idFromRequest) {
      clonedResource["id"] = idFromRequest;
    }
  }

  getResourceType(clonedResource);
  getResourceId(clonedResource);
  return clonedResource;
};

const applyBundleToState = (
  state: LocalFhirStoreState,
  bundle: FhirTransactionBundle,
): void => {
  for (const entry of bundle.entry ?? []) {
    const resource = coerceBundleEntryResource(entry);
    state.resources[toReference(resource)] = resource;
  }
};

const buildFixtureSummary = (bundleId: string, filePath: string, bundle: FhirTransactionBundle): FhirBundleFixtureSummary => {
  const resources = (bundle.entry ?? []).map((entry) => coerceBundleEntryResource(entry));
  const patientIds = resources
    .filter((resource) => getResourceType(resource) === "Patient")
    .map((resource) => getResourceId(resource));
  const encounterIds = resources
    .filter((resource) => getResourceType(resource) === "Encounter")
    .map((resource) => getResourceId(resource));

  return {
    bundle_id: bundleId,
    file_path: filePath,
    resource_count: resources.length,
    patient_ids: patientIds,
    encounter_ids: encounterIds,
  };
};

export const isLocalFhirBaseUrl = (baseUrl: string): boolean => {
  return baseUrl.startsWith("local-fhir://");
};

export const listFhirBundleFixtureIds = (): string[] => {
  if (!fs.existsSync(FHIR_BUNDLE_FIXTURE_DIR)) {
    return [];
  }

  return fs
    .readdirSync(FHIR_BUNDLE_FIXTURE_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
};

export const loadFhirBundleFixture = (
  bundleId: string,
): { filePath: string; bundle: FhirTransactionBundle; summary: FhirBundleFixtureSummary } => {
  const filePath = getFixtureBundlePath(bundleId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`FHIR bundle fixture not found: ${filePath}`);
  }

  const bundle = parseTransactionBundle(readJsonFile(filePath), filePath);
  return {
    filePath,
    bundle,
    summary: buildFixtureSummary(bundleId, filePath, bundle),
  };
};

export const loadLocalFhirStoreState = (
  storePath: string = DEFAULT_LOCAL_FHIR_STORE_PATH,
): LocalFhirStoreState => {
  if (!fs.existsSync(storePath)) {
    return EMPTY_LOCAL_STORE_STATE();
  }

  const raw = readJsonFile(storePath);
  if (!isRecord(raw) || !isRecord(raw["metadata"]) || !isRecord(raw["resources"])) {
    throw new Error(`Local FHIR store file is malformed: ${storePath}`);
  }

  return raw as LocalFhirStoreState;
};

export const saveLocalFhirStoreState = (
  state: LocalFhirStoreState,
  storePath: string = DEFAULT_LOCAL_FHIR_STORE_PATH,
): void => {
  writeJsonFile(storePath, state);
};

export const readLocalFhirResource = (
  referenceOrPath: string,
  storePath: string = DEFAULT_LOCAL_FHIR_STORE_PATH,
): FhirResourceLike | null => {
  const state = loadLocalFhirStoreState(storePath);
  const normalizedReference = referenceOrPath.replace(/^\/+/, "");
  const directHit = state.resources[normalizedReference];
  if (directHit) {
    return JSON.parse(JSON.stringify(directHit)) as FhirResourceLike;
  }

  const aliasedReference = RESOURCE_REFERENCE_ALIASES[normalizedReference];
  if (!aliasedReference) {
    return null;
  }

  const aliasedHit = state.resources[aliasedReference];
  return aliasedHit ? JSON.parse(JSON.stringify(aliasedHit)) as FhirResourceLike : null;
};

export const searchLocalFhirResources = (
  resourceType: string,
  searchParameters: string[],
  storePath: string = DEFAULT_LOCAL_FHIR_STORE_PATH,
): FhirTransactionBundle => {
  const state = loadLocalFhirStoreState(storePath);
  const params = new URLSearchParams(searchParameters.join("&"));
  const searchPatient = params.get("patient");
  const searchSubject = params.get("subject");
  const searchEncounter = params.get("encounter");
  const searchFor = params.get("for");
  const searchStatus = params.get("status");
  const searchTag = params.get("_tag");
  const searchId = params.get("_id");
  const requestedCount = Number.parseInt(params.get("_count") ?? "50", 10);
  const count = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 50;

  const matchingResources = Object.values(state.resources).filter((resource) => {
    if (getResourceType(resource) !== resourceType) {
      return false;
    }

    if (searchId && !matchesResourceId(resource, searchId)) {
      return false;
    }

    if (searchPatient) {
      const patientMatch =
        (resourceType === "Patient" && matchesResourceId(resource, searchPatient)) ||
        matchesReferencePath(resource, ["subject", "patient", "for", "beneficiary"], searchPatient);
      if (!patientMatch) {
        return false;
      }
    }

    if (searchSubject && !matchesReferencePath(resource, ["subject"], searchSubject)) {
      return false;
    }

    if (searchEncounter && !matchesReferencePath(resource, ["encounter", "context.encounter"], searchEncounter)) {
      return false;
    }

    if (searchFor && !matchesReferencePath(resource, ["for"], searchFor)) {
      return false;
    }

    if (searchStatus && !matchesStatus(resource, searchStatus)) {
      return false;
    }

    if (searchTag && !matchesTag(resource, searchTag)) {
      return false;
    }

    return true;
  });

  return {
    resourceType: "Bundle",
    type: "searchset",
    entry: matchingResources.slice(0, count).map((resource) => ({
      fullUrl: `${state.metadata.fhir_server}/${toReference(resource)}`,
      resource: JSON.parse(JSON.stringify(resource)) as FhirResourceLike,
    })),
  };
};

export const writeLocalFhirResource = (
  resource: FhirResourceLike,
  options?: {
    storePath?: string;
    fhirServer?: string;
  },
): FhirResourceLike => {
  const storePath = options?.storePath ?? DEFAULT_LOCAL_FHIR_STORE_PATH;
  const state = loadLocalFhirStoreState(storePath);
  const clonedResource = JSON.parse(JSON.stringify(resource)) as FhirResourceLike;
  const reference = toReference(clonedResource);
  state.resources[reference] = clonedResource;
  state.metadata.fhir_server = options?.fhirServer ?? state.metadata.fhir_server;
  saveLocalFhirStoreState(state, storePath);
  return clonedResource;
};

export const readFhirResource = async (
  fhirServer: string,
  referenceOrPath: string,
  options?: {
    storePath?: string;
    accessToken?: string;
  },
): Promise<FhirResourceLike | null> => {
  if (isLocalFhirBaseUrl(fhirServer)) {
    return readLocalFhirResource(referenceOrPath, options?.storePath);
  }

  try {
    const response = await axios.get(`${normalizeBaseUrl(fhirServer)}/${referenceOrPath.replace(/^\/+/, "")}`, {
      headers: {
        accept: "application/fhir+json, application/json",
        ...(options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
    });
    return response.data as FhirResourceLike;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const searchFhirResources = async (
  fhirServer: string,
  resourceType: string,
  searchParameters: string[],
  options?: {
    storePath?: string;
    accessToken?: string;
  },
): Promise<FhirTransactionBundle> => {
  if (isLocalFhirBaseUrl(fhirServer)) {
    return searchLocalFhirResources(resourceType, searchParameters, options?.storePath);
  }

  const response = await axios.get(
    `${normalizeBaseUrl(fhirServer)}/${resourceType}?${searchParameters.join("&")}`,
    {
      headers: {
        accept: "application/fhir+json, application/json",
        ...(options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
    },
  );
  return response.data as FhirTransactionBundle;
};

export const upsertFhirResource = async (
  fhirServer: string,
  resource: FhirResourceLike,
  options?: {
    storePath?: string;
    accessToken?: string;
  },
): Promise<FhirResourceLike> => {
  if (isLocalFhirBaseUrl(fhirServer)) {
    return writeLocalFhirResource(resource, {
      storePath: options?.storePath,
      fhirServer,
    });
  }

  const resourceType = getResourceType(resource);
  const resourceId = getResourceId(resource);
  const response = await axios.put(
    `${normalizeBaseUrl(fhirServer)}/${resourceType}/${resourceId}`,
    resource,
    {
      headers: {
        "content-type": "application/fhir+json",
        accept: "application/fhir+json, application/json",
        ...(options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
    },
  );
  return response.data as FhirResourceLike;
};

export const createFhirResource = async (
  fhirServer: string,
  resource: FhirResourceLike,
  options?: {
    storePath?: string;
    accessToken?: string;
  },
): Promise<FhirResourceLike> => {
  if (isLocalFhirBaseUrl(fhirServer)) {
    return writeLocalFhirResource(resource, {
      storePath: options?.storePath,
      fhirServer,
    });
  }

  const resourceType = getResourceType(resource);
  const response = await axios.post(
    `${normalizeBaseUrl(fhirServer)}/${resourceType}`,
    resource,
    {
      headers: {
        "content-type": "application/fhir+json",
        accept: "application/fhir+json, application/json",
        ...(options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
    },
  );
  return response.data as FhirResourceLike;
};

export const seedRemoteFhirBundle = async (
  fhirServer: string,
  bundle: FhirTransactionBundle,
): Promise<void> => {
  await axios.post(normalizeBaseUrl(fhirServer), bundle, {
    headers: {
      "content-type": "application/fhir+json",
      accept: "application/fhir+json, application/json",
    },
  });
};

export const seedFhirBundles = async (
  options: {
    bundleIds?: string[];
    fhirServer?: string | null;
    storePath?: string;
  } = {},
): Promise<SeedFhirBundlesResult> => {
  const bundleIds = options.bundleIds && options.bundleIds.length > 0
    ? [...options.bundleIds]
    : listFhirBundleFixtureIds();
  if (bundleIds.length === 0) {
    throw new Error(`No FHIR bundle fixtures found in ${FHIR_BUNDLE_FIXTURE_DIR}.`);
  }

  const fhirServer = options.fhirServer?.trim() || DEFAULT_LOCAL_FHIR_BASE_URL;
  const bundleSummaries = bundleIds.map((bundleId) => loadFhirBundleFixture(bundleId));
  const allPatientIds = [...new Set(bundleSummaries.flatMap((entry) => entry.summary.patient_ids))];
  const allEncounterIds = [...new Set(bundleSummaries.flatMap((entry) => entry.summary.encounter_ids))];

  if (isLocalFhirBaseUrl(fhirServer)) {
    const state = EMPTY_LOCAL_STORE_STATE();
    state.metadata.fhir_server = fhirServer;
    state.metadata.seeded_at = new Date().toISOString();
    state.metadata.bundle_ids = bundleIds;

    for (const entry of bundleSummaries) {
      applyBundleToState(state, entry.bundle);
    }

    const storePath = options.storePath ?? DEFAULT_LOCAL_FHIR_STORE_PATH;
    saveLocalFhirStoreState(state, storePath);
    return {
      mode: "local_bundle",
      fhir_server: fhirServer,
      store_path: storePath,
      bundle_ids: bundleIds,
      resource_count: Object.keys(state.resources).length,
      patient_ids: allPatientIds,
      encounter_ids: allEncounterIds,
      written_references: Object.keys(state.resources).sort(),
      bundle_summaries: bundleSummaries.map((entry) => entry.summary),
    };
  }

  for (const entry of bundleSummaries) {
    await seedRemoteFhirBundle(fhirServer, entry.bundle);
  }

  return {
    mode: "remote",
    fhir_server: fhirServer,
    store_path: null,
    bundle_ids: bundleIds,
    resource_count: bundleSummaries.reduce((count, entry) => count + entry.summary.resource_count, 0),
    patient_ids: allPatientIds,
    encounter_ids: allEncounterIds,
    written_references: [],
    bundle_summaries: bundleSummaries.map((entry) => entry.summary),
  };
};
