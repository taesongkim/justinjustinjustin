import "server-only";

import { labelForContentStableKey } from "../content-label";
import { READER_PAGES } from "../topics";
import { createCoreExamServerClient } from "./supabase/server";

export type CoreExamActivityItem = {
  action:
    | "question_submitted"
    | "answer_created"
    | "answer_updated"
    | "comment_added"
    | "likelihood_marked"
    | "question_hidden"
    | "question_shown"
    | "verification_changed"
    | "contribution_created"
    | "contribution_updated";
  actorName: string;
  actorColor: string | null;
  answerId: string | null;
  commentId: string | null;
  contributionId: string | null;
  contentStableKey: string | null;
  createdAt: string;
  id: string;
  isUnviewed: boolean;
  metadata: Record<string, string>;
  prompt: string;
  questionId: string | null;
  topicLabel: string;
  topicStableKey: string;
};

export type CoreExamActivityFeed = {
  events: CoreExamActivityItem[];
  hasUnviewed: boolean;
  latestOtherEventId: string | null;
};

export async function loadGlobalActivity(
  spaceId: string,
  viewerId: string,
): Promise<CoreExamActivityFeed> {
  const supabase = await createCoreExamServerClient();
  const [
    { data: events, error },
    { data: activityView, error: activityViewError },
  ] = await Promise.all([
    supabase
      .from("core_exam_activity_events")
      .select(
        "id, actor_id, action, question_id, answer_id, comment_id, content_node_id, contribution_id, metadata, created_at",
      )
      .eq("space_id", spaceId)
      .eq("visibility", "group")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("core_exam_activity_views")
      .select("last_viewed_event_id")
      .eq("space_id", spaceId)
      .maybeSingle(),
  ]);
  if (error) throw error;
  if (activityViewError) throw activityViewError;
  if (!events?.length) {
    return {
      events: [],
      hasUnviewed: false,
      latestOtherEventId: null,
    };
  }
  const latestOtherEventId =
    events.find((event) => event.actor_id !== viewerId)?.id ?? null;
  const hasUnviewed =
    latestOtherEventId !== null &&
    latestOtherEventId !== activityView?.last_viewed_event_id;
  const unviewedEventIds = new Set<string>();
  if (hasUnviewed) {
    for (const event of events) {
      if (event.id === activityView?.last_viewed_event_id) break;
      if (event.actor_id !== viewerId) unviewedEventIds.add(event.id);
    }
  }

  const actorIds = [...new Set(events.map((event) => event.actor_id))];
  const questionIds = [
    ...new Set(
      events
        .map((event) => event.question_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const contentNodeIds = [
    ...new Set(
      events
        .map((event) => event.content_node_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [
    { data: profiles },
    { data: questions },
    { data: contentNodes },
  ] = await Promise.all([
    supabase
      .from("core_exam_profiles")
      .select("user_id, display_name, avatar_color")
      .in("user_id", actorIds),
    questionIds.length
      ? supabase
          .from("core_exam_questions")
          .select("id, prompt, topic_node_id")
          .in("id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    contentNodeIds.length
      ? supabase
          .from("core_exam_content_nodes")
          .select("id, stable_key")
          .in("id", contentNodeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const topicIds = [
    ...new Set((questions ?? []).map((question) => question.topic_node_id)),
  ];
  const { data: topics } = topicIds.length
    ? await supabase
        .from("core_exam_content_nodes")
        .select("id, stable_key")
        .in("id", topicIds)
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
  const questionsById = new Map(
    (questions ?? []).map((question) => [question.id, question]),
  );
  const topicsById = new Map(
    (topics ?? []).map((topic) => [topic.id, topic.stable_key]),
  );
  const contentNodesById = new Map(
    (contentNodes ?? []).map((node) => [node.id, node.stable_key]),
  );

  const items = events.flatMap((event) => {
    if (event.content_node_id) {
      const contentStableKey = contentNodesById.get(event.content_node_id);
      const page = contentStableKey
        ? READER_PAGES.find(
            (candidate) =>
              contentStableKey === candidate.stableKey ||
              contentStableKey.startsWith(`${candidate.stableKey}.`),
          )
        : null;
      if (!contentStableKey || !page) return [];

      return [
        {
          action: event.action,
          actorName: names.get(event.actor_id) ?? "Study member",
          actorColor: colors.get(event.actor_id) ?? null,
          answerId: null,
          commentId: null,
          contributionId: event.contribution_id,
          contentStableKey,
          createdAt: event.created_at,
          id: event.id,
          isUnviewed: unviewedEventIds.has(event.id),
          metadata: Object.fromEntries(
            Object.entries(event.metadata ?? {}).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
          prompt: labelForContentStableKey(
            contentStableKey,
            page.stableKey,
          ),
          questionId: null,
          topicLabel: page.label,
          topicStableKey: page.stableKey,
        } satisfies CoreExamActivityItem,
      ];
    }

    const question = questionsById.get(event.question_id);
    const topicStableKey = question
      ? topicsById.get(question.topic_node_id)
      : null;
    if (!question || !topicStableKey) return [];

    return [
      {
        action: event.action,
        actorName: names.get(event.actor_id) ?? "Study member",
        actorColor: colors.get(event.actor_id) ?? null,
        answerId: event.answer_id,
        commentId: event.comment_id,
        contributionId: null,
        contentStableKey: null,
        createdAt: event.created_at,
        id: event.id,
        isUnviewed: unviewedEventIds.has(event.id),
        metadata: Object.fromEntries(
          Object.entries(event.metadata ?? {}).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
        prompt: question.prompt,
        questionId: question.id,
        topicLabel: topicStableKey,
        topicStableKey,
      } satisfies CoreExamActivityItem,
    ];
  });

  return { events: items, hasUnviewed, latestOtherEventId };
}
