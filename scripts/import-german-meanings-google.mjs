import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  GERMAN_SOURCE_DIR,
  cleanText,
  normalizeGermanRecord,
  normalizeGermanKey,
  readGermanSeed,
  writeCsv,
  writeGermanEnrichmentReport,
  writeGermanNounChecklist,
  writeGermanSeed
} from "./german-vocabulary-utils.mjs";

const CACHE_PATH = `${GERMAN_SOURCE_DIR}/ドイツ単語_ja_translation_cache.json`;
const CANDIDATES_PATH = `${GERMAN_SOURCE_DIR}/ドイツ単語_meaning_candidates.csv`;
const APPLY_TO_SEED = process.argv.includes("--apply");
const EXPORT_ONLY = process.argv.includes("--export-only");
const REFRESH_EXISTING = process.argv.includes("--refresh");
const numericArg = process.argv.find((arg) => /^\d+$/.test(arg));
const LIMIT = Number(process.env.GERMAN_TRANSLATION_LIMIT || numericArg || 0);
const WAIT_MS = Number(process.env.GERMAN_TRANSLATION_WAIT_MS || 160);
const MEANING_OVERRIDES = new Map([
  ["sein", "である、いる"],
  ["haben", "持っている"],
  ["werden", "なる"],
  ["können", "できる"],
  ["müssen", "しなければならない"],
  ["sollen", "すべきである"],
  ["wollen", "したい"],
  ["dürfen", "してもよい"],
  ["mögen", "好む"],
  ["meinen", "思う、意味する"],
  ["fahren", "乗り物で行く"],
  ["gehen", "行く"],
  ["kommen", "来る"],
  ["bringen", "持ってくる"],
  ["bekommen", "受け取る、得る"],
  ["nehmen", "取る"],
  ["geben", "与える"],
  ["machen", "する、作る"],
  ["tun", "する"],
  ["lassen", "させる、そのままにする"],
  ["liegen", "横たわっている、位置する"],
  ["stehen", "立っている"],
  ["setzen", "置く、座らせる"],
  ["sitzen", "座っている"],
  ["stellen", "立てて置く"],
  ["legen", "横に置く"],
  ["abholen", "迎えに行く、受け取る"],
  ["brechen", "壊す、折る"],
  ["politik", "政治"],
  ["rock", "スカート"],
  ["meter", "メートル"],
  ["ferien", "休暇"],
  ["schauen", "見る"],
  ["wagen", "思い切ってする、あえてする"],
  ["sprechen", "話す"],
  ["wissen", "知っている"],
  ["kennen", "知っている、知り合いである"],
  ["denken", "考える"],
  ["finden", "見つける、思う"],
  ["heißen", "という名前である"],
  ["bleiben", "とどまる"],
  ["werden", "なる"]
]);

const cache = readCache();
const seedRows = readGermanSeed();
let translated = 0;
let skipped = 0;
let failed = 0;

for (const record of seedRows) {
  if (EXPORT_ONLY) break;
  if (LIMIT > 0 && translated >= LIMIT) break;
  if (cleanText(record.meaning_ja) && !REFRESH_EXISTING) {
    skipped += 1;
    continue;
  }

  const override = getMeaningOverride(record);
  const query = getTranslationQuery(record);
  const key = normalizeGermanKey(query);
  const cached = cleanText(cache[key]);
  const meaning = override || cached || await translateGermanToJapanese(query);

  if (!meaning) {
    failed += 1;
    continue;
  }

  cache[key] = meaning;
  if (APPLY_TO_SEED) {
    record.meaning_ja = meaning;
    record.review_status = "machine_translated";
    record.notes = appendNote(record.notes, "meaning_ja: Google Translate candidate");
  }
  translated += cached ? 0 : 1;
  skipped += cached ? 1 : 0;

  if (!cached) {
    writeCache(cache);
    await wait(WAIT_MS);
  }
}

writeMeaningCandidates(seedRows, cache);
if (APPLY_TO_SEED) {
  const normalizedRows = seedRows.map(normalizeGermanRecord);
  writeGermanSeed(normalizedRows);
  writeGermanNounChecklist(normalizedRows);
}
writeGermanEnrichmentReport(seedRows.map(normalizeGermanRecord), {
  meaningSource: "https://translate.googleapis.com",
  mode: APPLY_TO_SEED ? "applied_to_seed" : "candidate_only",
  translated,
  cacheEntries: Object.keys(cache).length,
  skipped,
  failed,
  candidatesPath: CANDIDATES_PATH
});
writeCache(cache);

console.log(JSON.stringify({
  translated,
  mode: APPLY_TO_SEED ? "applied_to_seed" : "candidate_only",
  skipped,
  failed,
  cacheEntries: Object.keys(cache).length
}, null, 2));

function getTranslationQuery(record) {
  return cleanText(record.lemma_de || record.display_de);
}

function getMeaningOverride(record) {
  return MEANING_OVERRIDES.get(normalizeGermanKey(record.lemma_de || record.display_de)) || "";
}

async function translateGermanToJapanese(query) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "de");
  url.searchParams.set("tl", "ja");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    return cleanTranslation(data?.[0]?.map((part) => part?.[0] || "").join(""));
  } catch (_error) {
    return "";
  }
}

function cleanTranslation(value) {
  return cleanText(value)
    .replace(/^その/, "")
    .replace(/^ザ・/, "")
    .replace(/（(?:名詞|動詞|形容詞|副詞|前置詞|句)）/g, "")
    .replace(/\s*\((?:名詞|動詞|形容詞|副詞|前置詞|句)\)/g, "")
    .replace(/\s+/g, " ");
}

function writeMeaningCandidates(rows, nextCache) {
  const candidateRows = rows.map((record) => {
    const query = getTranslationQuery(record);
    const candidate = cleanTranslation(getMeaningOverride(record) || nextCache[normalizeGermanKey(query)] || "");
    return {
      lemma_de: record.lemma_de || record.display_de || "",
      article: record.article || "",
      part_of_speech: record.part_of_speech || "",
      current_meaning_ja: record.meaning_ja || "",
      candidate_meaning_ja: candidate,
      query,
      review_status: candidate ? "machine_candidate" : "missing",
      notes: candidate ? "Review before applying to seed" : ""
    };
  });

  writeCsv(CANDIDATES_PATH, candidateRows, [
    "lemma_de",
    "article",
    "part_of_speech",
    "current_meaning_ja",
    "candidate_meaning_ja",
    "query",
    "review_status",
    "notes"
  ]);
}

function appendNote(existing, note) {
  const text = cleanText(existing);
  if (!text) return note;
  if (text.includes(note)) return text;
  return `${text}; ${note}`;
}

function readCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch (_error) {
    return {};
  }
}

function writeCache(nextCache) {
  writeFileSync(CACHE_PATH, `${JSON.stringify(nextCache, null, 2)}\n`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
