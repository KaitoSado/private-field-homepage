import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const GERMAN_SOURCE_DIR = "ドイツ単語帳抜き出しフォルダ";
export const GERMAN_SEED_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_app_seed.json");
export const GERMAN_ENRICHMENT_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_enrichment.csv");
export const GERMAN_NOUN_CHECK_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_名詞_性チェック用.csv");
export const GERMAN_ENRICHMENT_REPORT_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_enrichment_report.json");

const ARTICLE_TO_GENDER = {
  der: "masculine",
  die: "feminine",
  das: "neuter"
};

const GENDER_TO_ARTICLE = {
  masculine: "der",
  feminine: "die",
  neuter: "das",
  plural: "die"
};

const KNOWN_RECORD_OVERRIDES = new Map([
  ["eltern", { article: "die", gender: "plural", plural: "Eltern" }],
  ["ferien", { article: "die", gender: "plural", plural: "Ferien", meaning_ja: "休暇" }],
  ["kopfschmerzen", { article: "die", gender: "plural", plural: "Kopfschmerzen" }],
  ["leute", { article: "die", gender: "plural", plural: "Leute" }],
  ["schauen", { part_of_speech: "verb", article: "", gender: "", plural: "", meaning_ja: "見る" }],
  ["wagen", { part_of_speech: "verb", article: "", gender: "", plural: "", meaning_ja: "思い切ってする、あえてする" }]
]);

export function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeGermanKey(value) {
  return cleanText(value)
    .normalize("NFC")
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, " ");
}

export function normalizeArticle(value) {
  const normalized = normalizeGermanKey(value);
  if (normalized === "der" || normalized === "m" || normalized === "masculine" || normalized === "男性") return "der";
  if (normalized === "die" || normalized === "f" || normalized === "feminine" || normalized === "女性") return "die";
  if (normalized === "das" || normalized === "n" || normalized === "neuter" || normalized === "中性") return "das";
  return "";
}

export function normalizeGender(value) {
  const normalized = normalizeGermanKey(value);
  if (normalized === "masculine" || normalized === "m" || normalized === "der" || normalized === "男性") return "masculine";
  if (normalized === "feminine" || normalized === "f" || normalized === "die" || normalized === "女性") return "feminine";
  if (normalized === "neuter" || normalized === "n" || normalized === "das" || normalized === "中性") return "neuter";
  if (normalized === "plural" || normalized === "pl" || normalized === "複数") return "plural";
  return "";
}

export function getGenderFromArticle(article) {
  return ARTICLE_TO_GENDER[normalizeArticle(article)] || "";
}

export function getArticleFromGender(gender) {
  return GENDER_TO_ARTICLE[normalizeGender(gender)] || "";
}

export function normalizeGermanRecord(record) {
  const key = normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de);
  const sourceRecord = {
    ...record,
    ...(KNOWN_RECORD_OVERRIDES.get(key) || {})
  };
  const partOfSpeech = cleanText(sourceRecord.part_of_speech || "unknown").toLowerCase();
  const article = normalizeArticle(sourceRecord.article);
  const gender = normalizeGender(sourceRecord.gender) || getGenderFromArticle(article);
  const inferredArticle = article || getArticleFromGender(gender);
  const isNoun = partOfSpeech === "noun";
  const needsGender = isNoun && !(inferredArticle && gender);
  const hasMeaning = Boolean(cleanText(record.meaning_ja));
  const incomingStatus = cleanText(record.review_status);
  const reviewStatus = needsGender || !hasMeaning
    ? "needs_enrichment"
    : incomingStatus === "machine_translated"
      ? "machine_translated"
      : "ready";

  return {
    ...record,
    ...sourceRecord,
    part_of_speech: partOfSpeech,
    article: isNoun ? inferredArticle : "",
    gender: isNoun ? gender : "",
    plural: cleanText(sourceRecord.plural),
    meaning_ja: cleanText(sourceRecord.meaning_ja),
    example_de: cleanText(sourceRecord.example_de),
    example_ja: cleanText(sourceRecord.example_ja),
    tags: cleanText(sourceRecord.tags),
    notes: cleanText(sourceRecord.notes),
    needs_gender: needsGender,
    review_status: reviewStatus
  };
}

