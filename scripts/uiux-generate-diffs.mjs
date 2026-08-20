import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = path.resolve(process.argv[2] || "artifacts/uiux/runtime");
const beforeRoot = path.join(root, "before");
const afterRoot = path.join(root, "after");
const diffRoot = path.join(root, "diff");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".png")) files.push(fullPath);
  }
  return files;
}

const afterFiles = await walk(afterRoot);
const results = [];

for (const afterPath of afterFiles) {
  const relative = path.relative(afterRoot, afterPath);
  const beforePath = path.join(beforeRoot, relative);
  const diffPath = path.join(diffRoot, relative);

  try {
    const [beforeBuffer, afterBuffer] = await Promise.all([
      fs.readFile(beforePath),
      fs.readFile(afterPath),
    ]);
    const before = PNG.sync.read(beforeBuffer);
    const after = PNG.sync.read(afterBuffer);

    if (before.width !== after.width || before.height !== after.height) {
      results.push({ relative, status: "dimension-mismatch", before: [before.width, before.height], after: [after.width, after.height] });
      continue;
    }

    const diff = new PNG({ width: before.width, height: before.height });
    const differentPixels = pixelmatch(
      before.data,
      after.data,
      diff.data,
      before.width,
      before.height,
      { threshold: 0.1, includeAA: false },
    );
    await fs.mkdir(path.dirname(diffPath), { recursive: true });
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    results.push({
      relative,
      status: "compared",
      width: before.width,
      height: before.height,
      differentPixels,
      differenceRatio: differentPixels / (before.width * before.height),
    });
  } catch (error) {
    results.push({ relative, status: "missing-before-or-invalid", error: error instanceof Error ? error.message : String(error) });
  }
}

await fs.mkdir(path.join(root, "reports"), { recursive: true });
await fs.writeFile(
  path.join(root, "reports", "diff-summary.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  "utf8",
);

console.log(`Compared ${results.filter(item => item.status === "compared").length} screenshots.`);
