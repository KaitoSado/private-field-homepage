import { resolve } from "node:path";
import {
  cleanText,
  getArticleFromGender,
  normalizeGender,
  normalizeGermanRecord,
  normalizeGermanKey,
  readCsv,
  readGermanSeed,
  writeGermanEnrichmentReport,
  writeGermanNounChecklist,
  writeGermanSeed
} from "./german-vocabulary-utils.mjs";

const nounCsvPath = resolve(process.argv[2] || "/tmp/german-nouns.csv");
const nounRows = readCsv(nounCsvPath);
const seedRows = readGermanSeed();
const nounsByKey = new Map();

for (const row of nounRows) {
  if (!String(row.pos || "").includes("Substantiv")) continue;

  const key = normalizeGermanKey(row.lemma);
  const gender = findGender(row);
  if (!key || !gender) continue;

  const candidates = nounsByKey.get(key) || [];
  candidates.push({
    lemma: cleanText(row.lemma),
    gender,
    article: getArticleFromGender(gender),
    plural: findPlural(row),
    pos: cleanText(row.pos)
  });
  nounsByKey.set(key, candidates);
}

let matched = 0;
let updatedArticle = 0;
let updatedPlural = 0;
let ambiguous = 0;

const rows = seedRows.map((record) => {
  if (record.part_of_speech !== "noun") return record;

  const key = normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de);
  const candidates = nounsByKey.get(key) || nounsByKey.get(normalizeGermanKey(record.lemma_de));
  if (!candidates?.length) return record;

  const candidate = chooseBestCandidate(candidates);
  if (!candidate) return record;

  const next = { ...record };
  matched += 1;
  if (!cleanText(next.article) && candidate.article) {
    next.article = candidate.article;
    updatedArticle += 1;
  }
  if (!cleanText(next.gender) && candidate.gender) {
    next.gender = candidate.gender;
  }
  if (!cleanText(next.plural) && candidate.plural) {
    next.plural = candidate.plural;
    updatedPlural += 1;
  }

  if (candidates.length > 1) {
    ambiguous += 1;
    const note = cleanText(next.notes);
    next.notes = note ? `${note}; noun candidate: ${candidate.pos}` : `noun candidate: ${candidate.pos}`;
  }

  return next;
});
const normalizedRows = rows.map(normalizeGermanRecord);

writeGermanSeed(normalizedRows);
writeGermanNounChecklist(normalizedRows);
writeGermanEnrichmentReport(normalizedRows, {
  nounSource: "https://github.com/gambolputty/german-nouns",
  matched,
  updatedArticle,
  updatedPlural,
  ambiguous
});

console.log(JSON.stringify({
  nounCsvRows: nounRows.length,
  matched,
  updatedArticle,
  updatedPlural,
  ambiguous
}, null, 2));

function findGender(row) {
  for (const key of ["genus", "genus 1", "genus 2", "genus 3", "genus 4"]) {
    const gender = normalizeGender(row[key]);
    if (gender) return gender;
  }
  return "";
}

function findPlural(row) {
  for (const key of [
    "nominativ plural",
    "nominativ plural*",
    "nominativ plural 1",
    "nominativ plural 2",
    "nominativ plural 3",
    "nominativ plural 4"
  ]) {
    const plural = cleanText(row[key]);
    if (plural) return plural;
  }
  return "";
}

function chooseBestCandidate(candidates) {
  const withoutNames = candidates.find((candidate) =>
    !candidate.pos.includes("Nachname") &&
    !candidate.pos.includes("Vorname") &&
    !candidate.pos.includes("Toponym")
  );

  return withoutNames || candidates[0];
}
