"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = "/";
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setMessage("Supabase environment variables are not configured.");
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
    setMessage(error ? error.message : "Check your email for the secure login link.");
  }

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <div className="grid min-h-screen md:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="relative min-h-[44vh] overflow-hidden bg-[#111111] md:min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/training-hero.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent md:bg-gradient-to-r" />
          <div className="relative flex min-h-[44vh] flex-col justify-end p-5 text-white md:min-h-screen md:p-10">
            <p className="text-sm font-medium uppercase text-white/75">Mysun Fit Log</p>
            <h1 className="mt-4 max-w-3xl text-[54px] font-black uppercase leading-[0.88] md:text-[104px]">
              Run the day.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/78">
              Sign up or log in with one email link. Every workout is saved to Supabase under your account.
            </p>
          </div>
        </section>

        <section className="flex items-center px-5 py-10 md:px-10">
          <form className="w-full max-w-md" onSubmit={submit}>
            <p className="text-sm font-medium uppercase text-[#707072]">Member Access</p>
            <h2 className="mt-2 text-4xl font-medium leading-tight">Sign up or log in</h2>
            <p className="mt-4 leading-7 text-[#39393b]">
              Enter an email address and Supabase will send a secure magic link. First-time users are created automatically.
            </p>

            <label className="mt-8 grid gap-2">
              <span className="text-xs font-medium uppercase text-[#707072]">Email</span>
              <input
                className="nike-input h-14"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>

            <button className="mt-4 h-12 w-full rounded-full bg-[#111111] text-base font-medium text-white disabled:opacity-50" disabled={loading}>
              {loading ? "Sending..." : "Continue"}
            </button>

            {message && (
              <p className="mt-5 bg-[#f5f5f5] p-4 text-sm font-medium leading-6 text-[#111111]">
                {message}
              </p>
            )}

            <div className="mt-8 border-t border-[#cacacb] pt-5">
              <p className="text-sm leading-6 text-[#707072]">
                No local workout storage is used. Your browser only keeps the Supabase auth session cookie.
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
