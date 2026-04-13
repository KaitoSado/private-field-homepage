import {
  GERMAN_ENRICHMENT_PATH,
  ensureGermanEnrichmentTemplate,
  mergeGermanEnrichment,
  readCsv,
  readGermanSeed,
  writeGermanEnrichmentReport,
  writeGermanNounChecklist,
  writeGermanSeed
} from "./german-vocabulary-utils.mjs";

const seedRows = readGermanSeed();
const createdTemplate = ensureGermanEnrichmentTemplate(seedRows);
const enrichmentRows = readCsv(GERMAN_ENRICHMENT_PATH);
const { rows, updatedFields } = mergeGermanEnrichment(seedRows, enrichmentRows);

writeGermanSeed(rows);
writeGermanNounChecklist(rows);
writeGermanEnrichmentReport(rows, {
  updatedFields,
  enrichmentRows: enrichmentRows.length,
  createdTemplate
});

console.log(JSON.stringify({
  seedRows: rows.length,
  enrichmentRows: enrichmentRows.length,
  updatedFields,
  createdTemplate
}, null, 2));
