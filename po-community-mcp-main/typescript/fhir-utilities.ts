import { Request } from "express";
import { FhirContext } from "./fhir-context";
import * as jose from "jose";
import { McpConstants } from "./mcp-constants";

export const FhirUtilities = {
  getFhirContext: (req: Request): FhirContext | null => {
    const headers = req.headers;
    const url = headers[McpConstants.FhirServerUrlHeaderName]?.toString();

    if (!url) {
      return null;
    }

    const token = headers[McpConstants.FhirAccessTokenHeaderName]?.toString();
    return { url, token };
  },
  getPatientIdIfContextExists: (req: Request) => {
    const fhirToken =
      req.headers[McpConstants.FhirAccessTokenHeaderName]?.toString();

    if (fhirToken) {
      try {
        const claims = jose.decodeJwt(fhirToken);
        if (claims["patient"]) {
          return claims["patient"]?.toString();
        }
      } catch (error) {
        console.warn("Unable to decode FHIR access token; falling back to x-patient-id header.", error);
      }
    }

    return req.headers[McpConstants.PatientIdHeaderName]?.toString() || null;
  },
};
