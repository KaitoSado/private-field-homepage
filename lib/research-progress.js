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

export const RESEARCH_PROJECT_TYPE_OPTIONS = ["conference_paper", "grant_first", "poster_only", "thesis_track"];
export const RESEARCH_PROJECT_TYPE_LABELS = {
  conference_paper: "学会論文",
  grant_first: "研究費先行",
  poster_only: "ポスター中心",
  thesis_track: "論文・修論"
};

export const RESEARCH_PROJECT_STAGE_ORDER = [
  "theme_definition",
  "research_plan",
  "grant_application",
  "setup_or_approval",
  "data_collection",
  "analysis",
  "poster_submission",
  "manuscript_draft",
  "paper_submission",
  "revision_or_close"
];

export const RESEARCH_PROJECT_STAGE_LABELS = {
  theme_definition: "テーマ設定",
  research_plan: "研究計画",
  grant_application: "研究費申請",
  setup_or_approval: "準備・承認",
  data_collection: "データ収集",
  analysis: "分析",
  poster_submission: "ポスター提出",
  manuscript_draft: "論文草稿",
  paper_submission: "論文投稿",
  revision_or_close: "改稿・終了"
};

export const RESEARCH_PROJECT_STAGE_SHORT_LABELS = {
  theme_definition: "テーマ",
  research_plan: "計画",
  grant_application: "研究費",
  setup_or_approval: "準備",
  data_collection: "収集",
  analysis: "分析",
  poster_submission: "ポスター",
  manuscript_draft: "草稿",
  paper_submission: "投稿",
  revision_or_close: "改稿"
};

export const RESEARCH_PROJECT_STAGE_TEMPLATES = {
  conference_paper: [
    "theme_definition",
    "research_plan",
    "setup_or_approval",
    "data_collection",
    "analysis",
    "poster_submission",
    "manuscript_draft",
    "paper_submission",
    "revision_or_close"
  ],
  grant_first: [
    "theme_definition",
    "research_plan",
    "grant_application",
    "setup_or_approval",
    "data_collection",
    "analysis",
    "manuscript_draft",
    "paper_submission",
    "revision_or_close"
  ],
  poster_only: [
    "theme_definition",
    "research_plan",
    "setup_or_approval",
    "data_collection",
    "analysis",
    "poster_submission",
    "revision_or_close"
  ],
  thesis_track: [
    "theme_definition",
    "research_plan",
    "setup_or_approval",
    "data_collection",
    "analysis",
    "manuscript_draft",
    "paper_submission",
    "revision_or_close"
  ]
};

export const RESEARCH_PROJECT_PROGRESS_OPTIONS = [0, 25, 50, 75, 100];
export const RESEARCH_PROJECT_RISK_OPTIONS = ["on_track", "at_risk", "blocked", "needs_decision"];
export const RESEARCH_PROJECT_RISK_LABELS = {
  on_track: "順調",
  at_risk: "注意",
  blocked: "停滞",
  needs_decision: "判断待ち"
};

const STATUS_PRIORITY = {
  missing: 0,
  blocked: 1,
  at_risk: 2,
  review_needed: 3,
  on_track: 4,
  unknown: 5
};

const PROJECT_RISK_PRIORITY = {
  blocked: 0,
  needs_decision: 1,
  at_risk: 2,
  on_track: 3
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

export function getResearchProjectTypeLabel(projectType) {
  return RESEARCH_PROJECT_TYPE_LABELS[projectType] || RESEARCH_PROJECT_TYPE_LABELS.conference_paper;
}

export function getResearchProjectStages(projectType) {
  return RESEARCH_PROJECT_STAGE_TEMPLATES[projectType] || RESEARCH_PROJECT_STAGE_TEMPLATES.conference_paper;
}

export function getResearchProjectStageLabel(stageKey) {
  return RESEARCH_PROJECT_STAGE_LABELS[stageKey] || RESEARCH_PROJECT_STAGE_LABELS.theme_definition;
}

export function getResearchProjectStageShortLabel(stageKey) {
  return RESEARCH_PROJECT_STAGE_SHORT_LABELS[stageKey] || getResearchProjectStageLabel(stageKey);
}

export function getResearchProjectRiskLabel(riskLevel) {
  return RESEARCH_PROJECT_RISK_LABELS[riskLevel] || RESEARCH_PROJECT_RISK_LABELS.on_track;
}

export function getResearchProjectRiskClass(riskLevel) {
  const resolved = riskLevel || "on_track";
  return `research-progress-status is-risk-${resolved}`;
}

export function getResearchStatusClass(status, isMissing = false) {
  const resolved = isMissing ? "missing" : status || "unknown";
  return `research-progress-status is-${resolved}`;
}

export function getResearchStatusPriority(status, isMissing = false) {
  const resolved = isMissing ? "missing" : status || "unknown";
  return STATUS_PRIORITY[resolved] ?? STATUS_PRIORITY.unknown;
}

export function getResearchProjectRiskPriority(riskLevel) {
  const resolved = riskLevel || "on_track";
  return PROJECT_RISK_PRIORITY[resolved] ?? PROJECT_RISK_PRIORITY.on_track;
}

export function getResearchProjectOverallProgress(projectType, currentStage, stageProgress = 0) {
  const stages = getResearchProjectStages(projectType);
  if (!stages.length) return 0;

  const stageIndex = Math.max(stages.indexOf(currentStage), 0);
  const normalizedProgress = RESEARCH_PROJECT_PROGRESS_OPTIONS.includes(Number(stageProgress))
    ? Number(stageProgress)
    : 0;
  const completed = stageIndex + normalizedProgress / 100;
  return Math.max(0, Math.min(100, Math.round((completed / stages.length) * 100)));
}

export function getResearchProjectStageTrack(projectType, currentStage) {
  const applicableStages = getResearchProjectStages(projectType);
  const currentIndex = applicableStages.indexOf(currentStage);

  return RESEARCH_PROJECT_STAGE_ORDER.map((stageKey) => {
    if (!applicableStages.includes(stageKey)) {
      return {
        key: stageKey,
        label: getResearchProjectStageLabel(stageKey),
        shortLabel: getResearchProjectStageShortLabel(stageKey),
        state: "inactive"
      };
    }

    const stageIndex = applicableStages.indexOf(stageKey);
    let state = "upcoming";
    if (currentIndex >= 0 && stageIndex < currentIndex) state = "complete";
    if (currentIndex >= 0 && stageIndex === currentIndex) state = "current";

    return {
      key: stageKey,
      label: getResearchProjectStageLabel(stageKey),
      shortLabel: getResearchProjectStageShortLabel(stageKey),
      state
    };
  });
}

export function isResearchDueSoon(dateValue, days = 14) {
  if (!dateValue) return false;
  const target = isoToUtcDate(dateValue);
  const today = isoToUtcDate(partsToIso(getDatePartsInTimeZone(new Date())));
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= days;
}

export function isResearchOverdue(dateValue) {
  if (!dateValue) return false;
  const target = isoToUtcDate(dateValue);
  const today = isoToUtcDate(partsToIso(getDatePartsInTimeZone(new Date())));
  return target.getTime() < today.getTime();
}

export function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [item[key], item])).values()];
}
