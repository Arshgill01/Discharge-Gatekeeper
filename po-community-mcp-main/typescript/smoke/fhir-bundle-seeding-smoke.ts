import assert from "node:assert/strict";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  listFhirBundleFixtureIds,
  readLocalFhirResource,
  searchLocalFhirResources,
  seedFhirBundles,
} from "../fhir-store";

const main = async (): Promise<void> => {
  const bundleIds = listFhirBundleFixtureIds();
  assert.deepEqual(
    bundleIds,
    ["daniel-brooks", "eleanor-singh", "maria-alvarez", "olivia-chen"],
    "Expected the four Phase 10 fixture bundles to be present.",
  );

  const seeded = await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  assert.equal(seeded.mode, "local_bundle");
  assert.equal(seeded.patient_ids.includes("daniel-brooks"), true);
  assert.equal(seeded.patient_ids.includes("olivia-chen"), true);
  assert.equal(seeded.encounter_ids.includes("maria-discharge-2026-0418"), true);
  assert.equal(seeded.encounter_ids.includes("daniel-discharge-2026-0419"), true);

  const danielPatient = readLocalFhirResource("Patient/daniel-brooks");
  const oliviaPatient = readLocalFhirResource("Patient/olivia-chen");
  assert.ok(danielPatient, "Expected Daniel patient resource to be seeded into the local store.");
  assert.ok(oliviaPatient, "Expected Olivia patient resource to be seeded into the local store.");

  const danielDocs = searchLocalFhirResources("DocumentReference", ["patient=daniel-brooks", "_count=20"]);
  const mariaObservations = searchLocalFhirResources("Observation", ["patient=maria-alvarez", "_count=20"]);
  assert.equal((danielDocs.entry ?? []).length >= 3, true, "Expected Daniel narrative documents to be queryable.");
  assert.equal((mariaObservations.entry ?? []).length >= 3, true, "Expected Maria observations to be queryable.");

  console.log("SMOKE PASS: fhir bundle seeding");
  console.log(
    JSON.stringify(
      {
        bundle_ids: seeded.bundle_ids,
        patient_ids: seeded.patient_ids,
        encounter_ids: seeded.encounter_ids,
        resource_count: seeded.resource_count,
        daniel_document_count: (danielDocs.entry ?? []).length,
        maria_observation_count: (mariaObservations.entry ?? []).length,
        store_path: seeded.store_path,
      },
      null,
      2,
    ),
  );
};

void main();
