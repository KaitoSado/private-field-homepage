import { execFileSync } from "node:child_process";

const taskText = process.argv.slice(2).join(" ").trim() || process.env.TASK || "";
const changedFiles = getChangedFiles();
const input = taskText.toLowerCase();

const rules = [
  {
    level: "xhigh",
    reasons: [
      match(input, ["data loss", "destructive", "security incident", "production incident", "git reset --hard", "rm -rf"]),
      match(input, ["データ消失", "破壊", "本番障害", "セキュリティ事故", "大規模リファクタ"])
    ],
    read: "CONTEXT.md, CURRENT_TASK.md, DECISIONS.md, HANDOFF.md, affected layers",
    verify: "preflight, build/test, targeted runtime checks"
  },
  {
    level: "high",
    reasons: [
      match(input, ["supabase", "schema.sql", "rls", "auth", "permission", "session", "sync", "migration", "payment"]),
      match(input, ["認証", "権限", "同期", "保存", "移行", "本番", "schema", "db", "データベース"]),
      changedFiles.some((file) => file.startsWith("supabase/") || file.includes("schema"))
    ],
    read: "CONTEXT.md, CURRENT_TASK.md, DECISIONS.md, affected route/component/lib/schema",
    verify: "npm run preflight, npm run build"
  },
  {
    level: "medium",
    reasons: [
      match(input, ["component", "route", "state", "ui", "feature", "bug", "fix", "api"]),
      match(input, ["実装", "改善", "追加", "修正", "バグ", "ui", "画面", "機能"])
    ],
    read: "relevant route/component/lib files",
    verify: "npm run build for app changes"
  },
  {
    level: "low",
    reasons: [
      match(input, ["copy", "text", "logo", "image", "css", "docs", "readme"]),
      match(input, ["文言", "ロゴ", "画像", "差し替え", "軽く", "docs", "README"])
    ],
    read: "exact target file or asset",
    verify: "targeted check; build if app shell changed"
  }
];

const selected = rules.find((rule) => rule.reasons.some(Boolean)) || {
  level: "medium",
  reasons: ["default"],
  read: "CONTEXT.md plus relevant files",
  verify: "npm run build when code changes"
};

console.log(`Reasoning route: ${selected.level}`);
console.log(`Why: ${formatReasons(selected.reasons)}`);
console.log(`Read scope: ${selected.read}`);
console.log(`Verify: ${selected.verify}`);

if (changedFiles.length) {
  console.log("Changed files:");
  for (const file of changedFiles.slice(0, 20)) {
    console.log(`- ${file}`);
  }
  if (changedFiles.length > 20) {
    console.log(`- ... ${changedFiles.length - 20} more`);
  }
}

function match(value, needles) {
  return needles.find((needle) => value.includes(needle.toLowerCase())) || "";
}

function getChangedFiles() {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^(..)\s+/, ""))
      .filter((line) => !line.startsWith(".claude/") && !line.startsWith(".codex-deploy/"));
  } catch (_error) {
    return [];
  }
}

function formatReasons(reasons) {
  const matched = reasons.filter(Boolean);
  if (!matched.length) return "default routing";
  return matched.slice(0, 3).join(", ");
}
