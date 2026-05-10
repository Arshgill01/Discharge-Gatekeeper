import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  seedFhirBundles,
} from "../typescript/fhir-store";

const main = async (): Promise<void> => {
  const requestedBundleIds = process.argv.slice(2).filter((value) => value.trim().length > 0);
  const fhirServer = process.env["FHIR_BASE_URL"]?.trim() || DEFAULT_LOCAL_FHIR_BASE_URL;
  const storePath = process.env["FHIR_LOCAL_STORE_PATH"]?.trim() || DEFAULT_LOCAL_FHIR_STORE_PATH;

  const result = await seedFhirBundles({
    bundleIds: requestedBundleIds.length > 0 ? requestedBundleIds : undefined,
    fhirServer,
    storePath,
  });

  console.log(JSON.stringify(result, null, 2));
};

void main();
