import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = path.resolve(process.argv[2] || "artifacts/uiux/runtime");
const beforeRoot = path.join(root, "before");
const afterRoot = path.join(root, "after");
const diffRoot = path.join(root, "diff");
const CANVAS = { red: 255, green: 253, blue: 251, alpha: 255 };

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

function padImage(source, width, height) {
  if (source.width === width && source.height === height) return source;

  const padded = new PNG({ width, height });
  for (let offset = 0; offset < padded.data.length; offset += 4) {
    padded.data[offset] = CANVAS.red;
    padded.data[offset + 1] = CANVAS.green;
    padded.data[offset + 2] = CANVAS.blue;
    padded.data[offset + 3] = CANVAS.alpha;
  }
  PNG.bitblt(source, padded, 0, 0, source.width, source.height, 0, 0);
  return padded;
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
    const originalBefore = PNG.sync.read(beforeBuffer);
    const originalAfter = PNG.sync.read(afterBuffer);
    const width = Math.max(originalBefore.width, originalAfter.width);
    const height = Math.max(originalBefore.height, originalAfter.height);
    const before = padImage(originalBefore, width, height);
    const after = padImage(originalAfter, width, height);
    const diff = new PNG({ width, height });
    const differentPixels = pixelmatch(
      before.data,
      after.data,
      diff.data,
      width,
      height,
      { threshold: 0.1, includeAA: false },
    );

    await fs.mkdir(path.dirname(diffPath), { recursive: true });
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    results.push({
      relative,
      status: "compared",
      width,
      height,
      padded: originalBefore.width !== originalAfter.width || originalBefore.height !== originalAfter.height,
      before: [originalBefore.width, originalBefore.height],
      after: [originalAfter.width, originalAfter.height],
      differentPixels,
      differenceRatio: differentPixels / (width * height),
    });
  } catch (error) {
    results.push({
      relative,
      status: "missing-before-or-invalid",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

await fs.mkdir(path.join(root, "reports"), { recursive: true });
await fs.writeFile(
  path.join(root, "reports", "diff-summary.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  "utf8",
);

const compared = results.filter(item => item.status === "compared").length;
const missing = results.length - compared;
console.log(`Compared ${compared} screenshots${missing ? `; ${missing} could not be compared` : ""}.`);
