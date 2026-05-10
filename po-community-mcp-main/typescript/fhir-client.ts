import { DomainResource } from "@smile-cdr/fhirts/dist/FHIR-R4/classes/domainResource";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { FhirUtilities } from "./fhir-utilities";
import { Request } from "express";
import { FhirContext } from "./fhir-context";
import { fhirR4 } from "@smile-cdr/fhirts";
import {
  isLocalFhirBaseUrl,
  readLocalFhirResource,
  searchLocalFhirResources,
} from "./fhir-store";

class FhirClient {
  async read<T extends DomainResource>(req: Request, path: string) {
    const fhirContext = this._getFhirContextOrThrow(req);
    if (this._shouldPreferRemoteDocumentReferences(fhirContext, path)) {
      const remoteContext = this._getRemoteContext(fhirContext);
      if (remoteContext) {
        try {
          const remoteResource = await this._callAxios<T>(
            {
              method: "get",
              url: this._addPath(remoteContext, path),
            },
            req,
            remoteContext,
          );
          if (remoteResource) {
            return remoteResource;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(
            `[fhir-client] remote DocumentReference read failed for ${path}; falling back to local fixture store. ${message}`,
          );
        }
      }
    }
    if (isLocalFhirBaseUrl(fhirContext.url)) {
      return readLocalFhirResource(path) as T | null;
    }

    return await this._callAxios<T>(
      {
        method: "get",
        url: this._addPath(fhirContext, path),
      },
      req,
    );
  }

  async search(req: Request, resourceType: string, searchParameters: string[]) {
    const fhirContext = this._getFhirContextOrThrow(req);
    if (this._shouldPreferRemoteDocumentReferences(fhirContext, resourceType)) {
      const remoteContext = this._getRemoteContext(fhirContext);
      if (remoteContext) {
        try {
          const remoteBundle = await this._callAxios<fhirR4.Bundle>(
            {
              method: "get",
              url: this._addPath(
                remoteContext,
                `${resourceType}?${searchParameters.join("&")}`,
              ),
            },
            req,
            remoteContext,
          );
          const remoteEntryCount = Array.isArray(remoteBundle?.entry) ? remoteBundle.entry.length : 0;
          const remoteTotal =
            typeof remoteBundle?.total === "number"
              ? remoteBundle.total
              : remoteEntryCount;
          if (remoteTotal > 0 || remoteEntryCount > 0) {
            return remoteBundle;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(
            `[fhir-client] remote DocumentReference search failed; falling back to local fixture store. ${message}`,
          );
        }
      }
    }
    if (isLocalFhirBaseUrl(fhirContext.url)) {
      return searchLocalFhirResources(resourceType, searchParameters) as fhirR4.Bundle;
    }

    return await this._callAxios<fhirR4.Bundle>(
      {
        method: "get",
        url: this._addPath(
          fhirContext,
          `${resourceType}?${searchParameters.join("&")}`,
        ),
      },
      req,
    );
  }

  private async _callAxios<T>(
    config: AxiosRequestConfig,
    req: Request,
    fhirContextOverride?: FhirContext,
  ) {
    const fhirContext = fhirContextOverride || this._getFhirContextOrThrow(req);
    if (fhirContext.token) {
      config.headers = {
        Authorization: `Bearer ${fhirContext.token}`,
      };
    }

    try {
      const response = await axios(config);
      return response.data as T;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status ?? "unknown";
        const method = String(config.method || "get").toUpperCase();
        console.error(
          `[fhir-client] ${method} ${config.url ?? "unknown-url"} failed with status ${status}: ${error.message}`,
        );
        if (status === 404) {
          return null;
        }
      } else if (error instanceof Error) {
        console.error(`[fhir-client] request failed: ${error.message}`);
      } else {
        console.error("[fhir-client] request failed with unknown error");
      }

      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  private _getFhirContextOrThrow(req: Request) {
    const fhirContext = FhirUtilities.getFhirContext(req);
    if (!fhirContext) {
      throw new Error(
        "The FHIR context could not be retrieved. Confirm x-fhir-server-url is present.",
      );
    }

    return fhirContext;
  }

  private _addPath(fhirContext: FhirContext, path: string) {
    if (path.startsWith("/")) {
      path = path.substring(1);
    }

    return `${fhirContext.url}/${path}`;
  }

  private _getRemoteContext(fhirContext: FhirContext): FhirContext | null {
    return fhirContext.remoteUrl
      ? {
          url: fhirContext.remoteUrl,
          token: fhirContext.token,
        }
      : null;
  }

  private _shouldPreferRemoteDocumentReferences(
    fhirContext: FhirContext,
    resourceTypeOrPath: string,
  ): boolean {
    if (!isLocalFhirBaseUrl(fhirContext.url) || !fhirContext.remoteUrl) {
      return false;
    }

    return /^DocumentReference(?:[/?]|$)/i.test(resourceTypeOrPath);
  }
}

export const FhirClientInstance = new FhirClient();
