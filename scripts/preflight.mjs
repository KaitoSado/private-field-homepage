import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const localEnvPath = path.join(cwd, ".env.local");
const exampleEnvPath = path.join(cwd, ".env.example");

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET",
  "NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET",
  "NEXT_PUBLIC_SUPPORT_EMAIL"
];

const localEnv = fs.existsSync(localEnvPath) ? fs.readFileSync(localEnvPath, "utf8") : "";
const exampleEnv = fs.existsSync(exampleEnvPath) ? fs.readFileSync(exampleEnvPath, "utf8") : "";
const merged = `${exampleEnv}\n${localEnv}`;

const values = new Map();
for (const line of merged.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const index = trimmed.indexOf("=");
  const key = trimmed.slice(0, index);
  const value = trimmed.slice(index + 1);
  values.set(key, value);
}

const missing = requiredKeys.filter((key) => {
  const value = values.get(key);
  return !value || value.includes("your-") || value.includes("example.com") || value.includes("fieldcard.example.com");
});

if (!fs.existsSync(localEnvPath)) {
  console.error("Missing .env.local");
  console.error("Create .env.local from .env.example first.");
  process.exit(1);
}

if (missing.length) {
  console.error("Missing or placeholder values:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Preflight OK");
console.log("All required env vars are present.");
