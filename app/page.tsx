import FitLogApp from "@/components/FitLogApp";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <FitLogApp userId={user.id} userEmail={user.email} />;
}
