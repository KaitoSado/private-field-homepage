import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve("英単語/hardcore_scraped_normalized.tsv");
const outputPath = resolve("英単語/hardcore_meaning_review_candidates.csv");

function escapeCsv(value) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  if (!/[",]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function readTsvRows() {
  const text = readFileSync(inputPath, "utf8").trim();
  if (!text) return [];

  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split("\t");
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    });
}

const rows = readTsvRows()
  .map((entry) => {
    const rawMeaning = entry.rawMeaning || entry.answerJa;
    const rawSeparators = (rawMeaning.match(/[\/、，,]/g) || []).length;
    const altMeanings = String(entry.altMeanings || "")
      .split(/\s*\/\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      word: entry.word,
      pos: entry.pos,
      meaning: entry.answerJa,
      altMeanings: altMeanings.join(" / "),
      rawMeaning,
      confidence: Number(entry.confidence || 0),
      source: entry.meaningSource || entry.source || "",
      sources: entry.sources || "",
      rawSeparators,
      needsReview:
        rawSeparators >= 4 ||
        Number(entry.confidence || 0) < 0.72 ||
        altMeanings.length >= 3
    };
  })
  .filter((entry) => entry.needsReview)
  .sort((left, right) => {
    if (left.confidence !== right.confidence) return left.confidence - right.confidence;
    if (right.rawSeparators !== left.rawSeparators) return right.rawSeparators - left.rawSeparators;
    return left.word.localeCompare(right.word);
  });

const header = ["word", "pos", "meaning", "altMeanings", "rawMeaning", "confidence", "source", "sources", "rawSeparators"];
const csv = [header, ...rows.map((row) => header.map((key) => escapeCsv(row[key])))].map((row) => row.join(",")).join("\n") + "\n";

writeFileSync(outputPath, csv, "utf8");

console.log(`Wrote ${rows.length} review candidates to ${outputPath}`);
