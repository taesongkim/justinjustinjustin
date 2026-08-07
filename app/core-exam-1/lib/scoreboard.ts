import "server-only";

import { createCoreExamServerClient } from "./supabase/server";
import { ASSISTANT_AVATAR_COLOR } from "./hue";

export type ScoreboardMember = {
  userId: string;
  firstName: string;
  displayName: string;
  avatarColor: string;
  // Exam-prep progress: likely = questions this member marked "likely to be
  // tested"; likelyAtLevel3 = of those, how many they've brought to mastery
  // level 3 or higher. So likelyAtLevel3 ≤ likely always.
  likely: number;
  likelyAtLevel3: number;
  isViewer: boolean;
  isAssistant: boolean;
  participation: "assistant" | "active" | "observer";
};

// Per-member progress across the whole study space, for the top-bar
// mini-scoreboard. One row per active member; the assistant is flagged (its
// neutral color) so callers can drop or style it separately.
export async function loadScoreboard(
  spaceId: string,
  viewerId: string,
): Promise<ScoreboardMember[]> {
  const supabase = await createCoreExamServerClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("core_exam_memberships")
    .select("user_id, joined_at, participation")
    .eq("space_id", spaceId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (membershipError) throw membershipError;
  const memberIds = (memberships ?? []).map((row) => row.user_id);
  if (!memberIds.length) return [];
  const participationByUser = new Map(
    (memberships ?? []).map((row) => [row.user_id, row.participation]),
  );

  const [
    { data: profiles },
    { data: questions },
    { data: likelyMarks },
    { data: confidenceRows },
  ] = await Promise.all([
    supabase
      .from("core_exam_profiles")
      .select("user_id, display_name, avatar_color")
      .in("user_id", memberIds),
    supabase
      .from("core_exam_questions")
      .select("id")
      .eq("space_id", spaceId)
      .is("archived_at", null),
    supabase
      .from("core_exam_question_likelihood_marks")
      .select("question_id, user_id")
      .eq("likelihood", "likely"),
    supabase
      .from("core_exam_confidence")
      .select("target_id, user_id")
      .eq("target_type", "question")
      .gte("level", 3),
  ]);

  // Restrict to the space's current (non-archived) questions; RLS already
  // scopes the mark/confidence rows to the viewer's space.
  const questionIds = new Set((questions ?? []).map((row) => row.id));

  const likelyByUser = new Map<string, Set<string>>();
  for (const mark of likelyMarks ?? []) {
    if (!questionIds.has(mark.question_id)) continue;
    const set = likelyByUser.get(mark.user_id) ?? new Set<string>();
    set.add(mark.question_id);
    likelyByUser.set(mark.user_id, set);
  }

  const level3ByUser = new Map<string, Set<string>>();
  for (const row of confidenceRows ?? []) {
    if (!questionIds.has(row.target_id)) continue;
    const set = level3ByUser.get(row.user_id) ?? new Set<string>();
    set.add(row.target_id);
    level3ByUser.set(row.user_id, set);
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile]),
  );

  return memberIds.map((userId) => {
    const profile = profilesById.get(userId);
    const likelySet = likelyByUser.get(userId) ?? new Set<string>();
    const level3Set = level3ByUser.get(userId) ?? new Set<string>();
    let likelyAtLevel3 = 0;
    for (const questionId of likelySet) {
      if (level3Set.has(questionId)) likelyAtLevel3 += 1;
    }
    const displayName = profile?.display_name ?? "Study member";
    const avatarColor = profile?.avatar_color ?? ASSISTANT_AVATAR_COLOR;
    return {
      userId,
      firstName: displayName.split(/\s+/)[0] ?? displayName,
      displayName,
      avatarColor,
      likely: likelySet.size,
      likelyAtLevel3,
      isViewer: userId === viewerId,
      isAssistant: avatarColor.toLowerCase() === ASSISTANT_AVATAR_COLOR,
      participation: participationByUser.get(userId) ?? "active",
    } satisfies ScoreboardMember;
  });
}
