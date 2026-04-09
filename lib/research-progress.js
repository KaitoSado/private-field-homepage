const RESEARCH_TIME_ZONE = "Asia/Tokyo";

export const RESEARCH_STATUS_OPTIONS = ["on_track", "at_risk", "blocked", "review_needed"];
export const RESEARCH_STATUS_LABELS = {
  on_track: "順調",
  at_risk: "注意",
  blocked: "停滞",
  review_needed: "要確認",
  missing: "未提出",
  unknown: "未確認"
};

export const RESEARCH_BLOCKER_TYPE_OPTIONS = [
  "none",
  "direction",
  "method",
  "analysis",
  "writing",
  "schedule",
  "motivation",
  "dependency",
  "other"
];

export const RESEARCH_BLOCKER_TYPE_LABELS = {
  none: "特になし",
  direction: "方向性",
  method: "方法",
  analysis: "分析",
  writing: "執筆",
  schedule: "時間",
  motivation: "気力",
  dependency: "依存待ち",
  other: "その他"
};

export const RESEARCH_ROLE_LABELS = {
  owner: "主催",
  member: "メンバー",
  viewer: "閲覧"
};

const STATUS_PRIORITY = {
  missing: 0,
  blocked: 1,
  at_risk: 2,
  review_needed: 3,
  on_track: 4,
  unknown: 5
};

function partsToIso(parts) {
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function getDatePartsInTimeZone(value = new Date(), timeZone = RESEARCH_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.formatToParts(date);
}

function isoToUtcDate(value) {
  const [year = "1970", month = "01", day = "01"] = `${value || ""}`.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function slugifyResearchGroupName(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function getResearchWeekStart(value = new Date()) {
  const isoToday = partsToIso(getDatePartsInTimeZone(value));
  const utcDate = isoToUtcDate(isoToday);
  const weekday = utcDate.getUTCDay();
  const diff = (weekday + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - diff);
  return utcDate.toISOString().slice(0, 10);
}

export function shiftResearchWeekStart(weekStart, deltaWeeks) {
  const utcDate = isoToUtcDate(weekStart);
  utcDate.setUTCDate(utcDate.getUTCDate() + deltaWeeks * 7);
  return utcDate.toISOString().slice(0, 10);
}

export function formatResearchWeekLabel(weekStart) {
  if (!weekStart) return "";
  const utcDate = isoToUtcDate(weekStart);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(utcDate);
}

export function compareResearchWeek(left, right) {
  return isoToUtcDate(left).getTime() - isoToUtcDate(right).getTime();
}

export function isPastResearchWeek(weekStart, referenceWeekStart = getResearchWeekStart()) {
  return compareResearchWeek(weekStart, referenceWeekStart) < 0;
}

export function getResearchStatusLabel(status) {
  return RESEARCH_STATUS_LABELS[status] || RESEARCH_STATUS_LABELS.unknown;
}

export function getResearchBlockerLabel(blockerType) {
  return RESEARCH_BLOCKER_TYPE_LABELS[blockerType] || RESEARCH_BLOCKER_TYPE_LABELS.other;
}

export function getResearchRoleLabel(role) {
  return RESEARCH_ROLE_LABELS[role] || RESEARCH_ROLE_LABELS.member;
}

export function getResearchStatusClass(status, isMissing = false) {
  const resolved = isMissing ? "missing" : status || "unknown";
  return `research-progress-status is-${resolved}`;
}

export function getResearchStatusPriority(status, isMissing = false) {
  const resolved = isMissing ? "missing" : status || "unknown";
  return STATUS_PRIORITY[resolved] ?? STATUS_PRIORITY.unknown;
}

export function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [item[key], item])).values()];
}
