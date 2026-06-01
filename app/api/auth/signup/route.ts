import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function asText(value: unknown, max = 320) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered")) {
    return "이미 가입된 아이디입니다. 로그인으로 진행해 주세요.";
  }
  if (lower.includes("password")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  return "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = asText(body.email).toLowerCase();
  const password = asText(body.password, 200);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "아이디는 이메일 주소 형식으로 입력해 주세요." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상으로 입력해 주세요." }, { status: 400 });
  }

  let data;
  try {
    const supabase = getServiceClient();
    const result = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    data = result.data;

    if (result.error) {
      return NextResponse.json({ error: authMessage(result.error.message) }, { status: 400 });
    }
  } catch (error) {
    console.error("[auth-signup]", error);
    return NextResponse.json({ error: "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: data.user?.id });
}
