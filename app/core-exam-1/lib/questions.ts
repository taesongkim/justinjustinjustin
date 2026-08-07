import "server-only";

import { createCoreExamServerClient } from "./supabase/server";

export type QuestionLikelihood = "likely" | "unsure" | "unlikely";

export type CardComment = {
  authorId: string;
  authorName: string;
  authorColor: string | null;
  body: string;
  createdAt: string;
  id: string;
  parentCommentId: string | null;
};

export type QuestionAnswerSummary = {
  authorId: string | null;
  authorName: string;
  authorColor: string | null;
  comments: CardComment[];
  currentRevisionId: string;
  editedAt: string;
  editedByName: string;
  id: string;
  plainText: string;
  visibility: "group" | "private";
};

export type TopicQuestion = {
  groupAnswers: QuestionAnswerSummary[];
  // user_ids of everyone with a (non-archived) answer, any visibility — for the
  // group answer-status rings (participation only, not content).
  answeredBy: string[];
  createdAt: string;
  hiddenBy: Array<{ id: string; name: string }>;
  id: string;
  likelihood: Record<QuestionLikelihood, Array<{ id: string; name: string }>>;
  myAnswer: QuestionAnswerSummary | null;
  isHiddenForMe: boolean;
  myLikelihood: QuestionLikelihood | null;
  // Per-member 1–5 confidence for the group rings, and the viewer's own level.
  confidenceByUser: Record<string, number>;
  myConfidence: number | null;
  origin: "curated" | "submitted";
  prompt: string;
  questionComments: CardComment[];
  rank: number;
  submittedByName: string | null;
  submittedByColor: string | null;
};

