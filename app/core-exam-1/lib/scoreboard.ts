import "server-only";

import { createCoreExamServerClient } from "./supabase/server";
import { ASSISTANT_AVATAR_COLOR } from "./hue";

export type ScoreboardMember = {
  userId: string;
  firstName: string;
  displayName: string;
  avatarColor: string;
  // answered = questions this member has answered, counted only within their
  // own active set. active = non-archived questions minus the ones this member
  // has hidden for themselves. So answered ≤ active always.
  answered: number;
  active: number;
  isViewer: boolean;
  isAssistant: boolean;
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
    .select("user_id, joined_at")
    .eq("space_id", spaceId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (membershipError) throw membershipError;
  const memberIds = (memberships ?? []).map((row) => row.user_id);
  if (!memberIds.length) return [];

  const [
    { data: profiles },
    { data: questions },
    { data: answers },
    { data: hiddenMarks },
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
      .from("core_exam_answers")
      .select("question_id, author_id")
      .eq("space_id", spaceId)
      .is("archived_at", null),
    supabase
      .from("core_exam_question_hidden_marks")
      .select("question_id, user_id")
      .eq("space_id", spaceId),
  ]);

  const questionIds = new Set((questions ?? []).map((row) => row.id));
  const totalQuestions = questionIds.size;

  const hiddenByUser = new Map<string, Set<string>>();
  for (const mark of hiddenMarks ?? []) {
    if (!questionIds.has(mark.question_id)) continue;
    const set = hiddenByUser.get(mark.user_id) ?? new Set<string>();
    set.add(mark.question_id);
    hiddenByUser.set(mark.user_id, set);
  }

  const answeredByUser = new Map<string, Set<string>>();
  for (const answer of answers ?? []) {
    if (!questionIds.has(answer.question_id)) continue;
    const set = answeredByUser.get(answer.author_id) ?? new Set<string>();
    set.add(answer.question_id);
    answeredByUser.set(answer.author_id, set);
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile]),
  );

  return memberIds.map((userId) => {
    const profile = profilesById.get(userId);
    const hiddenSet = hiddenByUser.get(userId) ?? new Set<string>();
    const answeredSet = answeredByUser.get(userId) ?? new Set<string>();
    const active = totalQuestions - hiddenSet.size;
    let answered = 0;
    for (const questionId of answeredSet) {
      if (!hiddenSet.has(questionId)) answered += 1;
    }
    const displayName = profile?.display_name ?? "Study member";
    const avatarColor = profile?.avatar_color ?? ASSISTANT_AVATAR_COLOR;
    return {
      userId,
      firstName: displayName.split(/\s+/)[0] ?? displayName,
      displayName,
      avatarColor,
      answered,
      active,
      isViewer: userId === viewerId,
      isAssistant: avatarColor.toLowerCase() === ASSISTANT_AVATAR_COLOR,
    } satisfies ScoreboardMember;
  });
}
