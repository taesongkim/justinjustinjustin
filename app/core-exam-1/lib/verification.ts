import "server-only";

import { createCoreExamServerClient } from "./supabase/server";

export type VerificationState = "verified" | "flagged" | "unverified";

export type VerificationEventSummary = {
  actorId: string;
  actorName: string;
  actorColor: string | null;
  createdAt: string;
  id: string;
  note: string | null;
  state: VerificationState;
};

export type ContentVerification = {
  current: VerificationEventSummary | null;
  history: VerificationEventSummary[];
  kind: string;
  nodeId: string;
  stableKey: string;
};

export type PageVerifications = Record<string, ContentVerification>;

export async function loadPageVerifications(
  pageStableKey: string,
): Promise<PageVerifications> {
  const supabase = await createCoreExamServerClient();
  const { data: nodes, error: nodeError } = await supabase
    .from("core_exam_content_nodes")
    .select("id,stable_key,kind")
    .or(
      `stable_key.eq.${pageStableKey},stable_key.like.${pageStableKey}.%`,
    )
    .is("archived_at", null);
  if (nodeError) throw nodeError;
  if (!nodes?.length) return {};

  const { data: events, error: eventError } = await supabase
    .from("core_exam_verification_events")
    .select("id,content_node_id,state,actor_id,note,created_at")
    .in(
      "content_node_id",
      nodes.map((node) => node.id),
    )
    .order("created_at", { ascending: false });
  if (eventError) throw eventError;

  const actorIds = [
    ...new Set((events ?? []).map((event) => event.actor_id)),
  ];
  const { data: profiles, error: profileError } = actorIds.length
    ? await supabase
        .from("core_exam_profiles")
        .select("user_id,display_name,avatar_color")
        .in("user_id", actorIds)
    : { data: [], error: null };
  if (profileError) throw profileError;

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
  const eventsByNode = new Map<string, VerificationEventSummary[]>();
  for (const event of events ?? []) {
    const history = eventsByNode.get(event.content_node_id) ?? [];
    history.push({
      actorId: event.actor_id,
      actorName: names.get(event.actor_id) ?? "Study member",
      actorColor: colors.get(event.actor_id) ?? null,
      createdAt: event.created_at,
      id: event.id,
      note: event.note,
      state: event.state as VerificationState,
    });
    eventsByNode.set(event.content_node_id, history);
  }

  return Object.fromEntries(
    nodes.map((node) => {
      const history = eventsByNode.get(node.id) ?? [];
      return [
        node.stable_key,
        {
          current: history[0] ?? null,
          history,
          kind: node.kind,
          nodeId: node.id,
          stableKey: node.stable_key,
        } satisfies ContentVerification,
      ];
    }),
  );
}
