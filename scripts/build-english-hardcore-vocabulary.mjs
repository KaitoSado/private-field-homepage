import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeEnglishDeckArtifacts } from "./lib/english-deck-artifacts.mjs";

const SOURCES = [
  {
    id: "teppeki",
    label: "鉄壁",
    url: "https://ukaru-eigo.com/teppeki-word-list/",
    cacheFile: "teppeki-word-list.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  },
  {
    id: "target1900",
    label: "ターゲット1900",
    url: "https://ukaru-eigo.com/target-1900-word-list/",
    cacheFile: "target-1900-word-list.html",
    wordColumn: 2,
    meaningColumn: 3,
    forcePhrase: false
  },
  {
    id: "systan",
    label: "システム英単語",
    url: "https://ukaru-eigo.com/systan-word-list/",
    cacheFile: "systan-word-list.html",
    wordColumn: 2,
    meaningColumn: 3,
    forcePhrase: false
  },
  {
    id: "leap",
    label: "LEAP",
    url: "https://ukaru-eigo.com/leap-modified-list/",
    cacheFile: "leap-modified-list.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  },
  {
    id: "sokujuku",
    label: "速読英熟語",
    url: "https://ukaru-eigo.com/sokujuku-list/",
    cacheFile: "sokujuku-list.html",
    wordColumn: 3,
    meaningColumn: 4,
    forcePhrase: true
  },
  {
    id: "passtan1",
    label: "パス単準1級",
    url: "https://ukaru-eigo.com/passtan-p1-word-list/",
    cacheFile: "passtan-p1-word-list.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  },
  {
    id: "eiken1",
    label: "英検1級5000",
    url: "https://ejquotes.com/eiken-grade-1-word-list",
    cacheFile: "eiken-grade-1-word-list.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  },
  {
    id: "eiken1",
    label: "英検1級5000",
    url: "https://ejquotes.com/eiken-grade-1-word-list/2#toc2",
    cacheFile: "eiken-grade-1-word-list-2.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  },
  {
    id: "eiken1",
    label: "英検1級5000",
    url: "https://ejquotes.com/eiken-grade-1-word-list/3",
    cacheFile: "eiken-grade-1-word-list-3.html",
    wordColumn: 1,
    meaningColumn: 2,
    forcePhrase: false
  }
];

const explicitPosPattern = /(?:[\[［【](名|自|他|動|形|副|前|接|代|助|熟)[\]］】]|[（(](名|自|他|動|形|副|前|接|代|助|熟)[）)])/g;

const outputPath = resolve("lib/english-hardcore.js");
const tsvOutputPath = resolve("英単語/hardcore_scraped_normalized.tsv");
const meaningOverridePath = resolve("英単語/hardcore_meaning_overrides.tsv");
const cacheDir = getArgValue("--cache-dir");
const VERB_ENDING_PATTERN = /(?:する|される|させる|できる|なる|ある|いる|う|く|ぐ|す|つ|ぬ|ぶ|む|る|れる|える|ける|げる|める)$/;

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function getOverrideKey(word, pos = "") {
  return `${normalizeWordKey(word)}::${String(pos || "").trim()}`;
}

function splitOverrideList(value) {
  return String(value || "")
    .split(/\s*(?:\/|\|)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readMeaningOverrides() {
  if (!existsSync(meaningOverridePath)) return new Map();

  const text = readFileSync(meaningOverridePath, "utf8").trim();
  if (!text) return new Map();

  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split("\t").map((header) => header.trim());
  const overrides = new Map();

  for (const line of lines) {
    const columns = line.split("\t");
    const row = Object.fromEntries(headers.map((header, index) => [header, String(columns[index] || "").trim()]));
    if (!row.word || !row.meaning) continue;

    overrides.set(getOverrideKey(row.word, row.pos), {
      word: normalizeWord(row.word),
      pos: row.pos,
      meaning: row.meaning,
      altMeanings: splitOverrideList(row.altMeanings),
      core: row.core,
      note: row.note
    });
  }

  return overrides;
}

function findMeaningOverride(overrides, word, pos) {
  return overrides.get(getOverrideKey(word, pos)) || overrides.get(getOverrideKey(word));
}

async function readSourceHtml(source) {
  const cachePath = cacheDir ? join(cacheDir, source.cacheFile) : "";

  if (cachePath && existsSync(cachePath)) {
    return readFileSync(cachePath, "utf8");
  }

  const response = await fetch(source.url, {
    headers: {
      "user-agent": "NewCommuneVocabularyBuilder/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  if (cachePath) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, html, "utf8");
  }

  return html;
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#8217;|&#8242;/g, "'")
    .replace(/&#8220;|&#8221;/g, "\"")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseTableRows(html) {
  return (html.match(/<tr[\s\S]*?<\/tr>/g) || [])
    .slice(1)
    .map((row) => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((match) => decodeHtml(match[1])));
}

function normalizeWord(word) {
  return word
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWordKey(word) {
  return word
    .toLowerCase()
    .replace(/[～]/g, "~")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMeaning(meaning) {
  return meaning
    .replace(explicitPosPattern, "")
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningParts(meaning) {
  return cleanMeaning(meaning)
    .split(/\s*[；;]\s*|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function classifyPos(word, meaning, forcePhrase) {
  if (forcePhrase || isPhrase(word)) return { pos: "phrase", explicit: true };

  const explicit = getExplicitPosLabel(meaning);
  if (explicit) {
    return {
      pos: {
        名: "noun",
        自: "verb",
        他: "verb",
        動: "verb",
        形: "adjective",
        副: "adverb",
        熟: "phrase"
      }[explicit] || "other",
      explicit: true
    };
  }

  const cleaned = cleanMeaning(meaning);
  if (/^(を|～を|に|～に)/.test(cleaned) || /する|される|させる|起こる|増える|減る|続く|残る|現れる|従う|向かう|生じる/.test(cleaned)) {
    return { pos: "verb", explicit: false };
  }
  if (/(な|的な|可能な|不可欠な|重要な|必要な|しやすい|できる)$/.test(cleaned)) {
    return { pos: "adjective", explicit: false };
  }
  if (/(に|く)$/.test(cleaned) && cleaned.length <= 16) {
    return { pos: "adverb", explicit: false };
  }

  return { pos: "noun", explicit: false };
}

function getExplicitPosLabel(meaning) {
  explicitPosPattern.lastIndex = 0;
  const match = explicitPosPattern.exec(meaning);
  explicitPosPattern.lastIndex = 0;
  return match ? (match[1] || match[2]) : "";
}

function isPhrase(word) {
  return /\s|～|\.{2,}|…|\b(one's|oneself|do|doing|A|B)\b/i.test(word);
}

function resolvePos(posVotes, fallbackVotes) {
  const source = posVotes.size ? posVotes : fallbackVotes;
  return [...source.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return posRank(left[0]) - posRank(right[0]);
  })[0]?.[0] || "other";
}

function posRank(pos) {
  return ["phrase", "verb", "noun", "adjective", "adverb", "other"].indexOf(pos);
}

function posLabel(pos) {
  switch (pos) {
    case "noun":
      return "名詞";
    case "verb":
      return "動詞";
    case "adjective":
      return "形容詞";
    case "adverb":
      return "副詞";
    case "phrase":
      return "熟語";
    default:
      return "その他";
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function addVote(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function mergeMeaningSet(parts) {
  const merged = [];
  const seen = new Set();

  for (const part of parts) {
    const normalized = part
      .replace(/[、，,]/g, "")
      .replace(/[（）()［］\[\]〔〕]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(part);
  }

  return merged.join(" / ");
}

function normalizeMeaningKey(value) {
  return value
    .replace(/[、，,・/／\s]/g, "")
    .replace(/[（）()［］\[\]〔〕]/g, "")
    .replace(/[〜～~…]/g, "")
    .toLowerCase()
    .trim();
}

function splitMeaningSegments(part) {
  return part
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/[［【\[][^\]］】]*[\]］】]/g, " ")
    .replace(/[／]/g, "/")
    .replace(/[；;]/g, "/")
    .replace(/([）)])\s+(?=[（(])/g, "$1 / ")
    .replace(/\s{2,}/g, " / ")
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitSegmentByCommasAndSpaces(segment) {
  const sanitized = segment
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/[［【\[][^\]］】]*[\]］】]/g, " ");

  return sanitized
    .split(/\s*[、，,]\s*/)
    .flatMap((item) => {
      const trimmed = item.trim();
      if (!trimmed) return [];
      const words = trimmed.split(/\s+/).filter(Boolean);
      return words.length >= 2 && words.length <= 4 ? words : [trimmed];
    })
    .filter(Boolean);
}

function simplifyMeaningCandidate(segment, pos) {
  let candidate = segment
    .replace(/〔[^〕]*〕/g, " ")
    .replace(/[〈〉《》]/g, " ")
    .replace(/[［【\[][^\]］】]*[\]］】]/g, " ")
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/\b(?:for|with|in|on|as|to|about|against|of|into|from|be|one's|oneself|someone|something|A|B)\b/gi, " ")
    .replace(/[~〜～…]/g, " ")
    .replace(/^(?:主に|特に|一般に|単に|主として)/, "")
    .replace(/(?:の)?(?:状態|状況)$/g, "")
    .replace(/^[\-・]+|[\-・]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  candidate = candidate
    .replace(/^(?:を|に|が|と|へ|で|から|より|まで|として|について|に対して|にとって)+/g, "")
    .replace(/^(?:～|〜|~|…)+/g, "")
    .replace(/^[・、，,]+|[・、，,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return candidate.trim();
}

function isValidMeaningCandidate(candidate, pos) {
  if (!candidate) return false;
  if (candidate.length > 18) return false;
  if (/[A-Za-z0-9]/.test(candidate)) return false;
  if (/^(?:こと|もの|人|状態|状況|など|主に|特に)$/.test(candidate)) return false;

  if (pos === "noun" && VERB_ENDING_PATTERN.test(candidate)) return false;
  if ((pos === "verb" || pos === "phrase") && !VERB_ENDING_PATTERN.test(candidate)) return false;

  return true;
}

function scoreMeaningCandidate(stat, pos) {
  let score = stat.count * 12;

  if (stat.meaning.length <= 6) score += 6;
  else if (stat.meaning.length <= 10) score += 2;
  else score -= 2;

  if (/[・、，,/\s]/.test(stat.meaning)) score -= 4;
  if (/^(?:こと|もの|人)/.test(stat.meaning)) score -= 8;
  if (/(?:状態|状況|重要性)$/.test(stat.meaning)) score -= 4;
  if (pos === "verb" && /する$/.test(stat.meaning)) score += 2;
  if (pos === "noun" && !VERB_ENDING_PATTERN.test(stat.meaning)) score += 2;

  score -= stat.firstSeen * 0.01;
  return score;
}

function collectMeaningCandidates(parts, pos) {
  const stats = new Map();
  let serial = 0;

  for (const part of parts) {
    const localSeen = new Set();

    for (const segment of splitMeaningSegments(part)) {
      for (const item of splitSegmentByCommasAndSpaces(segment)) {
        const candidate = simplifyMeaningCandidate(item, pos);
        const key = normalizeMeaningKey(candidate);

        if (!candidate || localSeen.has(key) || !isValidMeaningCandidate(candidate, pos)) continue;
        localSeen.add(key);

        const current = stats.get(key) || {
          meaning: candidate,
          count: 0,
          firstSeen: serial
        };

        current.count += 1;
        stats.set(key, current);
        serial += 1;
      }
    }
  }

  return [...stats.values()]
    .map((stat) => ({ ...stat, score: scoreMeaningCandidate(stat, pos) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.count !== left.count) return right.count - left.count;
      if (left.firstSeen !== right.firstSeen) return left.firstSeen - right.firstSeen;
      return left.meaning.length - right.meaning.length;
    });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function fallbackPrimaryMeaning(rawMeaning, pos) {
  const firstSegment = splitMeaningSegments(rawMeaning)[0] || rawMeaning;
  const firstCandidate = splitSegmentByCommasAndSpaces(firstSegment)[0] || firstSegment;
  const simplified = simplifyMeaningCandidate(firstCandidate, pos);
  return simplified || cleanMeaning(firstSegment) || rawMeaning;
}

function buildMeaningSummary(record, pos, overrides) {
  const rawMeaning = mergeMeaningSet(record.meaningParts);
  const override = findMeaningOverride(overrides, record.word, pos);

  if (override) {
    return {
      meaning: override.meaning,
      altMeanings: override.altMeanings,
      coreMeaning: override.core,
      note: override.note,
      rawMeaning,
      confidence: 1,
      source: "override",
      topScore: 999,
      candidateCount: 1
    };
  }

  const candidates = collectMeaningCandidates(record.meaningParts, pos);
  if (!candidates.length) {
    return {
      meaning: fallbackPrimaryMeaning(rawMeaning, pos),
      altMeanings: [],
      coreMeaning: "",
      note: "",
      rawMeaning,
      confidence: 0.2,
      source: "fallback",
      topScore: 0,
      candidateCount: 0
    };
  }

  const primary = candidates[0];
  const secondary = candidates
    .slice(1)
    .filter((candidate) => candidate.score >= 8)
    .map((candidate) => candidate.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 3);

  const separation = primary.score - (candidates[1]?.score || 0);
  const confidence = clamp01(0.35 + primary.count * 0.1 + separation * 0.03 - Math.max(0, secondary.length - 1) * 0.05);

  return {
    meaning: primary.meaning,
    altMeanings: secondary,
    coreMeaning: "",
    note: "",
    rawMeaning,
    confidence,
    source: "heuristic",
    topScore: primary.score,
    candidateCount: candidates.length
  };
}

function maybeResolveBetterPos(record, resolvedPos, currentSummary, overrides) {
  const posCandidates = ["verb", "noun", "adjective", "adverb", "phrase", "other"];
  const shouldInspectAlternatives =
    currentSummary.source === "fallback" ||
    (!record.explicitPosVotes.size && currentSummary.topScore < 12);

  if (!shouldInspectAlternatives) {
    return { pos: resolvedPos, summary: currentSummary };
  }

  let best = { pos: resolvedPos, summary: currentSummary };

  for (const pos of posCandidates) {
    if (pos === resolvedPos) continue;
    const summary = buildMeaningSummary(record, pos, overrides);

    if (summary.topScore > best.summary.topScore + 4) {
      best = { pos, summary };
    }
  }

  return best;
}

function buildNuanceText(word, summary) {
  const parts = [];

  if (summary.coreMeaning) parts.push(`核: ${summary.coreMeaning}`);
  if (summary.altMeanings.length) parts.push(`別義: ${summary.altMeanings.join(" / ")}`);
  if (summary.note) parts.push(summary.note);

  return parts.join(" / ") || `${word} は「${summary.meaning}」。`;
}

function buildGrammarNote(pos, sourceLabels, summary) {
  const parts = [`品詞: ${posLabel(pos)}`, `出典: ${sourceLabels.join(", ")}`];

  if (summary.source === "override") {
    parts.push("訳: curated");
  } else if (summary.altMeanings.length) {
    parts.push(`別義: ${summary.altMeanings.join(" / ")}`);
  }

  return parts.join(" / ");
}

function toEntry(record, order, usedSlugs, overrides) {
  const slugBase = slugify(record.word) || `entry-${order}`;
  let slug = slugBase;
  let counter = 2;
  while (usedSlugs.has(slug)) {
    slug = `${slugBase}-${counter}`;
    counter += 1;
  }
  usedSlugs.add(slug);

  const resolvedPos = resolvePos(record.explicitPosVotes, record.posVotes);
  const initialSummary = buildMeaningSummary(record, resolvedPos, overrides);
  const { pos, summary: meaningSummary } = maybeResolveBetterPos(record, resolvedPos, initialSummary, overrides);
  const sourceLabels = [...record.sources].map((sourceId) => SOURCES.find((source) => source.id === sourceId)?.label || sourceId);

  return {
    id: `hardcore-${slug}`,
    headword: record.word,
    coreChunk: record.word,
    meaning: meaningSummary.meaning,
    meaningAlternates: meaningSummary.altMeanings,
    meaningRaw: meaningSummary.rawMeaning,
    meaningCore: meaningSummary.coreMeaning,
    meaningConfidence: meaningSummary.confidence,
    meaningSource: meaningSummary.source,
    nuance: buildNuanceText(record.word, meaningSummary),
    grammarNote: buildGrammarNote(pos, sourceLabels, meaningSummary),
    relatedChunks: [],
    starterExamples: [
      {
        topic: "all",
        text: record.word,
        cloze: record.word,
        ja: meaningSummary.meaning
      }
    ],
    diverseExamples: [],
    shadowPrompts: [record.word],
    family: record.word,
    pos,
    unit: "hardcore",
    sourceIds: [...record.sources],
    order
  };
}

function toTsv(entries) {
  const header = ["id", "word", "answerJa", "altMeanings", "rawMeaning", "confidence", "family", "pos", "unit", "order", "sources"];
  const rows = entries.map((entry) => [
    entry.id,
    entry.headword,
    entry.meaning,
    entry.meaningAlternates.join(" / "),
    entry.meaningRaw,
    String(entry.meaningConfidence),
    entry.family,
    entry.pos,
    entry.unit,
    String(entry.order),
    entry.sourceIds.join(",")
  ].map((value) => String(value).replace(/\t/g, " ").replace(/\r?\n/g, " ")));

  return [header, ...rows].map((row) => row.join("\t")).join("\n") + "\n";
}

async function main() {
  const byWord = new Map();
  let rawCount = 0;
  const overrides = readMeaningOverrides();

  for (const source of SOURCES) {
    const html = await readSourceHtml(source);
    let sourceCount = 0;

    for (const cells of parseTableRows(html)) {
      const word = normalizeWord(cells[source.wordColumn] || "");
      const rawMeaning = cells[source.meaningColumn] || "";

      if (!word || !rawMeaning || /^[-ー]$/.test(word) || !/[A-Za-z]/.test(word)) continue;

      const key = normalizeWordKey(word);
      const record = byWord.get(key) || {
        word,
        meaningParts: [],
        sources: new Set(),
        explicitPosVotes: new Map(),
        posVotes: new Map()
      };
      const classified = classifyPos(word, rawMeaning, source.forcePhrase);

      for (const part of meaningParts(rawMeaning)) {
        record.meaningParts.push(part);
      }
      record.sources.add(source.id);
      addVote(record.posVotes, classified.pos);
      if (classified.explicit) addVote(record.explicitPosVotes, classified.pos);

      byWord.set(key, record);
      rawCount += 1;
      sourceCount += 1;
    }

    console.log(`${source.label}: ${sourceCount} rows`);
  }

  const usedSlugs = new Set();
  const entries = [...byWord.values()].map((record, index) => toEntry(record, index + 1, usedSlugs, overrides));
  const { chunkLibrary, outputPath: deckOutputPath, manifestPath } = writeEnglishDeckArtifacts({
    deckId: "hardcore",
    entries
  });

  writeFileSync(tsvOutputPath, toTsv(entries), "utf8");
  writeFileSync(
    outputPath,
    `// Generated by scripts/build-english-hardcore-vocabulary.mjs from the configured vocabulary source pages.\n// Do not edit this file by hand; update the scraper or source list and rerun the generator.\n\nexport const ENGLISH_HARDCORE_LIBRARY = ${JSON.stringify(entries, null, 2)};\n`,
    "utf8"
  );

  console.log(`Merged ${rawCount} scraped rows into ${entries.length} hardcore vocabulary entries.`);
  console.log(`Generated ${outputPath}`);
  console.log(`Generated ${tsvOutputPath}`);
  console.log(`Generated ${chunkLibrary.length} hardcore English chunks -> ${deckOutputPath}`);
  console.log(`Updated deck manifest -> ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
