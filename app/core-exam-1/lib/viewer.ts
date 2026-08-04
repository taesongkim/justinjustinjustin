import "server-only";

import { createCoreExamServerClient } from "./supabase/server";

export type CoreExamViewer = {
  avatarColor: string;
  displayName: string;
  email: string;
  role: "owner" | "member";
  spaceId: string;
  userId: string;
};

export type CoreExamAccess =
  | { status: "anonymous" }
  | { status: "unauthorized"; email: string }
  | { status: "member"; viewer: CoreExamViewer };

export async function getCoreExamAccess(): Promise<CoreExamAccess> {
  const supabase = await createCoreExamServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { status: "anonymous" };

  const { data: membership } = await supabase
    .from("core_exam_memberships")
    .select("role, status, space_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return { status: "unauthorized", email: user.email };
  }

  const { data: space } = await supabase
    .from("core_exam_spaces")
    .select("slug")
    .eq("id", membership.space_id)
    .eq("slug", "core-exam-1")
    .maybeSingle();
  if (!space) {
    return { status: "unauthorized", email: user.email };
  }

  const { data: profile } = await supabase
    .from("core_exam_profiles")
    .select("display_name, avatar_color")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return { status: "unauthorized", email: user.email };
  }

  return {
    status: "member",
    viewer: {
      avatarColor: profile.avatar_color,
      displayName: profile.display_name,
      email: user.email,
      role: membership.role,
      spaceId: membership.space_id,
      userId: user.id,
    },
  };
}
