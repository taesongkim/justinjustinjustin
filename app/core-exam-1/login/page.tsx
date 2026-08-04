import { redirect } from "next/navigation";
import { createCoreExamServerClient } from "../lib/supabase/server";
import { CoreExamLogin } from "./CoreExamLogin";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (process.env.NODE_ENV !== "development") redirect("/core-exam-1");

  const supabase = await createCoreExamServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/core-exam-1");

  const query = await searchParams;
  return <CoreExamLogin callbackFailed={query.error === "auth_callback"} />;
}
