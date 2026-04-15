import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const deckOutputDir = resolve("public/english-decks");
const manifestPath = resolve("lib/english-deck-manifest.json");

function getEnglishFamilyKey(chunk) {
  return chunk.family || chunk.headword || chunk.id;
}

function toVariantRecord(variant) {
  return {
    id: variant.id,
    headword: variant.headword,
    coreChunk: variant.coreChunk,
    meaning: variant.meaning,
    meaningAlternates: variant.meaningAlternates,
    meaningRaw: variant.meaningRaw,
    meaningCore: variant.meaningCore,
    meaningConfidence: variant.meaningConfidence,
    meaningSource: variant.meaningSource,
    nuance: variant.nuance,
    grammarNote: variant.grammarNote,
    starterExamples: variant.starterExamples,
    diverseExamples: variant.diverseExamples,
    shadowPrompts: variant.shadowPrompts,
    pos: variant.pos,
    unit: variant.unit,
    order: variant.order
  };
}

export function buildEnglishFamilyCards(items) {
  const familyMap = items.reduce((map, item) => {
    const familyKey = getEnglishFamilyKey(item);
    const current = map.get(familyKey) || [];
    map.set(familyKey, [...current, item]);
    return map;
  }, new Map());

  return [...familyMap.entries()]
    .map(([familyKey, variants]) => {
      const sortedVariants = [...variants].sort((left, right) => {
        if ((left.order || 0) !== (right.order || 0)) return (left.order || 0) - (right.order || 0);
        return left.headword.localeCompare(right.headword);
      });
      const primary = sortedVariants[0];
      const secondaryVariants = sortedVariants.slice(1).map(toVariantRecord);

      return {
        ...primary,
        id: primary.id,
        family: familyKey,
        variants: secondaryVariants,
        variantIds: sortedVariants.map((variant) => variant.id),
        variantCount: sortedVariants.length,
        relatedChunks: secondaryVariants.map((variant) => variant.headword)
      };
    })
    .sort((left, right) => {
      if ((left.order || 0) !== (right.order || 0)) return (left.order || 0) - (right.order || 0);
      return left.headword.localeCompare(right.headword);
    });
}

function readDeckManifest() {
  if (!existsSync(manifestPath)) {
    return { generatedAt: "", decks: {} };
  }

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    return {
      generatedAt: parsed.generatedAt || "",
      decks: parsed.decks || {}
    };
  } catch {
    return { generatedAt: "", decks: {} };
  }
}

function writeDeckManifest(manifest) {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function writeEnglishDeckArtifacts({ deckId, entries }) {
  const chunkLibrary = buildEnglishFamilyCards(entries.map((entry) => ({ ...entry, deckId })));
  const outputPath = resolve(deckOutputDir, `${deckId}.json`);

  mkdirSync(deckOutputDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(chunkLibrary), "utf8");

  const manifest = readDeckManifest();
  manifest.generatedAt = new Date().toISOString();
  manifest.decks = {
    ...manifest.decks,
    [deckId]: {
      count: chunkLibrary.length,
      firstChunkId: chunkLibrary[0]?.id || "",
      path: `/english-decks/${deckId}.json`
    }
  };
  writeDeckManifest(manifest);

  return {
    chunkLibrary,
    outputPath,
    manifestPath
  };
}
