import deckManifest from "./english-deck-manifest.json";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ENGLISH_REVIEW_STEPS = [
  { delayMs: 0, label: "当日" },
  { delayMs: 3 * DAY, label: "3日後" },
  { delayMs: 7 * DAY, label: "7日後" },
  { delayMs: 14 * DAY, label: "14日後" },
  { delayMs: 30 * DAY, label: "30日後" }
];
const ENGLISH_FILTERED_POS_IDS = new Set(["noun", "verb", "adjective", "adverb", "phrase"]);
const ENGLISH_DECK_BASE_OPTIONS = [
  {
    id: "basic",
    label: "必須単語",
    shortLabel: "必須単語",
    description: "大学受験の基本語彙を固める",
    status: "active"
  },
  {
    id: "hardcore",
    label: "単語ガチ勢",
    shortLabel: "単語ガチ勢",
    description: "主要単語帳・熟語・英検1級語彙を横断して浴びる",
    status: "active"
  }
];
const ENGLISH_DECK_MANIFEST = deckManifest?.decks || {};

export const DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS = [0, 3, 7, 14, 30];
export const ENGLISH_MODE_TABS = [
  { id: "study", label: "単語" },
  { id: "history", label: "見直しリスト" },
  { id: "memory", label: "長期記憶リスト" }
];
export const ENGLISH_TOPIC_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "campus", label: "大学" },
  { id: "science", label: "科学" },
  { id: "work", label: "仕事" },
  { id: "social", label: "会話" },
  { id: "media", label: "ニュース" },
  { id: "travel", label: "移動" }
];
export const ENGLISH_POS_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "noun", label: "名詞" },
  { id: "verb", label: "動詞" },
  { id: "adjective", label: "形容詞" },
  { id: "adverb", label: "副詞" },
  { id: "phrase", label: "熟語" },
  { id: "other", label: "その他" }
];
export const ENGLISH_DECK_OPTIONS = ENGLISH_DECK_BASE_OPTIONS.map((deck) => {
  const manifestEntry = ENGLISH_DECK_MANIFEST[deck.id] || {};
  const count = Number(manifestEntry.count) || 0;

  return {
    ...deck,
    count,
    summary: count ? `${count}セット` : "—"
  };
});
export const ENGLISH_DEFAULT_DECK_ID = ENGLISH_DECK_OPTIONS.find((deck) => deck.status === "active")?.id || "basic";
export const ENGLISH_DEFAULT_CHUNK_ID =
  ENGLISH_DECK_MANIFEST[ENGLISH_DEFAULT_DECK_ID]?.firstChunkId || "english-empty";
export const EMPTY_ENGLISH_CHUNK = {
  id: "english-empty",
  headword: "loading",
  coreChunk: "loading",
  meaning: "",
  nuance: "",
  grammarNote: "",
  relatedChunks: [],
  starterExamples: [
    {
      topic: "all",
      text: "",
      cloze: "",
      ja: ""
    }
  ],
  diverseExamples: [],
  shadowPrompts: [""],
  family: "english-empty",
  pos: "other",
  unit: "placeholder",
  order: 0,
  deckId: ENGLISH_DEFAULT_DECK_ID,
  variants: []
};

