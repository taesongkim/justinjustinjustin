import { notFound, redirect } from "next/navigation";
import { createCoreExamServerClient } from "../lib/supabase/server";
import { CoreExamLogin } from "./CoreExamLogin";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Gate the login page on the same flag as the reader, not on dev-only. The
  // old NODE_ENV guard redirected to /core-exam-1 in production, which bounced
  // anonymous visitors straight back here — an infinite login loop.
  const previewEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.CORE_EXAM_PREVIEW_ENABLED === "true";
  if (!previewEnabled) notFound();

  const supabase = await createCoreExamServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/core-exam-1");

  const query = await searchParams;
  return <CoreExamLogin callbackFailed={query.error === "auth_callback"} />;
}
