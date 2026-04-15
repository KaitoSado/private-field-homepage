import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

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
const cacheDir = getArgValue("--cache-dir");

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
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

function toEntry(record, order, usedSlugs) {
  const slugBase = slugify(record.word) || `entry-${order}`;
  let slug = slugBase;
  let counter = 2;
  while (usedSlugs.has(slug)) {
    slug = `${slugBase}-${counter}`;
    counter += 1;
  }
  usedSlugs.add(slug);

  const pos = resolvePos(record.explicitPosVotes, record.posVotes);
  const meaning = mergeMeaningSet(record.meaningParts);
  const sourceLabels = [...record.sources].map((sourceId) => SOURCES.find((source) => source.id === sourceId)?.label || sourceId);

  return {
    id: `hardcore-${slug}`,
    headword: record.word,
    coreChunk: record.word,
    meaning,
    nuance: `${record.word} は「${meaning}」。`,
    grammarNote: `品詞: ${posLabel(pos)} / 出典: ${sourceLabels.join(", ")}`,
    relatedChunks: [],
    starterExamples: [
      {
        topic: "all",
        text: record.word,
        cloze: record.word,
        ja: meaning
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
  const header = ["id", "word", "answerJa", "family", "pos", "unit", "order", "sources"];
  const rows = entries.map((entry) => [
    entry.id,
    entry.headword,
    entry.meaning,
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
  const entries = [...byWord.values()].map((record, index) => toEntry(record, index + 1, usedSlugs));

  writeFileSync(tsvOutputPath, toTsv(entries), "utf8");
  writeFileSync(
    outputPath,
    `// Generated by scripts/build-english-hardcore-vocabulary.mjs from the configured vocabulary source pages.\n// Do not edit this file by hand; update the scraper or source list and rerun the generator.\n\nexport const ENGLISH_HARDCORE_LIBRARY = ${JSON.stringify(entries, null, 2)};\n`,
    "utf8"
  );

  console.log(`Merged ${rawCount} scraped rows into ${entries.length} hardcore vocabulary entries.`);
  console.log(`Generated ${outputPath}`);
  console.log(`Generated ${tsvOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