export async function loadEnglishDeckLibrary(deckId) {
  const manifestEntry = ENGLISH_DECK_MANIFEST[deckId] || {};
  const response = await fetch(manifestEntry.path || `/english-decks/${deckId}.json`, {
    cache: "force-cache"
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${deckId} deck: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected deck payload for ${deckId}`);
  }

  return data;
}

export function getEnglishChunksForDeck(deckLibraries, deckId = ENGLISH_DEFAULT_DECK_ID) {
  return deckLibraries?.[deckId] || [];
}

export function buildEnglishChunkMap(chunkLibrary = []) {
  return Object.fromEntries(chunkLibrary.map((chunk) => [chunk.id, chunk]));
}

export function buildEnglishVariantToChunkIdMap(chunkLibrary = []) {
  const map = new Map();

  for (const chunk of chunkLibrary) {
    map.set(chunk.id, chunk.id);
    for (const variant of getChunkVariants(chunk)) {
      map.set(variant.id, chunk.id);
    }
  }

  return map;
}

export function getEnglishFamilyMembers(chunkMap, chunkId, { includeSelf = false, currentVariantId = "" } = {}) {
  const chunk = chunkMap?.[chunkId];
  if (!chunk) return [];

  const familyMembers = getChunkVariants(chunk);
  const excludedId = currentVariantId || chunk.id;

  return familyMembers
    .filter((member) => includeSelf || member.id !== excludedId)
    .sort((left, right) => {
      if ((left.order || 0) !== (right.order || 0)) return (left.order || 0) - (right.order || 0);
      return left.headword.localeCompare(right.headword);
    });
}

export function getEnglishDisplayVariant(chunk, { posFilter = "all", seed = 0 } = {}) {
  const variants = getChunkVariants(chunk);
  const matchedVariants = variants.filter((variant) => hasMatchingPosValue(variant, posFilter));
  const source = matchedVariants.length ? matchedVariants : variants;
  const [variant] = deterministicShuffle(source, `display:${seed}:${posFilter}`);

  return {
    ...chunk,
    ...variant,
    id: chunk.id,
    variantId: variant.id,
    variants,
    variantCount: variants.length
  };
}

function createEmptyEnglishChunkProgress() {
  return {
    stage: "new",
    seenCount: 0,
    shadowCount: 0,
    reviewCount: 0,
    reviewStep: 0,
    correctCount: 0,
    incorrectCount: 0,
    streak: 0,
    ease: 2.3,
    nextReviewAt: 0,
    longTermAt: 0,
    lastSeenAt: 0,
    lastShadowAt: 0,
    contextsSeen: [],
    notesTone: "gentle"
  };
}

export function createEmptyEnglishProgress() {
  return {};
}

export function getEnglishProgressForId(progressMap, chunkId) {
  return {
    ...createEmptyEnglishChunkProgress(),
    ...(progressMap?.[chunkId] || {})
  };
}

export function compactEnglishProgressMap(progressMap, variantToChunkIdMap = new Map()) {
  const mergedProgress = new Map();

  for (const [rawChunkId, progress] of Object.entries(progressMap || {})) {
    const chunkId = variantToChunkIdMap.get(rawChunkId) || rawChunkId;
    const normalizedProgress = normalizeEnglishProgress(progress);
    const currentProgress = mergedProgress.get(chunkId);
    mergedProgress.set(chunkId, mergeEnglishProgress(currentProgress, normalizedProgress));
  }

  return Object.fromEntries([...mergedProgress.entries()].filter(([, progress]) => hasMeaningfulProgress(progress)));
}

export function mergeEnglishSyncedProgressMaps(variantToChunkIdMap, ...progressMaps) {
  const mergedProgress = new Map();

  for (const progressMap of progressMaps) {
    for (const [chunkId, progress] of Object.entries(compactEnglishProgressMap(progressMap, variantToChunkIdMap))) {
      const currentProgress = mergedProgress.get(chunkId);
      if (!currentProgress || getProgressRecency(progress) >= getProgressRecency(currentProgress)) {
        mergedProgress.set(chunkId, progress);
      }
    }
  }

  return Object.fromEntries([...mergedProgress.entries()].filter(([, progress]) => hasMeaningfulProgress(progress)));
}

export function getEnglishRecommendedChunkIds(progressMap, chunkLibrary = [], focusTopic = "all", options = {}) {
  const { now = Date.now(), posFilter = "all", seed = 0 } = options;
  const usedIds = new Set();
  const source = chunkLibrary.filter((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return hasMatchingPos(chunk, posFilter) && !isEnglishLongTermProgress(progress);
  });

  const bucket = (predicate, bucketSeed) => deterministicShuffle(
    source.filter((chunk) => {
      if (usedIds.has(chunk.id) || !predicate(chunk)) return false;
      usedIds.add(chunk.id);
      return true;
    }),
    `${seed}:${bucketSeed}`
  );

  const dueWrong = bucket((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return progress.incorrectCount > 0 && progress.nextReviewAt > 0 && progress.nextReviewAt <= now;
  }, "due-wrong");

  const newWords = bucket((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return progress.seenCount === 0;
  }, "new");

  const struggling = bucket((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return progress.incorrectCount > 0 && progress.nextReviewAt > 0 && progress.nextReviewAt <= now;
  }, "struggling");

  const rest = bucket((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return progress.incorrectCount === 0 || !progress.nextReviewAt || progress.nextReviewAt <= now;
  }, `rest:${focusTopic}`);

  return [...dueWrong, ...newWords, ...struggling, ...rest].map((chunk) => chunk.id);
}

export function getExamplesForFocus(chunk, focusTopic = "all") {
  if (focusTopic === "all") return chunk.diverseExamples || [];
  const diverseExamples = chunk.diverseExamples || [];
  const matched = diverseExamples.filter((example) => example.topic === focusTopic);
  const rest = diverseExamples.filter((example) => example.topic !== focusTopic);
  return [...matched, ...rest];
}

export function markShadowComplete(progressMap, chunk, topic, durationMs, now = Date.now(), reviewDayOffsets = DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS) {
  const current = getEnglishProgressForId(progressMap, chunk.id);
  const reviewStep = clampReviewStep(current.reviewStep);
  const nextReviewAt = current.nextReviewAt && current.nextReviewAt > now
    ? current.nextReviewAt
    : now + getReviewIntervalMs(reviewStep, reviewDayOffsets);

  return {
    ...progressMap,
    [chunk.id]: {
      ...current,
      stage: current.stage === "new" ? "learning" : current.stage,
      reviewStep,
      shadowCount: current.shadowCount + 1,
      lastShadowAt: now,
      lastSeenAt: now,
      nextReviewAt,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), topic].filter(Boolean)),
      lastShadowDurationMs: durationMs
    }
  };
}

export function recordStudyAttempt(progressMap, chunk, wasCorrect, topic, now = Date.now(), reviewDayOffsets = DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS) {
  const current = getEnglishProgressForId(progressMap, chunk.id);
  const nextState = getNextReviewState(current, wasCorrect, now, reviewDayOffsets);

  return {
    ...progressMap,
    [chunk.id]: {
      ...current,
      stage: nextState.stage,
      seenCount: current.seenCount + 1,
      reviewCount: current.reviewCount + 1,
      reviewStep: nextState.reviewStep,
      correctCount: current.correctCount + (wasCorrect ? 1 : 0),
      incorrectCount: current.incorrectCount + (wasCorrect ? 0 : 1),
      streak: wasCorrect ? current.streak + 1 : 0,
      ease: current.ease,
      nextReviewAt: nextState.nextReviewAt,
      longTermAt: nextState.longTermAt || 0,
      lastSeenAt: now,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), topic].filter(Boolean))
    }
  };
}

export function getEnglishReviewStepLabel(reviewStep = 0, reviewDayOffsets = DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS) {
  return formatReviewDayOffset(normalizeEnglishReviewDayOffsets(reviewDayOffsets)[clampReviewStep(reviewStep)]);
}

export function normalizeEnglishReviewDayOffsets(reviewDayOffsets) {
  if (!Array.isArray(reviewDayOffsets)) return DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS;

  const normalized = reviewDayOffsets
    .slice(0, ENGLISH_REVIEW_STEPS.length)
    .map((value) => Math.max(0, Math.min(365, Math.round(Number(value) || 0))));

  while (normalized.length < ENGLISH_REVIEW_STEPS.length) {
    normalized.push(DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS[normalized.length]);
  }

  normalized[0] = 0;
  return normalized;
}

export function isEnglishLongTermProgress(progress) {
  return Boolean(progress?.longTermAt || progress?.memorizedAt || progress?.stage === "solid");
}

function hasMatchingPos(chunk, posFilter) {
  const variants = getChunkVariants(chunk);
  return variants.some((variant) => hasMatchingPosValue(variant, posFilter));
}

function getChunkVariants(chunk) {
  return [chunk, ...(chunk.variants || [])];
}

function hasMatchingPosValue(item, posFilter) {
  if (posFilter === "all") return true;
  if (posFilter === "other") return !ENGLISH_FILTERED_POS_IDS.has(item.pos);
  return item.pos === posFilter;
}

function getNextReviewState(current, wasCorrect, now, reviewDayOffsets = DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS) {
  const currentStep = clampReviewStep(current.reviewStep);
  const isNewItem = current.stage === "new" || current.seenCount === 0;
  const isDue = !current.nextReviewAt || current.nextReviewAt <= now;
  const finalStep = ENGLISH_REVIEW_STEPS.length - 1;
  const normalizedReviewDayOffsets = normalizeEnglishReviewDayOffsets(reviewDayOffsets);

  if (isEnglishLongTermProgress(current)) {
    return {
      reviewStep: finalStep,
      nextReviewAt: 0,
      stage: "solid",
      longTermAt: current.longTermAt || now
    };
  }

  if (isNewItem) {
    if (wasCorrect) {
      return {
        reviewStep: finalStep,
        nextReviewAt: 0,
        stage: "solid",
        longTermAt: now
      };
    }

    const reviewStep = 0;
    return {
      reviewStep,
      nextReviewAt: now + getReviewIntervalMs(reviewStep, normalizedReviewDayOffsets),
      stage: getStageFromReviewStep(reviewStep),
      longTermAt: 0
    };
  }

  if (!wasCorrect) {
    return {
      reviewStep: currentStep,
      nextReviewAt: now + getReviewIntervalMs(currentStep, normalizedReviewDayOffsets),
      stage: getStageFromReviewStep(currentStep),
      longTermAt: 0
    };
  }

  if (!isDue) {
    return {
      reviewStep: currentStep,
      nextReviewAt: current.nextReviewAt,
      stage: getStageFromReviewStep(currentStep),
      longTermAt: 0
    };
  }

  if (currentStep >= finalStep) {
    return {
      reviewStep: finalStep,
      nextReviewAt: 0,
      stage: "solid",
      longTermAt: now
    };
  }

  const reviewStep = Math.min(currentStep + 1, finalStep);
  return {
    reviewStep,
    nextReviewAt: now + getReviewIntervalMs(reviewStep, normalizedReviewDayOffsets),
    stage: getStageFromReviewStep(reviewStep),
    longTermAt: 0
  };
}

function getReviewIntervalMs(reviewStep, reviewDayOffsets = DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS) {
  const normalizedReviewDayOffsets = normalizeEnglishReviewDayOffsets(reviewDayOffsets);
  return normalizedReviewDayOffsets[clampReviewStep(reviewStep)] * DAY;
}

function getStageFromReviewStep(reviewStep) {
  if (reviewStep <= 0) return "learning";
  return "reviewing";
}

function uniqueStrings(items) {
  return [...new Set(items)];
}

function deterministicShuffle(items, seed) {
  return [...items].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left.id}`);
    const rightHash = hashString(`${seed}:${right.id}`);
    if (leftHash !== rightHash) return leftHash - rightHash;
    return (left.order || 0) - (right.order || 0);
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hasMeaningfulProgress(progress) {
  if (!progress) return false;
  return Boolean(
    progress.seenCount ||
    progress.shadowCount ||
    progress.reviewCount ||
    progress.correctCount ||
    progress.incorrectCount ||
    progress.streak ||
    progress.nextReviewAt ||
    progress.longTermAt ||
    progress.memorizedAt ||
    progress.lastSeenAt ||
    progress.lastShadowAt ||
    progress.lastShadowDurationMs ||
    (progress.contextsSeen && progress.contextsSeen.length) ||
    (progress.stage && progress.stage !== "new") ||
    (progress.reviewStep && progress.reviewStep > 0)
  );
}

function normalizeEnglishProgress(progress) {
  if (!progress) return progress;

  const alreadyLongTerm = isEnglishLongTermProgress(progress);
  const firstRoundCorrectOnly = progress.correctCount > 0 && !progress.incorrectCount;

  if (!alreadyLongTerm && firstRoundCorrectOnly) {
    return {
      ...progress,
      stage: "solid",
      reviewStep: ENGLISH_REVIEW_STEPS.length - 1,
      nextReviewAt: 0,
      longTermAt: progress.lastSeenAt || progress.memorizedAt || Date.now()
    };
  }

  if (progress.stage === "solid" && !progress.longTermAt) {
    return {
      ...progress,
      reviewStep: ENGLISH_REVIEW_STEPS.length - 1,
      nextReviewAt: 0,
      longTermAt: progress.memorizedAt || progress.lastSeenAt || Date.now()
    };
  }

  return progress;
}

function mergeEnglishProgress(current, next) {
  if (!current) return next;

  const correctCount = (current.correctCount || 0) + (next.correctCount || 0);
  const incorrectCount = (current.incorrectCount || 0) + (next.incorrectCount || 0);
  const longTermAt = incorrectCount
    ? 0
    : Math.max(current.longTermAt || current.memorizedAt || 0, next.longTermAt || next.memorizedAt || 0);
  const reviewStep = longTermAt
    ? ENGLISH_REVIEW_STEPS.length - 1
    : Math.max(clampReviewStep(current.reviewStep), clampReviewStep(next.reviewStep));

  return {
    ...current,
    ...next,
    stage: longTermAt ? "solid" : getStageFromReviewStep(reviewStep),
    seenCount: (current.seenCount || 0) + (next.seenCount || 0),
    shadowCount: (current.shadowCount || 0) + (next.shadowCount || 0),
    reviewCount: (current.reviewCount || 0) + (next.reviewCount || 0),
    reviewStep,
    correctCount,
    incorrectCount,
    streak: Math.max(current.streak || 0, next.streak || 0),
    nextReviewAt: longTermAt ? 0 : minPositiveTimestamp(current.nextReviewAt, next.nextReviewAt),
    longTermAt,
    lastSeenAt: Math.max(current.lastSeenAt || 0, next.lastSeenAt || 0),
    lastShadowAt: Math.max(current.lastShadowAt || 0, next.lastShadowAt || 0),
    contextsSeen: uniqueStrings([...(current.contextsSeen || []), ...(next.contextsSeen || [])])
  };
}

function minPositiveTimestamp(left, right) {
  const values = [left, right].filter((value) => value > 0);
  return values.length ? Math.min(...values) : 0;
}

function getProgressRecency(progress) {
  return Math.max(
    progress?.longTermAt || 0,
    progress?.memorizedAt || 0,
    progress?.lastSeenAt || 0,
    progress?.lastShadowAt || 0,
    progress?.nextReviewAt || 0
  );
}

function formatReviewDayOffset(dayOffset) {
  if (dayOffset <= 0) return "当日";
  if (dayOffset === 1) return "翌日";
  return `${dayOffset}日後`;
}

function clampReviewStep(value) {
  return Math.max(0, Math.min(ENGLISH_REVIEW_STEPS.length - 1, value || 0));
}
