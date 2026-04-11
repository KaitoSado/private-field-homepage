import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET",
  "NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET",
  "NEXT_PUBLIC_SUPPORT_EMAIL"
];

const requiredDocs = [
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "CURRENT_TASK.md",
  "DECISIONS.md",
  "HANDOFF.md",
  "CHANGELOG.md"
];

const warnings = [];

checkRequiredDocs();
checkLogsPolicy();
checkEnv();
checkGitState();
checkSchemaCompanions();

if (warnings.length) {
  console.warn("Preflight warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

console.log("Preflight OK");
console.log("Required env vars and agent operation files are present.");

function checkRequiredDocs() {
  const missingDocs = requiredDocs.filter((file) => !fs.existsSync(path.join(cwd, file)));
  if (missingDocs.length) {
    fail("Missing required operation files:", missingDocs);
  }
}

function checkLogsPolicy() {
  const gitignorePath = path.join(cwd, ".gitignore");
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";

  if (!fs.existsSync(path.join(cwd, "logs"))) {
    warnings.push("logs/ does not exist. Create it for local harness output.");
  }

  if (!gitignore.includes("logs/*")) {
    warnings.push("logs/ is not ignored. Runtime logs should stay out of commits.");
  }
}

function checkEnv() {
  const localEnvPath = path.join(cwd, ".env.local");
  const exampleEnvPath = path.join(cwd, ".env.example");
  const localEnv = fs.existsSync(localEnvPath) ? fs.readFileSync(localEnvPath, "utf8") : "";
  const exampleEnv = fs.existsSync(exampleEnvPath) ? fs.readFileSync(exampleEnvPath, "utf8") : "";
  const merged = `${exampleEnv}\n${localEnv}`;
  const values = new Map();

  for (const line of merged.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    values.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }

  if (!fs.existsSync(localEnvPath)) {
    fail("Missing .env.local", ["Create .env.local from .env.example first."]);
  }

  const missing = requiredEnvKeys.filter((key) => {
    const value = values.get(key);
    return !value || value.includes("your-") || value.includes("example.com") || value.includes("fieldcard.example.com");
  });

  if (missing.length) {
    fail("Missing or placeholder env values:", missing);
  }
}

function checkGitState() {
  const status = runGit(["status", "--porcelain"]);
  if (!status) return;

  const lines = status.split("\n").filter(Boolean);
  const untracked = lines.filter((line) => line.startsWith("??")).length;
  const tracked = lines.length - untracked;

  if (tracked) {
    warnings.push(`${tracked} tracked file(s) have local changes. Review before commit/push.`);
  }

  if (untracked) {
    warnings.push(`${untracked} untracked item(s) exist. Stage explicitly; avoid git add . unless intentional.`);
  }
}

function checkSchemaCompanions() {
  const changedFiles = new Set([
    ...splitLines(runGit(["diff", "--name-only"])),
    ...splitLines(runGit(["diff", "--cached", "--name-only"]))
  ]);

  if (!changedFiles.has("supabase/schema.sql")) return;

  if (!changedFiles.has("supabase/README.md")) {
    warnings.push("supabase/schema.sql changed without supabase/README.md. Note live DB apply requirements if needed.");
  }

  if (!changedFiles.has("CHANGELOG.md")) {
    warnings.push("supabase/schema.sql changed without CHANGELOG.md. Add a DB change record.");
  }
}

function runGit(args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch (_error) {
    warnings.push(`git ${args.join(" ")} failed. Skipping that check.`);
    return "";
  }
}

function splitLines(value) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function fail(message, items) {
  console.error(message);
  for (const item of items) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}
