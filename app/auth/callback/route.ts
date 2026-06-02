import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "@/lib/supabase-url";

export const runtime = "nodejs";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\\\")) return "/";
  const url = new URL(value, "https://local.app");
  if (url.pathname !== "/") return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function loginWithMessage(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return loginWithMessage(request, "인증 코드가 없어 로그인할 수 없습니다. 다시 시도해 주세요.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return loginWithMessage(request, "로그인 환경 설정을 확인할 수 없습니다. 관리자에게 문의해 주세요.");
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginWithMessage(request, "인증 처리 중 문제가 발생했습니다. 다시 로그인해 주세요.");
  }

  return response;
}
