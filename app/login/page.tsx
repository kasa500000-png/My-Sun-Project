"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import FieldMessage from "@/components/ui/FieldMessage";
import StatusMessage from "@/components/ui/StatusMessage";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";
type MessageTone = "info" | "danger";
type AuthField = "email" | "password" | "passwordConfirm";

const AUTH_TIMEOUT_MS = 15000;

async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: init?.signal || controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("응답이 지연되고 있습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.");
    }
    throw new Error("네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    window.clearTimeout(timeout);
  }
}

function safeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\\\")) return "/";
  const url = new URL(next, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname !== "/") return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function authMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("user already registered")) return "이미 가입된 이메일입니다. 로그인으로 진행해 주세요.";
  if (lower.includes("password")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (lower.includes("rate")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [fieldError, setFieldError] = useState<AuthField | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notice = params.get("message");
    if (notice) {
      setMessage(notice.slice(0, 180));
      setMessageTone("info");
    }

    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser()
      .then(({ data }) => {
        if (data.user) window.location.href = safeNextPath();
      })
      .catch(() => {
        // Keep the login form available when the initial session check fails.
      });
  }, []);

  function showError(nextMessage: string, field: AuthField | null = null) {
    setMessage(nextMessage);
    setMessageTone("danger");
    setFieldError(field);
  }

  function clearFieldError(field: AuthField) {
    if (fieldError !== field) return;
    setFieldError(null);
    setMessage("");
  }

  function switchMode(nextMode: AuthMode) {
    if (loading) return;
    setMode(nextMode);
    setMessage("");
    setMessageTone("info");
    setFieldError(null);
    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      showError("이메일 주소를 입력해 주세요.", "email");
      return;
    }

    const supabase = createSupabaseBrowser();
    if (!supabase) {
      showError("로그인 환경이 준비되지 않았습니다. 관리자에게 문의해 주세요.");
      return;
    }

    if (password.length < 6) {
      showError("비밀번호는 6자 이상으로 입력해 주세요.", "password");
      return;
    }

    if (mode === "signup" && password !== passwordConfirm) {
      showError("입력한 비밀번호와 일치하지 않습니다.", "passwordConfirm");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          showError(authMessage(error.message));
          return;
        }

        window.location.href = safeNextPath();
        return;
      }

      const signupRes = await authFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const signupData = await signupRes.json().catch(() => ({}));

      if (!signupRes.ok) {
        showError(typeof signupData.error === "string" ? signupData.error : "회원가입 처리 중 문제가 발생했습니다.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        showError(authMessage(error.message));
        return;
      }

      window.location.href = safeNextPath();
    } catch (error) {
      showError(error instanceof Error ? error.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const passwordType = showPassword ? "text" : "password";
  const passwordHintId = fieldError === "password" ? "password-error" : "password-hint";
  const confirmHintId = fieldError === "passwordConfirm" ? "password-confirm-error" : "password-confirm-hint";
  const activeTabId = mode === "login" ? "auth-login-tab" : "auth-signup-tab";

  return (
    <main className="mysun-auth-page">
      <div className="mysun-auth-layout">
        <section className="mysun-auth-hero" aria-labelledby="auth-brand-title">
          <div
            className="mysun-auth-hero-image"
            style={{ backgroundImage: "url('/images/mysun-login-hero.webp')" }}
            aria-hidden="true"
          />
          <div className="mysun-auth-hero-overlay" aria-hidden="true" />
          <div className="mysun-auth-hero-content">
            <p className="mysun-auth-eyebrow">For mysun</p>
            <h2 id="auth-brand-title" className="mysun-auth-brand-title">
              오늘의 운동을 기록하고, 내 몸의 흐름을 확인하세요.
            </h2>
            <ul className="mysun-auth-benefits" aria-label="마이썬 운동일지 주요 기능">
              <li><span aria-hidden="true">✓</span> 세트·무게·횟수를 빠르게 기록</li>
              <li><span aria-hidden="true">✓</span> 주간 근육 밸런스와 운동 흐름 확인</li>
              <li><span aria-hidden="true">✓</span> 식단과 영양 목표를 한곳에서 관리</li>
            </ul>
          </div>
        </section>

        <section className="mysun-auth-form-region" aria-labelledby="auth-title">
          <form className="mysun-auth-card mysun-card" onSubmit={submit} aria-describedby="auth-description">
            <header className="mysun-auth-header">
              <p className="mysun-auth-product">마이썬 운동일지</p>
              <h1 id="auth-title" className="mysun-page-title">
                {mode === "login" ? "다시 만나 반가워요" : "기록을 시작해 볼까요?"}
              </h1>
              <p id="auth-description" className="mysun-auth-description">
                {mode === "login"
                  ? "가입한 이메일과 비밀번호로 로그인해 주세요."
                  : "이메일 계정을 만들면 운동과 식단 기록을 안전하게 이어갈 수 있어요."}
              </p>
            </header>

            <div className="mysun-auth-tabs mysun-tabbar" role="tablist" aria-label="인증 방식">
              <button
                id="auth-login-tab"
                type="button"
                role="tab"
                className="mysun-auth-tab"
                aria-label="로그인 모드 선택"
                aria-selected={mode === "login"}
                aria-controls="auth-fields"
                tabIndex={mode === "login" ? 0 : -1}
                disabled={loading}
                onClick={() => switchMode("login")}
              >
                로그인
              </button>
              <button
                id="auth-signup-tab"
                type="button"
                role="tab"
                className="mysun-auth-tab"
                aria-label="회원가입 모드 선택"
                aria-selected={mode === "signup"}
                aria-controls="auth-fields"
                tabIndex={mode === "signup" ? 0 : -1}
                disabled={loading}
                onClick={() => switchMode("signup")}
              >
                회원가입
              </button>
            </div>

            <div id="auth-fields" className="mysun-auth-fields" role="tabpanel" aria-labelledby={activeTabId}>
              <label className="mysun-auth-field" htmlFor="auth-email">
                <span className="mysun-label">이메일</span>
                <input
                  id="auth-email"
                  name="email"
                  className="nike-input h-14"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={fieldError === "email"}
                  aria-describedby={fieldError === "email" ? "email-error" : "email-hint"}
                  disabled={loading}
                  required
                />
                {fieldError === "email" ? (
                  <FieldMessage id="email-error" tone="error">{message}</FieldMessage>
                ) : (
                  <FieldMessage id="email-hint">가입할 때 사용한 이메일 주소를 입력해 주세요.</FieldMessage>
                )}
              </label>

              <label className="mysun-auth-field" htmlFor="auth-password">
                <span className="mysun-label">비밀번호</span>
                <span className="mysun-password-field">
                  <input
                    id="auth-password"
                    name="password"
                    className="nike-input h-14"
                    type={passwordType}
                    value={password}
                    onChange={event => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="6자 이상"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    aria-invalid={fieldError === "password"}
                    aria-describedby={passwordHintId}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="mysun-password-toggle"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시하기"}
                    aria-controls={mode === "signup" ? "auth-password auth-password-confirm" : "auth-password"}
                    aria-pressed={showPassword}
                    disabled={loading}
                    onClick={() => setShowPassword(current => !current)}
                  >
                    {showPassword ? "숨기기" : "보기"}
                  </button>
                </span>
                {fieldError === "password" ? (
                  <FieldMessage id="password-error" tone="error">{message}</FieldMessage>
                ) : (
                  <FieldMessage id="password-hint">비밀번호는 6자 이상이어야 합니다.</FieldMessage>
                )}
              </label>

              {mode === "signup" ? (
                <label className="mysun-auth-field" htmlFor="auth-password-confirm">
                  <span className="mysun-label">비밀번호 확인</span>
                  <input
                    id="auth-password-confirm"
                    name="passwordConfirm"
                    className="nike-input h-14"
                    type={passwordType}
                    value={passwordConfirm}
                    onChange={event => {
                      setPasswordConfirm(event.target.value);
                      clearFieldError("passwordConfirm");
                    }}
                    placeholder="같은 비밀번호를 한 번 더 입력"
                    autoComplete="new-password"
                    aria-invalid={fieldError === "passwordConfirm"}
                    aria-describedby={confirmHintId}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  {fieldError === "passwordConfirm" ? (
                    <FieldMessage id="password-confirm-error" tone="error">{message}</FieldMessage>
                  ) : (
                    <FieldMessage id="password-confirm-hint">위에서 입력한 비밀번호와 같아야 합니다.</FieldMessage>
                  )}
                </label>
              ) : null}
            </div>

            {message && !fieldError ? (
              <StatusMessage tone={messageTone} id="auth-status">
                {message}
              </StatusMessage>
            ) : null}

            <button
              type="submit"
              className="mysun-primary-action mysun-auth-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <span className="mysun-auth-spinner" aria-hidden="true" /> : null}
              <span>{loading ? "안전하게 처리하는 중" : mode === "login" ? "로그인" : "회원가입하고 시작하기"}</span>
            </button>

            <p className="mysun-auth-footnote">
              {mode === "login"
                ? "계정이 없다면 위의 회원가입 탭에서 바로 시작할 수 있어요."
                : "가입이 완료되면 같은 화면에서 자동으로 로그인합니다."}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
