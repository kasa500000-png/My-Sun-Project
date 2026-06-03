import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.3";
const VISION_FALLBACK_MODEL = "grok-4";
const MAX_IMAGE_DATA_URL_LENGTH = 10_000_000;
const MAX_FOOD_ITEMS = 12;
const XAI_TIMEOUT_MS = 75000;

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

function buildPayload(model: string, imageDataUrl: string, mealSlot: string) {
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

async function callXai(apiKey: string, model: string, imageDataUrl: string, mealSlot: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), XAI_TIMEOUT_MS);

  try {
    const response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload(model, imageDataUrl, mealSlot)),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    return { response, data, content: extractMessageContent(data) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Grok API 키가 설정되지 않았습니다. Vercel 환경변수에 XAI_API_KEY를 추가해 주세요." },
      { status: 503 },
    );
  }

  let body: { imageDataUrl?: unknown; mealSlot?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const mealSlot = asText(body.mealSlot, "meal");

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "분석할 이미지가 필요합니다." }, { status: 400 });
  }

  if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요." }, { status: 413 });
  }

  const requestedModel = process.env.XAI_VISION_MODEL || process.env.XAI_MODEL || DEFAULT_MODEL;
  const canFallback = !process.env.XAI_VISION_MODEL && requestedModel !== VISION_FALLBACK_MODEL;

  try {
    let result = await callXai(apiKey, requestedModel, imageDataUrl, mealSlot);
    let usedModel = requestedModel;

    if (!result.response.ok) {
      console.error("[diet-analyze] xAI error", result.response.status, result.data);
      return NextResponse.json({ error: "AI 식단 분석 호출에 실패했습니다. Vercel의 XAI_API_KEY와 모델명을 확인해 주세요." }, { status: 502 });
    }

    if (!result.content && canFallback) {
      console.warn("[diet-analyze] empty content from model, retrying vision fallback", requestedModel);
      result = await callXai(apiKey, VISION_FALLBACK_MODEL, imageDataUrl, mealSlot);
      usedModel = VISION_FALLBACK_MODEL;
    }

    if (!result.response.ok) {
      console.error("[diet-analyze] xAI fallback error", result.response.status, result.data);
      return NextResponse.json({ error: "AI 식단 분석 호출에 실패했습니다. Vercel의 XAI_API_KEY와 모델명을 확인해 주세요." }, { status: 502 });
    }

    if (!result.content) {
      console.error("[diet-analyze] empty xAI content", {
        model: usedModel,
        message: (result.data as XaiChatResponse | null)?.choices?.[0]?.message,
      });
      return NextResponse.json({
        error: "AI가 이미지 분석 텍스트를 반환하지 않았습니다. Vercel에 XAI_VISION_MODEL=grok-4를 추가한 뒤 다시 시도해 주세요.",
      }, { status: 502 });
    }

    const parsed = extractJsonObject(result.content) as Record<string, unknown>;
    const foods = sanitizeFoods(parsed.foods);
    const feedback = asText(parsed.feedback, "분석 결과를 확인한 뒤 음식과 분량을 저장해 주세요.", 1000);

    if (foods.length === 0) {
      return NextResponse.json({ error: "음식을 인식하지 못했습니다. 직접 입력으로 기록해 주세요." }, { status: 422 });
    }

    return NextResponse.json({
      foods,
      feedback,
      confidence: asConfidence(parsed.confidence),
      model: usedModel,
    });
  } catch (error) {
    console.error("[diet-analyze]", error);
    if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
      return NextResponse.json({ error: "AI 분석 응답이 지연되고 있습니다. 잠시 후 다시 시도하거나 직접 입력으로 기록해 주세요." }, { status: 504 });
    }
    return NextResponse.json({ error: "AI 식단 분석 중 문제가 발생했습니다. 직접 입력으로 기록해 주세요." }, { status: 500 });
  }
}
