import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "fit-diet-images";
const DEFAULT_SIGNED_URL_SECONDS = 60 * 60;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type StoredDietImageState = {
  imagePath: string | null;
  legacyImageUrl: string | null;
};

export type PreparedDietImage = StoredDietImageState & {
  uploadedPath: string | null;
  oldPathToDelete: string | null;
};

export type DietImageRow = {
  image_path?: string | null;
};

export class DietImageInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DietImageInputError";
    this.status = status;
  }
}

export function dietImageBucket() {
  return process.env.FIT_DIET_IMAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

function parseDataImage(dataUrl: string) {
  const match = dataUrl.match(DATA_IMAGE_PATTERN);
  if (!match) {
    throw new DietImageInputError("지원하지 않는 이미지 형식입니다. JPG, PNG, WebP 또는 GIF를 사용해 주세요.");
  }

  const mimeType = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (bytes.byteLength === 0) {
    throw new DietImageInputError("이미지 내용을 확인할 수 없습니다.");
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new DietImageInputError("이미지 용량이 너무 큽니다. 6MB 이하 사진으로 다시 시도해 주세요.", 413);
  }

  return {
    bytes,
    mimeType,
    extension: EXTENSION_BY_MIME[mimeType],
  };
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function safeDateSegment(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "undated";
}

export async function prepareDietImage(
  supabase: SupabaseClient,
  userId: string,
  mealDate: string,
  value: unknown,
  existing: StoredDietImageState,
): Promise<PreparedDietImage> {
  if (value === undefined) {
    return {
      ...existing,
      uploadedPath: null,
      oldPathToDelete: null,
    };
  }

  if (value == null || value === "") {
    return {
      imagePath: null,
      legacyImageUrl: null,
      uploadedPath: null,
      oldPathToDelete: existing.imagePath,
    };
  }

  if (typeof value !== "string") {
    throw new DietImageInputError("식단 이미지 형식이 올바르지 않습니다.");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      imagePath: null,
      legacyImageUrl: null,
      uploadedPath: null,
      oldPathToDelete: existing.imagePath,
    };
  }

  if (trimmed.startsWith("data:image/")) {
    const parsed = parseDataImage(trimmed);
    const path = `${userId}/${safeDateSegment(mealDate)}/${randomUUID()}.${parsed.extension}`;
    const { error } = await supabase.storage
      .from(dietImageBucket())
      .upload(path, parsed.bytes, {
        cacheControl: "31536000",
        contentType: parsed.mimeType,
        upsert: false,
      });

    if (error) {
      console.error("[diet-image] upload failed", { code: error.name, message: error.message });
      throw new Error("식단 사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return {
      imagePath: path,
      legacyImageUrl: null,
      uploadedPath: path,
      oldPathToDelete: existing.imagePath && existing.imagePath !== path ? existing.imagePath : null,
    };
  }

  if (isHttpsUrl(trimmed)) {
    if (existing.imagePath) {
      // GET responses expose a short-lived signed URL. Re-saving that value must preserve the private object path.
      return {
        ...existing,
        uploadedPath: null,
        oldPathToDelete: null,
      };
    }

    return {
      imagePath: null,
      legacyImageUrl: trimmed.slice(0, 2048),
      uploadedPath: null,
      oldPathToDelete: null,
    };
  }

  throw new DietImageInputError("식단 사진은 직접 업로드한 이미지 또는 HTTPS 주소만 사용할 수 있습니다.");
}

export async function removeDietImage(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from(dietImageBucket()).remove([path]);
  if (error) {
    console.error("[diet-image] cleanup failed", { code: error.name, message: error.message });
  }
}

export async function signedDietImageUrls(
  supabase: SupabaseClient,
  rows: DietImageRow[],
  expiresIn = DEFAULT_SIGNED_URL_SECONDS,
) {
  const paths = [...new Set(rows.map(row => row.image_path).filter((path): path is string => Boolean(path)))];
  const signedByPath = new Map<string, string>();
  if (paths.length === 0) return signedByPath;

  const { data, error } = await supabase.storage.from(dietImageBucket()).createSignedUrls(paths, expiresIn);
  if (error) {
    console.error("[diet-image] signed URL creation failed", { code: error.name, message: error.message });
    return signedByPath;
  }

  for (const item of data || []) {
    if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  }
  return signedByPath;
}
