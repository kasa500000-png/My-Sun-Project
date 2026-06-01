"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";

function authMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("user already registered")) return "이미 가입된 아이디입니다. 로그인으로 진행해 주세요.";
  if (lower.includes("password")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (lower.includes("rate")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = "/";
    });
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setPasswordConfirm("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다.");
      return;
    }

    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }

    if (mode === "signup" && password !== passwordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(authMessage(error.message));
          return;
        }

        window.location.href = "/";
        return;
      }

      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const signupData = await signupRes.json().catch(() => ({}));

      if (!signupRes.ok) {
        setMessage(signupData.error || "회원가입 처리 중 문제가 발생했습니다.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(authMessage(error.message));
        return;
      }

      window.location.href = "/";
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffdfb] text-[#242124]">
      <div className="grid min-h-screen md:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
        <section className="relative min-h-[36vh] overflow-hidden bg-[#242124] md:min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center md:bg-[center_45%]"
            style={{ backgroundImage: "image-set(url('/images/mysun-login-hero.webp') type('image/webp'), url('/images/mysun-login-hero.jpg') type('image/jpeg'))" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#242124]/62 via-[#242124]/10 to-transparent md:bg-gradient-to-r md:from-[#242124]/56 md:via-[#242124]/10" />
          <div className="relative flex min-h-[36vh] flex-col justify-end p-6 text-[#fffdfb] md:min-h-screen md:p-10">
            <p className="text-base font-semibold text-[#fffdfb]">For mysun</p>
          </div>
        </section>

        <section className="flex items-center px-5 py-10 md:px-10">
          <form className="w-full max-w-md rounded-[22px] bg-[#fffdfb] md:p-2" onSubmit={submit}>
            <div className="mb-8">
              <p className="text-sm font-medium text-[#7a7470]">마이썬 운동 일지</p>
              <h1 className="mt-2 text-[34px] font-semibold leading-tight">
                {mode === "login" ? "로그인" : "회원가입"}
              </h1>
            </div>

            <div className="grid grid-cols-2 rounded-full bg-[#faf4f1] p-1 ring-1 ring-[#eadfda]">
              <button
                type="button"
                className={`h-11 rounded-full text-sm font-medium ${mode === "login" ? "bg-[#242124] text-[#fffdfb]" : "text-[#242124]"}`}
                onClick={() => switchMode("login")}
              >
                로그인
              </button>
              <button
                type="button"
                className={`h-11 rounded-full text-sm font-medium ${mode === "signup" ? "bg-[#242124] text-[#fffdfb]" : "text-[#242124]"}`}
                onClick={() => switchMode("signup")}
              >
                회원가입
              </button>
            </div>

            <div className="mt-8 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#4b4541]">아이디</span>
                <input
                  className="nike-input h-14"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="이메일 주소"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#4b4541]">비밀번호</span>
                <input
                  className="nike-input h-14"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="6자 이상"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                />
              </label>

              {mode === "signup" && (
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[#4b4541]">비밀번호 확인</span>
                  <input
                    className="nike-input h-14"
                    type="password"
                    value={passwordConfirm}
                    onChange={event => setPasswordConfirm(event.target.value)}
                    placeholder="비밀번호를 한 번 더 입력"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </label>
              )}
            </div>

            <button className="mt-6 h-12 w-full rounded-full bg-[#242124] text-base font-semibold text-[#fffdfb] shadow-[0_10px_24px_rgba(58,48,50,0.14)] disabled:opacity-50" disabled={loading} aria-busy={loading}>
              {loading ? "처리 중" : mode === "login" ? "로그인" : "회원가입"}
            </button>

            {message && (
              <p className="mt-5 rounded-[14px] bg-[#faf4f1] p-4 text-sm font-medium leading-6 text-[#242124] ring-1 ring-[#eadfda]" role="alert">
                {message}
              </p>
            )}

            <p className="mt-6 text-center text-sm leading-6 text-[#7a7470]">
              {mode === "login" ? "아직 계정이 없다면 회원가입을 선택해 주세요." : "가입 후 바로 운동 일지를 시작할 수 있습니다."}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