export async function loadTopicQuestions(
  topicStableKey: string,
  viewerId: string,
): Promise<TopicQuestion[]> {
  const supabase = await createCoreExamServerClient();
  const { data: topic } = await supabase
    .from("core_exam_content_nodes")
    .select("id")
    .eq("stable_key", topicStableKey)
    .eq("kind", "topic")
    .maybeSingle();
  if (!topic) return [];

  const { data: questions, error: questionError } = await supabase
    .from("core_exam_questions")
    .select("id, origin, prompt, rank, submitted_by, created_at")
    .eq("topic_node_id", topic.id)
    .is("archived_at", null)
    .order("rank")
    .order("created_at");
  if (questionError) throw questionError;
  if (!questions?.length) return [];

  const questionIds = questions.map((question) => question.id);
  const { data: answers, error: answerError } = await supabase
    .from("core_exam_answers")
    .select(
      "id, question_id, author_id, visibility, current_revision_id",
    )
    .in("question_id", questionIds)
    .is("archived_at", null);
  if (answerError) throw answerError;

  const revisionIds = (answers ?? [])
    .map((answer) => answer.current_revision_id)
    .filter((id): id is string => Boolean(id));
  const authorIds = new Set(
    [
      ...questions.map((question) => question.submitted_by),
      ...(answers ?? []).map((answer) => answer.author_id),
    ].filter((id): id is string => Boolean(id)),
  );
  const answerIds = (answers ?? []).map((answer) => answer.id);

  const [
    { data: revisions },
    { data: marks, error: markError },
    { data: questionComments, error: questionCommentError },
    { data: answerComments, error: answerCommentError },
    { data: hiddenMarks, error: hiddenMarkError },
    { data: confidenceRows },
  ] =
    await Promise.all([
      revisionIds.length
        ? supabase
            .from("core_exam_answer_revisions")
            .select("id, plain_text, created_at, edited_by")
            .in("id", revisionIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("core_exam_question_likelihood_marks")
        .select("question_id, user_id, likelihood")
        .in("question_id", questionIds),
      supabase
        .from("core_exam_comments")
        .select(
          "id, question_id, answer_id, author_id, parent_comment_id, body, created_at",
        )
        .in("question_id", questionIds)
        .order("created_at"),
      answerIds.length
        ? supabase
            .from("core_exam_comments")
            .select(
              "id, question_id, answer_id, author_id, parent_comment_id, body, created_at",
            )
            .in("answer_id", answerIds)
            .order("created_at")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("core_exam_question_hidden_marks")
        .select("question_id, user_id")
        .in("question_id", questionIds),
      // Confidence is optional/non-critical — never throw on it (a missing
      // migration or hiccup must not 500 the page); degrade to no levels.
      supabase
        .from("core_exam_confidence")
        .select("target_id, user_id, level")
        .eq("target_type", "question")
        .in("target_id", questionIds),
    ]);
  if (markError) throw markError;
  if (questionCommentError) throw questionCommentError;
  if (answerCommentError) throw answerCommentError;
  if (hiddenMarkError) throw hiddenMarkError;
  for (const mark of marks ?? []) authorIds.add(mark.user_id);
  for (const revision of revisions ?? []) authorIds.add(revision.edited_by);
  for (const comment of [
    ...(questionComments ?? []),
    ...(answerComments ?? []),
  ]) {
    authorIds.add(comment.author_id);
  }
  for (const mark of hiddenMarks ?? []) authorIds.add(mark.user_id);
  for (const row of confidenceRows ?? []) authorIds.add(row.user_id);

  const { data: profiles } = authorIds.size
    ? await supabase
        .from("core_exam_profiles")
        .select("user_id, display_name, avatar_color")
        .in("user_id", [...authorIds])
    : { data: [] };

  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile.display_name,
    ]),
  );
  const colors = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile.avatar_color,
    ]),
  );
  const revisionById = new Map(
    (revisions ?? []).map((revision) => [revision.id, revision]),
  );
  const summarizeComments = (
    comments: Array<{
      author_id: string;
      body: string;
      created_at: string;
      id: string;
      parent_comment_id: string | null;
    }>,
  ): CardComment[] =>
    comments.map((comment) => ({
      authorId: comment.author_id,
      authorName: names.get(comment.author_id) ?? "Study member",
      authorColor: colors.get(comment.author_id) ?? null,
      body: comment.body,
      createdAt: comment.created_at,
      id: comment.id,
      parentCommentId: comment.parent_comment_id,
    }));

  return questions.map((question) => {
    const questionAnswers = (answers ?? []).filter(
      (answer) => answer.question_id === question.id,
    );
    const summaries = questionAnswers.map(
      (answer): QuestionAnswerSummary => ({
        authorId: answer.author_id,
        authorName: answer.author_id
          ? (names.get(answer.author_id) ?? "Study member")
          : "Core Exam group",
        authorColor: answer.author_id
          ? (colors.get(answer.author_id) ?? null)
          : null,
        comments: summarizeComments(
          (answerComments ?? []).filter(
            (comment) => comment.answer_id === answer.id,
          ),
        ),
        currentRevisionId: answer.current_revision_id,
        id: answer.id,
        editedAt:
          revisionById.get(answer.current_revision_id)?.created_at ?? "",
        editedByName:
          names.get(
            revisionById.get(answer.current_revision_id)?.edited_by ?? "",
          ) ?? "Study member",
        plainText:
          revisionById.get(answer.current_revision_id)?.plain_text ?? "",
        visibility: answer.visibility,
      }),
    );
    const personal = summaries;
    const questionMarks = (marks ?? []).filter(
      (mark) => mark.question_id === question.id,
    );
    const questionHiddenMarks = (hiddenMarks ?? []).filter(
      (mark) => mark.question_id === question.id,
    );
    const confidenceByUser: Record<string, number> = {};
    for (const row of confidenceRows ?? []) {
      if (row.target_id === question.id) {
        confidenceByUser[row.user_id] = row.level;
      }
    }
    const likelihood: TopicQuestion["likelihood"] = {
      likely: [],
      unsure: [],
      unlikely: [],
    };
    for (const mark of questionMarks) {
      likelihood[mark.likelihood as QuestionLikelihood].push({
        id: mark.user_id,
        name: names.get(mark.user_id) ?? "Study member",
      });
    }

    return {
      createdAt: question.created_at,
      groupAnswers: personal.filter(
        (answer) => answer.authorId !== viewerId,
      ),
      answeredBy: [
        ...new Set(
          questionAnswers
            .map((answer) => answer.author_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ],
      hiddenBy: questionHiddenMarks.map((mark) => ({
        id: mark.user_id,
        name: names.get(mark.user_id) ?? "Study member",
      })),
      id: question.id,
      isHiddenForMe: questionHiddenMarks.some(
        (mark) => mark.user_id === viewerId,
      ),
      likelihood,
      myAnswer:
        personal.find((answer) => answer.authorId === viewerId) ?? null,
      myLikelihood:
        (questionMarks.find((mark) => mark.user_id === viewerId)
          ?.likelihood as QuestionLikelihood | undefined) ?? null,
      confidenceByUser,
      myConfidence: confidenceByUser[viewerId] ?? null,
      origin: question.origin,
      prompt: question.prompt,
      questionComments: summarizeComments(
        (questionComments ?? []).filter(
          (comment) => comment.question_id === question.id,
        ),
      ),
      rank: question.rank,
      submittedByName: question.submitted_by
        ? (names.get(question.submitted_by) ?? "Study member")
        : null,
      submittedByColor: question.submitted_by
        ? (colors.get(question.submitted_by) ?? null)
        : null,
    };
  });
}

// The viewer's own confidence for a topic (the topic slider is viewer-only) plus
// the topic node id used as the set-confidence target. Degrades to nulls so a
// missing table/row can never throw.
export async function loadTopicConfidence(
  topicStableKey: string,
  viewerId: string,
): Promise<{ topicNodeId: string | null; myLevel: number | null }> {
  const supabase = await createCoreExamServerClient();
  const { data: topic } = await supabase
    .from("core_exam_content_nodes")
    .select("id")
    .eq("stable_key", topicStableKey)
    .eq("kind", "topic")
    .maybeSingle();
  if (!topic) return { topicNodeId: null, myLevel: null };
  const { data: row } = await supabase
    .from("core_exam_confidence")
    .select("level")
    .eq("target_type", "topic")
    .eq("target_id", topic.id)
    .eq("user_id", viewerId)
    .maybeSingle();
  return { topicNodeId: topic.id, myLevel: row?.level ?? null };
}

// Per-topic counts for the viewer's "Topic progress" toggle: how many questions
// they marked "likely", and how many of those sit at mastery level 3 or higher
// (the study-ready threshold). Computed with a few lightweight, space-scoped
// queries plus JS aggregation — no per-topic round-trips and no new RPC.
// Degrades to {} on any failure so the sidebar simply omits the badges.
export type TopicProgress = { likely: number; likelyAtLevel3: number };

export async function loadTopicProgress(
  viewerId: string,
): Promise<Record<string, TopicProgress>> {
  try {
    const supabase = await createCoreExamServerClient();

    const [{ data: topicNodes }, { data: questions }, { data: likelyMarks }, { data: confidenceRows }] =
      await Promise.all([
        supabase
          .from("core_exam_content_nodes")
          .select("id, stable_key")
          .eq("kind", "topic"),
        supabase.from("core_exam_questions").select("id, topic_node_id"),
        supabase
          .from("core_exam_question_likelihood_marks")
          .select("question_id")
          .eq("user_id", viewerId)
          .eq("likelihood", "likely"),
        supabase
          .from("core_exam_confidence")
          .select("target_id")
          .eq("user_id", viewerId)
          .eq("target_type", "question")
          .gte("level", 3),
      ]);

    if (!topicNodes || topicNodes.length === 0) return {};

    const nodeToStableKey = new Map<string, string>();
    for (const node of topicNodes) {
      nodeToStableKey.set(node.id, node.stable_key);
    }
    const questionToNode = new Map<string, string>();
    for (const question of questions ?? []) {
      questionToNode.set(question.id, question.topic_node_id);
    }
    const atLevel3 = new Set(
      (confidenceRows ?? []).map((row) => row.target_id),
    );

    const progress: Record<string, TopicProgress> = {};
    for (const mark of likelyMarks ?? []) {
      const nodeId = questionToNode.get(mark.question_id);
      const stableKey = nodeId ? nodeToStableKey.get(nodeId) : undefined;
      if (!stableKey) continue;
      const entry = (progress[stableKey] ??= { likely: 0, likelyAtLevel3: 0 });
      entry.likely += 1;
      if (atLevel3.has(mark.question_id)) entry.likelyAtLevel3 += 1;
    }
    return progress;
  } catch (error) {
    console.error("topic progress load failed", error);
    return {};
  }
}
