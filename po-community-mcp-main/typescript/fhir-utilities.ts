import { Request } from "express";
import { FhirContext } from "./fhir-context";
import * as jose from "jose";
import { McpConstants } from "./mcp-constants";
import { DEFAULT_LOCAL_FHIR_BASE_URL } from "./fhir-store";

const LOCAL_PROMPT_OPINION_FIXTURE_PATIENT_IDS = new Set([
  "db4b066b-200f-405f-9fe4-c52eefbc1425",
  "179930bf-2ad5-441b-8762-ec700b82e2ca",
  "be404f97-dfa6-4875-b715-0ec8599b7d22",
  "27af5200-8e45-4394-9d49-e3129e7c7f25",
]);

const getPatientIdFromRequest = (req: Request): string | null => {
  const fhirToken =
    req.headers[McpConstants.FhirAccessTokenHeaderName]?.toString();

  if (fhirToken) {
    try {
      const claims = jose.decodeJwt(fhirToken);
      if (claims["patient"]) {
        return claims["patient"]?.toString() || null;
      }
    } catch (error) {
      console.warn("Unable to decode FHIR access token; falling back to x-patient-id header.", error);
    }
  }

  return req.headers[McpConstants.PatientIdHeaderName]?.toString() || null;
};

const shouldUseLocalFixtureStore = (url: string, patientId: string | null): boolean => {
  if (!patientId || !LOCAL_PROMPT_OPINION_FIXTURE_PATIENT_IDS.has(patientId)) {
    return false;
  }

  return /app\.promptopinion\.ai\/api\/workspaces\/.+\/fhir/i.test(url);
};

const getRawFhirContext = (req: Request): FhirContext | null => {
  const headers = req.headers;
  const url = headers[McpConstants.FhirServerUrlHeaderName]?.toString();
  if (!url) {
    return null;
  }

  const token = headers[McpConstants.FhirAccessTokenHeaderName]?.toString();
  return { url, token };
};

export const FhirUtilities = {
  getFhirContext: (req: Request): FhirContext | null => {
    const rawContext = getRawFhirContext(req);
    if (!rawContext) {
      return null;
    }

    const patientId = getPatientIdFromRequest(req);
    if (shouldUseLocalFixtureStore(rawContext.url, patientId)) {
      return {
        url: DEFAULT_LOCAL_FHIR_BASE_URL,
        token: rawContext.token,
        remoteUrl: rawContext.url,
      };
    }

    return rawContext;
  },
  getOriginalFhirContext: (req: Request): FhirContext | null => getRawFhirContext(req),
  getPatientIdIfContextExists: (req: Request) => getPatientIdFromRequest(req),
  getEncounterIdIfContextExists: (req: Request) => {
    return req.headers[McpConstants.EncounterIdHeaderName]?.toString() || null;
  },
};
