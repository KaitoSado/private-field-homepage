import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

printBlock("Current Task", readFile("CURRENT_TASK.md"));
printBlock("Recent Decisions", tailDecisionHeadings());
printBlock("Recent Changes", recentChangelogRows());

function readFile(file) {
  const filePath = path.join(cwd, file);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : `${file} is missing.`;
}

function tailDecisionHeadings() {
  return readFile("DECISIONS.md")
    .split("\n")
    .filter((line) => line.startsWith("### "))
    .slice(-6)
    .join("\n");
}

function recentChangelogRows() {
  return readFile("CHANGELOG.md")
    .split("\n")
    .filter((line) => line.startsWith("| 20"))
    .slice(0, 8)
    .join("\n");
}

function printBlock(title, body) {
  console.log(`\n## ${title}\n`);
  console.log(body || "(empty)");
}