export function readGermanSeed() {
  return JSON.parse(readFileSync(GERMAN_SEED_PATH, "utf8"));
}

export function writeGermanSeed(rows) {
  writeFileSync(GERMAN_SEED_PATH, `${JSON.stringify(rows.map(normalizeGermanRecord), null, 2)}\n`);
}

export function readCsv(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const [headerLine, ...bodyLines] = lines;
  const headers = parseCsvLine(headerLine);

  return bodyLines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

export function writeCsv(path, rows, headers) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] || "")).join(","))
  ];
  writeFileSync(path, `${lines.join("\n")}\n`);
}

export function ensureGermanEnrichmentTemplate(seedRows) {
  if (existsSync(GERMAN_ENRICHMENT_PATH)) return false;

  const rows = seedRows.map((record) => ({
    lemma_de: record.lemma_de || record.display_de || "",
    article: record.article || "",
    gender: record.gender || "",
    plural: record.plural || "",
    meaning_ja: record.meaning_ja || "",
    example_de: record.example_de || "",
    example_ja: record.example_ja || "",
    part_of_speech: record.part_of_speech || "",
    notes: record.notes || ""
  }));

  writeCsv(GERMAN_ENRICHMENT_PATH, rows, [
    "lemma_de",
    "article",
    "gender",
    "plural",
    "meaning_ja",
    "example_de",
    "example_ja",
    "part_of_speech",
    "notes"
  ]);
  return true;
}

export function mergeGermanEnrichment(seedRows, enrichmentRows) {
  const enrichmentByKey = new Map();

  for (const row of enrichmentRows) {
    const key = normalizeGermanKey(row.normalized_key || row.lemma_de || row.display_de);
    if (!key) continue;
    enrichmentByKey.set(key, row);
  }

  let updatedFields = 0;
  const merged = seedRows.map((record) => {
    const key = normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de);
    const enrichment = enrichmentByKey.get(key);
    if (!enrichment) return normalizeGermanRecord(record);

    const next = { ...record };
    for (const field of ["article", "gender", "plural", "meaning_ja", "example_de", "example_ja", "part_of_speech", "tags", "notes"]) {
      const value = cleanText(enrichment[field]);
      if (value && cleanText(next[field]) !== value) {
        next[field] = value;
        updatedFields += 1;
      }
    }
    return normalizeGermanRecord(next);
  });

  return { rows: merged, updatedFields };
}

export function writeGermanNounChecklist(rows) {
  const normalizedRows = rows.map(normalizeGermanRecord);
  const nouns = normalizedRows
    .filter((record) => record.part_of_speech === "noun")
    .map((record) => ({
      lemma_de: record.lemma_de || record.display_de || "",
      article: record.article || "",
      gender: record.gender || "",
      plural: record.plural || "",
      meaning_ja: record.meaning_ja || "",
      review_status: record.review_status || "",
      notes: record.notes || ""
    }));

  writeCsv(GERMAN_NOUN_CHECK_PATH, nouns, [
    "lemma_de",
    "article",
    "gender",
    "plural",
    "meaning_ja",
    "review_status",
    "notes"
  ]);
}

export function getGermanEnrichmentSummary(rows) {
  const normalizedRows = rows.map(normalizeGermanRecord);
  const nouns = normalizedRows.filter((record) => record.part_of_speech === "noun");
  const countFilled = (records, field) => records.filter((record) => cleanText(record[field])).length;

  return {
    total: normalizedRows.length,
    meaning_ja: countFilled(normalizedRows, "meaning_ja"),
    example_de: countFilled(normalizedRows, "example_de"),
    example_ja: countFilled(normalizedRows, "example_ja"),
    nouns: nouns.length,
    noun_article: countFilled(nouns, "article"),
    noun_gender: countFilled(nouns, "gender"),
    noun_plural: countFilled(nouns, "plural"),
    needs_gender: nouns.filter((record) => record.needs_gender).length
  };
}

export function writeGermanEnrichmentReport(rows, extra = {}) {
  writeFileSync(
    GERMAN_ENRICHMENT_REPORT_PATH,
    `${JSON.stringify({ ...extra, summary: getGermanEnrichmentSummary(rows) }, null, 2)}\n`
  );
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map(cleanText);
}

function escapeCsvValue(value) {
  const text = cleanText(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}
