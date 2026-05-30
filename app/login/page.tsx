"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setMessage("Supabase 환경변수가 아직 설정되지 않았어요.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    setMessage(error ? error.message : "메일로 로그인 링크를 보냈어요.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f3ec] px-4">
      <form className="w-full max-w-sm rounded-2xl border border-[#e1d8cd] bg-white p-6 shadow-sm" onSubmit={submit}>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#63a889]">Mysun Fit Log</p>
        <h1 className="mt-2 text-2xl font-black text-[#20382f]">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-[#70685f]">
          이메일 링크로 로그인하면 운동 기록이 Supabase에 저장됩니다.
        </p>
        <label className="mt-5 grid gap-2">
          <span className="text-xs font-black text-[#70685f]">이메일</span>
          <input
            className="h-12 rounded-xl border border-[#d9d0c3] bg-[#fbfaf7] px-3 outline-none"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />
        </label>
        <button className="mt-4 h-12 w-full rounded-full bg-[#20382f] text-sm font-black text-white" disabled={loading}>
          {loading ? "보내는 중..." : "로그인 링크 받기"}
        </button>
        {message && <p className="mt-4 rounded-xl bg-[#f7f3ec] p-3 text-sm font-bold text-[#20382f]">{message}</p>}
        <Link className="mt-4 inline-flex text-sm font-black text-[#1f7b5c]" href="/">
          운동 일지로 돌아가기
        </Link>
      </form>
    </main>
  );
}
