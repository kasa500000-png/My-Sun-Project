import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.3";
const VISION_FALLBACK_MODEL = "grok-4";
const MAX_IMAGE_DATA_URL_LENGTH = 8_500_000;
const MAX_REQUEST_CONTENT_LENGTH = 9_000_000;
const MAX_FOOD_ITEMS = 12;
const XAI_TIMEOUT_MS = 75000;
const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_MINUTE_LIMIT = 3;

type FoodEstimate = {
  id: string;
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  confidence: number;
};

type XaiChatMessage = {
  content?: unknown;
  reasoning_content?: unknown;
  text?: unknown;
};

type XaiChatResponse = {
  choices?: Array<{
    message?: XaiChatMessage;
  }>;
};

type QuotaResult = {
  allowed: boolean;
  retry_after_seconds: number;
  daily_remaining: number;
  minute_remaining: number;
};

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function asText(value: unknown, fallback = "", max = 120) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function asNumber(value: unknown, min = 0, max = 10000) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(Math.round(number), min), max);
}

function asConfidence(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.min(Math.max(number, 0), 1);
}

function positiveIntegerEnv(name: string, fallback: number, max: number) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function extractTextFromPart(part: unknown) {
  if (typeof part === "string") return part;
  if (typeof part !== "object" || part === null) return "";
  const source = part as Record<string, unknown>;
  return asText(source.text, "", 50000) || asText(source.content, "", 50000) || asText(source.output_text, "", 50000);
}

function extractMessageContent(data: unknown) {
  const message = (data as XaiChatResponse | null)?.choices?.[0]?.message;
  if (!message) return "";

  if (typeof message.content === "string") return message.content.trim();
  if (Array.isArray(message.content)) {
    return message.content.map(extractTextFromPart).join("\n").trim();
  }

  return (
    asText(message.text, "", 50000)
    || asText(message.reasoning_content, "", 50000)
  ).trim();
}

function extractJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) return JSON.parse(fenced);

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("JSON 응답을 찾지 못했습니다.");
    return JSON.parse(content.slice(start, end + 1));
  }
}

function sanitizeFoods(value: unknown): FoodEstimate[] {
  const list = Array.isArray(value) ? value : [];
  return list.slice(0, MAX_FOOD_ITEMS).map((item, index) => {
    const source = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    return {
      id: `ai-${Date.now()}-${index}`,
      name: asText(source.name, "확인 필요 음식"),
      portion: asText(source.portion, "1인분"),
      calories: asNumber(source.calories, 0, 5000),
      carbs: asNumber(source.carbs, 0, 1000),
      protein: asNumber(source.protein, 0, 1000),
      fat: asNumber(source.fat, 0, 1000),
      confidence: asConfidence(source.confidence),
    };
  });
}

function buildPayload(model: string, imageDataUrl: string, mealSlot: string, menuHint: string) {
  return {
    model,
    temperature: 0.1,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content: [
          "You are a Korean nutrition logging assistant.",
          "Analyze the meal photo and estimate food items, portions, calories, carbs, protein, and fat.",
          "Return one valid JSON object only. Do not use markdown.",
          "Use conservative estimates and mark uncertain items with lower confidence.",
          "Required JSON shape: {\"foods\":[{\"name\":\"string\",\"portion\":\"string\",\"calories\":number,\"carbs\":number,\"protein\":number,\"fat\":number,\"confidence\":number}],\"feedback\":\"Korean sentence\",\"confidence\":number}.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "auto" },
          },
          {
            type: "text",
            text: [
              `Meal slot: ${mealSlot}.`,
              menuHint ? `User-provided menu hint: ${menuHint}. Use it as context, but verify against the image.` : "",
              "사진 속 음식을 한국어로 분석해 주세요.",
              "음식별 추정치를 분리해서 주세요.",
              "컵라면, 소시지, 계란처럼 포장/완제품이 보이면 일반적인 1회 제공량 기준으로 추정해 주세요.",
              "확실하지 않은 음식은 confidence를 낮게 주세요.",
            ].join(" "),
          },
        ],
      },
    ],
  };
}

async function callXai(apiKey: string, model: string, imageDataUrl: string, mealSlot: string, menuHint: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), XAI_TIMEOUT_MS);

  try {
    const response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload(model, imageDataUrl, mealSlot, menuHint)),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    return { response, data, content: extractMessageContent(data) };
  } finally {
    clearTimeout(timeout);
  }
}

async function currentUserId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

function sameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function consumeQuota(userId: string): Promise<QuotaResult> {
  const dailyLimit = positiveIntegerEnv("FIT_AI_DAILY_LIMIT", DEFAULT_DAILY_LIMIT, 500);
  const minuteLimit = positiveIntegerEnv("FIT_AI_MINUTE_LIMIT", DEFAULT_MINUTE_LIMIT, 30);
  const { data, error } = await getServiceClient().rpc("consume_fit_ai_analysis_quota", {
    p_user_id: userId,
    p_daily_limit: dailyLimit,
    p_minute_limit: minuteLimit,
  });

  if (error) {
    console.error("[diet-analyze] quota check failed", { code: error.code, message: error.message });
    throw new Error("AI 사용량 보호 설정을 확인할 수 없습니다. Supabase 보안 마이그레이션을 적용해 주세요.");
  }

  const row = (Array.isArray(data) ? data[0] : data) as Partial<QuotaResult> | null;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("AI 사용량 보호 응답이 올바르지 않습니다.");
  }

  return {
    allowed: row.allowed,
    retry_after_seconds: Math.max(Number(row.retry_after_seconds || 0), 0),
    daily_remaining: Math.max(Number(row.daily_remaining || 0), 0),
    minute_remaining: Math.max(Number(row.minute_remaining || 0), 0),
  };
}

function quotaHeaders(quota: QuotaResult) {
  return {
    "X-RateLimit-Daily-Remaining": String(quota.daily_remaining),
    "X-RateLimit-Minute-Remaining": String(quota.minute_remaining),
  };
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "로그인이 필요한 기능입니다. 다시 로그인해 주세요." }, 401);
  if (!sameOriginRequest(request)) return json({ error: "허용되지 않은 요청입니다." }, 403);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_CONTENT_LENGTH) {
    return json({ error: "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요." }, 413);
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return json({ error: "AI 식단 분석 기능이 아직 설정되지 않았습니다." }, 503);
  }

  let body: { imageDataUrl?: unknown; mealSlot?: unknown; menuHint?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const mealSlot = asText(body.mealSlot, "meal");
  const menuHint = asText(body.menuHint, "", 200);

  if (!imageDataUrl.startsWith("data:image/")) {
    return json({ error: "분석할 이미지가 필요합니다." }, 400);
  }

  if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return json({ error: "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요." }, 413);
  }

  let quota: QuotaResult;
  try {
    quota = await consumeQuota(userId);
  } catch (error) {
    console.error("[diet-analyze] quota unavailable", error);
    return json({ error: "AI 분석 보호 설정을 준비하는 중입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }

  if (!quota.allowed) {
    return json(
      { error: "AI 분석 요청이 많습니다. 제한이 초기화된 뒤 다시 시도해 주세요." },
      429,
      {
        ...quotaHeaders(quota),
        "Retry-After": String(Math.max(quota.retry_after_seconds, 1)),
      },
    );
  }

  const requestedModel = process.env.XAI_VISION_MODEL || process.env.XAI_MODEL || DEFAULT_MODEL;
  const canFallback = !process.env.XAI_VISION_MODEL && requestedModel !== VISION_FALLBACK_MODEL;

  try {
    let result = await callXai(apiKey, requestedModel, imageDataUrl, mealSlot, menuHint);
    let usedModel = requestedModel;

    if (!result.response.ok) {
      console.error("[diet-analyze] xAI request failed", {
        status: result.response.status,
        requestId: result.response.headers.get("x-request-id"),
        model: requestedModel,
      });
      return json({ error: "AI 식단 분석 호출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502, quotaHeaders(quota));
    }

    if (!result.content && canFallback) {
      console.warn("[diet-analyze] empty content, retrying vision fallback", { model: requestedModel });
      result = await callXai(apiKey, VISION_FALLBACK_MODEL, imageDataUrl, mealSlot, menuHint);
      usedModel = VISION_FALLBACK_MODEL;
    }

    if (!result.response.ok) {
      console.error("[diet-analyze] xAI fallback failed", {
        status: result.response.status,
        requestId: result.response.headers.get("x-request-id"),
        model: usedModel,
      });
      return json({ error: "AI 식단 분석 호출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502, quotaHeaders(quota));
    }

    if (!result.content) {
      console.error("[diet-analyze] empty xAI content", { model: usedModel });
      return json({ error: "AI가 이미지 분석 결과를 반환하지 않았습니다. 직접 입력으로 기록해 주세요." }, 502, quotaHeaders(quota));
    }

    const parsed = extractJsonObject(result.content) as Record<string, unknown>;
    const foods = sanitizeFoods(parsed.foods);
    const feedback = asText(parsed.feedback, "분석 결과를 확인한 뒤 음식과 분량을 저장해 주세요.", 1000);

    if (foods.length === 0) {
      return json({ error: "음식을 인식하지 못했습니다. 직접 입력으로 기록해 주세요." }, 422, quotaHeaders(quota));
    }

    return json({
      foods,
      feedback,
      confidence: asConfidence(parsed.confidence),
      model: usedModel,
    }, 200, quotaHeaders(quota));
  } catch (error) {
    console.error("[diet-analyze] request error", error instanceof Error ? { name: error.name, message: error.message } : { name: "unknown" });
    if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
      return json({ error: "AI 분석 응답이 지연되고 있습니다. 잠시 후 다시 시도하거나 직접 입력으로 기록해 주세요." }, 504, quotaHeaders(quota));
    }
    return json({ error: "AI 식단 분석 중 문제가 발생했습니다. 직접 입력으로 기록해 주세요." }, 500, quotaHeaders(quota));
  }
}
