import FitLogApp from "@/components/FitLogApp";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function loginRedirectFor(params?: Record<string, string | string[] | undefined>) {
  const tab = firstParam(params?.tab);
  const next = tab ? `/?tab=${encodeURIComponent(tab)}` : "/";
  return `/login?next=${encodeURIComponent(next)}`;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(loginRedirectFor(await searchParams));

  return <FitLogApp userEmail={user.email} />;
}
