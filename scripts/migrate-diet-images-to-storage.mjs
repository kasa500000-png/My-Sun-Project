import { createClient } from "@supabase/supabase-js";

const execute = process.argv.includes("--execute");
const batchSizeArg = process.argv.find(arg => arg.startsWith("--batch="));
const batchSize = Math.min(Math.max(Number(batchSizeArg?.split("=")[1] || 25), 1), 100);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.FIT_DIET_IMAGE_BUCKET || "fit-diet-images";
const pattern = /^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i;
const extensionByMime = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseDataUrl(value) {
  const match = typeof value === "string" ? value.match(pattern) : null;
  if (!match) throw new Error("unsupported data URL");
  const mimeType = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > 6 * 1024 * 1024) {
    throw new Error("image must be between 1 byte and 6MB");
  }
  return { mimeType, bytes, extension: extensionByMime[mimeType] };
}

const countResult = await supabase
  .from("fit_diet_meal_logs")
  .select("id", { count: "exact", head: true })
  .is("image_path", null)
  .like("image_url", "data:image/%");

if (countResult.error) {
  console.error("Unable to count legacy diet images:", countResult.error.message);
  process.exit(1);
}

console.log(`Legacy inline diet images: ${countResult.count || 0}`);
if (!execute) {
  console.log("Dry run only. Re-run with --execute after validating the staging project and backup.");
  process.exit(0);
}

let migrated = 0;
const failures = [];
let noProgressBatches = 0;

while (true) {
  const { data: rows, error } = await supabase
    .from("fit_diet_meal_logs")
    .select("id, user_id, meal_date, image_url")
    .is("image_path", null)
    .like("image_url", "data:image/%")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!rows?.length) break;

  let batchProgress = 0;
  for (const row of rows) {
    try {
      const parsed = parseDataUrl(row.image_url);
      const path = `${row.user_id}/${row.meal_date || "undated"}/legacy-${row.id}.${parsed.extension}`;
      const upload = await supabase.storage.from(bucket).upload(path, parsed.bytes, {
        cacheControl: "31536000",
        contentType: parsed.mimeType,
        upsert: true,
      });
      if (upload.error) throw upload.error;

      const update = await supabase
        .from("fit_diet_meal_logs")
        .update({ image_path: path, image_url: null, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", row.user_id)
        .is("image_path", null)
        .select("id")
        .single();
      if (update.error) throw update.error;

      migrated += 1;
      batchProgress += 1;
      console.log(`Migrated ${row.id} -> ${path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: row.id, message });
      console.error(`Failed ${row.id}: ${message}`);
    }
  }

  if (batchProgress === 0) {
    noProgressBatches += 1;
    if (noProgressBatches >= 1) break;
  } else {
    noProgressBatches = 0;
  }
}

console.log(JSON.stringify({ migrated, failed: failures.length, failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
