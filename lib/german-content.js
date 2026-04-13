import { GERMAN_VOCABULARY_LIBRARY } from "./german-vocabulary";

const DAY = 24 * 60 * 60 * 1000;

export { GERMAN_VOCABULARY_LIBRARY };

export const DEFAULT_GERMAN_REVIEW_DAY_OFFSETS = [0, 3, 7, 14, 30];

export const GERMAN_MODE_TABS = [
  { id: "study", label: "単語" },
  { id: "history", label: "見直しリスト" },
  { id: "memory", label: "長期記憶リスト" }
];

export const GERMAN_POS_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "noun", label: "名詞" },
  { id: "verb", label: "動詞" },
  { id: "auxiliary", label: "助動詞" },
  { id: "adjective", label: "形容詞" },
  { id: "adverb", label: "副詞" },
  { id: "preposition", label: "前置詞" },
  { id: "conjunction", label: "接続詞" },
  { id: "pronoun", label: "代名詞" },
  { id: "interjection", label: "間投詞" }
];

const DEFAULT_PROGRESS = {
  stage: "new",
  seenCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  reviewCount: 0,
  reviewStep: 0,
  lastSeenAt: 0,
  nextReviewAt: 0,
  longTermAt: 0
};

export function createEmptyGermanProgress() {
  return {};
}

export function getGermanProgressForId(progressMap, id) {
  return {
    ...DEFAULT_PROGRESS,
    ...(progressMap && progressMap[id] ? progressMap[id] : {})
  };
}

export function isGermanLongTermProgress(progress) {
  return Boolean(progress?.longTermAt);
}

export function normalizeGermanReviewDayOffsets(offsets) {
  const source = Array.isArray(offsets) && offsets.length ? offsets : DEFAULT_GERMAN_REVIEW_DAY_OFFSETS;
  const normalized = source.slice(0, 5).map((day, index) => {
    const numeric = Number(day);
    if (index === 0) return 0;
    if (!Number.isFinite(numeric)) return DEFAULT_GERMAN_REVIEW_DAY_OFFSETS[index] || 0;
    return Math.max(0, Math.min(365, Math.round(numeric)));
  });

  while (normalized.length < 5) {
    normalized.push(DEFAULT_GERMAN_REVIEW_DAY_OFFSETS[normalized.length] || 0);
  }

  return normalized;
}

export function getGermanReviewStepLabel(step, reviewDayOffsets = DEFAULT_GERMAN_REVIEW_DAY_OFFSETS) {
  const offsets = normalizeGermanReviewDayOffsets(reviewDayOffsets);
  const safeStep = Math.max(0, Math.min(offsets.length - 1, Number(step) || 0));
  const day = offsets[safeStep];
  return day === 0 ? "当日" : `${day}日後`;
}

export function getGermanPosLabel(pos) {
  switch (pos) {
    case "noun":
      return "名詞";
    case "verb":
      return "動詞";
    case "auxiliary":
      return "助動詞";
    case "adjective":
      return "形容詞";
    case "adverb":
      return "副詞";
    case "preposition":
      return "前置詞";
    case "conjunction":
      return "接続詞";
    case "pronoun":
      return "代名詞";
    case "interjection":
      return "間投詞";
    default:
      return "その他";
  }
}

export function matchesGermanPosFilter(entry, posFilter) {
  if (!posFilter || posFilter === "all") return true;
  return entry.pos === posFilter;
}

export function getGermanRecommendedIds(progressMap, { posFilter = "all", seed = 0, now = Date.now() } = {}) {
  return GERMAN_VOCABULARY_LIBRARY
    .filter((entry) => {
      if (!matchesGermanPosFilter(entry, posFilter)) return false;
      const progress = getGermanProgressForId(progressMap, entry.id);
      if (isGermanLongTermProgress(progress)) return false;
      if (progress.incorrectCount > 0 && progress.nextReviewAt > now) return false;
      return true;
    })
    .map((entry) => {
      const progress = getGermanProgressForId(progressMap, entry.id);
      const dueScore = progress.incorrectCount > 0 ? 0 : 1;
      const stepScore = progress.reviewStep;
      return {
        id: entry.id,
        dueScore,
        stepScore,
        randomScore: seededNumber(`${seed}:${entry.id}:${progress.seenCount}:${progress.reviewCount}`)
      };
    })
    .sort((left, right) => {
      if (left.dueScore !== right.dueScore) return left.dueScore - right.dueScore;
      if (left.stepScore !== right.stepScore) return left.stepScore - right.stepScore;
      return left.randomScore - right.randomScore;
    })
    .map((entry) => entry.id);
}

export function recordGermanStudyAttempt(progressMap, entry, wasCorrect, now, reviewDayOffsets = DEFAULT_GERMAN_REVIEW_DAY_OFFSETS) {
  const offsets = normalizeGermanReviewDayOffsets(reviewDayOffsets);
  const current = getGermanProgressForId(progressMap, entry.id);
  const lastStep = offsets.length - 1;
  const hadAnyMiss = current.incorrectCount > 0;
  const isFirstAttempt = current.seenCount === 0 && current.correctCount === 0 && current.incorrectCount === 0;

  const next = {
    ...current,
    seenCount: current.seenCount + 1,
    lastSeenAt: now
  };

  if (wasCorrect) {
    next.correctCount += 1;

    if (isFirstAttempt && !hadAnyMiss) {
      next.stage = "solid";
      next.longTermAt = now;
      next.nextReviewAt = 0;
      next.reviewStep = lastStep;
    } else if (current.reviewStep >= lastStep) {
      next.stage = "solid";
      next.longTermAt = now;
      next.nextReviewAt = 0;
    } else {
      const nextStep = Math.min(lastStep, current.reviewStep + 1);
      next.stage = "reviewing";
      next.reviewStep = nextStep;
      next.reviewCount += 1;
      next.nextReviewAt = now + offsets[nextStep] * DAY;
    }
  } else {
    const stayStep = Math.max(0, Math.min(lastStep, current.reviewStep));
    next.stage = "reviewing";
    next.incorrectCount += 1;
    next.reviewCount += 1;
    next.reviewStep = stayStep;
    next.longTermAt = 0;
    next.nextReviewAt = now + offsets[stayStep] * DAY;
  }

  return {
    ...progressMap,
    [entry.id]: next
  };
}

export function compactGermanProgressMap(progressMap) {
  if (!progressMap || typeof progressMap !== "object") return {};

  const validIds = new Set(GERMAN_VOCABULARY_LIBRARY.map((entry) => entry.id));
  const compacted = {};

  for (const [id, progress] of Object.entries(progressMap)) {
    if (!validIds.has(id) || !progress || typeof progress !== "object") continue;
    compacted[id] = {
      ...DEFAULT_PROGRESS,
      ...progress
    };
  }

  return compacted;
}

export function mergeGermanSyncedProgressMaps(left = {}, right = {}) {
  const merged = {};
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);

  for (const key of keys) {
    const leftProgress = getGermanProgressForId(left, key);
    const rightProgress = getGermanProgressForId(right, key);
    const leftTouched = Math.max(leftProgress.lastSeenAt || 0, leftProgress.longTermAt || 0);
    const rightTouched = Math.max(rightProgress.lastSeenAt || 0, rightProgress.longTermAt || 0);
    merged[key] = rightTouched > leftTouched ? rightProgress : leftProgress;
  }

  return compactGermanProgressMap(merged);
}

function seededNumber(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
