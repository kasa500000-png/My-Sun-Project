import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.3";
const MAX_IMAGE_DATA_URL_LENGTH = 10_000_000;
const MAX_FOOD_ITEMS = 12;

type XaiMessageContent = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

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

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : fallback;
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

function extractJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
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

  const model = process.env.XAI_MODEL || DEFAULT_MODEL;
  const payload = {
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are a Korean nutrition logging assistant.",
          "Analyze a meal photo and estimate food items, portions, calories, carbs, protein, and fat.",
          "Return only valid JSON. No markdown.",
          "Use conservative estimates and mark uncertain items with lower confidence.",
          "The response must match this shape: {\"foods\":[{\"name\":\"string\",\"portion\":\"string\",\"calories\":number,\"carbs\":number,\"protein\":number,\"fat\":number,\"confidence\":number}],\"feedback\":\"Korean sentence\",\"confidence\":number}.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Meal slot: ${mealSlot}.`,
              "사진 속 음식을 한국어로 분석해 주세요.",
              "사용자가 저장 전 수정할 수 있도록 음식별 추정치를 나눠 주세요.",
              "사진 기반 추정값이므로 확실하지 않은 음식은 '확인 필요'에 가깝게 표현해 주세요.",
            ].join(" "),
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("[diet-analyze] xAI error", response.status, data);
      return NextResponse.json({ error: "AI 식단 분석 호출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const content = (data as XaiMessageContent | null)?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 분석 결과가 비어 있습니다. 직접 입력으로 기록해 주세요." }, { status: 502 });
    }

    const parsed = extractJsonObject(content) as Record<string, unknown>;
    const foods = sanitizeFoods(parsed.foods);
    const feedback = asText(parsed.feedback, "분석 결과를 확인한 뒤 음식과 분량을 저장해 주세요.");

    if (foods.length === 0) {
      return NextResponse.json({ error: "음식을 인식하지 못했습니다. 직접 입력으로 기록해 주세요." }, { status: 422 });
    }

    return NextResponse.json({
      foods,
      feedback,
      confidence: asConfidence(parsed.confidence),
      model,
    });
  } catch (error) {
    console.error("[diet-analyze]", error);
    return NextResponse.json({ error: "AI 식단 분석 중 문제가 발생했습니다. 직접 입력으로 기록해 주세요." }, { status: 500 });
  }
}
