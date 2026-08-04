import "server-only";

import { createCoreExamServerClient } from "./supabase/server";

export type ContributionKind = "definition" | "note";
export type ContributionVisibility = "group" | "private";

export type ContentContribution = {
  authorId: string;
  authorName: string;
  authorColor: string | null;
  currentRevisionId: string;
  editedAt: string;
  id: string;
  isMine: boolean;
  kind: ContributionKind;
  nodeId: string;
  plainText: string;
  stableKey: string;
  visibility: ContributionVisibility;
};

export type PageContributions = Record<string, ContentContribution[]>;

export async function loadPageContributions(
  pageStableKey: string,
  viewerId: string,
): Promise<PageContributions> {
  const supabase = await createCoreExamServerClient();
  const { data: nodes, error: nodeError } = await supabase
    .from("core_exam_content_nodes")
    .select("id,stable_key")
    .or(
      `stable_key.eq.${pageStableKey},stable_key.like.${pageStableKey}.%`,
    )
    .is("archived_at", null);
  if (nodeError) throw nodeError;
  if (!nodes?.length) return {};

  const { data: contributions, error: contributionError } = await supabase
    .from("core_exam_contributions")
    .select(
      "id,target_node_id,author_id,kind,visibility,current_revision_id,updated_at",
    )
    .in(
      "target_node_id",
      nodes.map((node) => node.id),
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (contributionError) throw contributionError;
  if (!contributions?.length) return {};

  const revisionIds = contributions
    .map((contribution) => contribution.current_revision_id)
    .filter((id): id is string => Boolean(id));
  const authorIds = [
    ...new Set(contributions.map((contribution) => contribution.author_id)),
  ];
  const [{ data: revisions }, { data: profiles }] = await Promise.all([
    supabase
      .from("core_exam_contribution_revisions")
      .select("id,plain_text,created_at")
      .in("id", revisionIds),
    supabase
      .from("core_exam_profiles")
      .select("user_id,display_name,avatar_color")
      .in("user_id", authorIds),
  ]);

  const nodesById = new Map(
    nodes.map((node) => [node.id, node.stable_key]),
  );
  const revisionsById = new Map(
    (revisions ?? []).map((revision) => [revision.id, revision]),
  );
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
  const grouped: PageContributions = {};

  for (const contribution of contributions) {
    const stableKey = nodesById.get(contribution.target_node_id);
    const revision = revisionsById.get(contribution.current_revision_id);
    if (!stableKey || !revision) continue;
    grouped[stableKey] ??= [];
    grouped[stableKey].push({
      authorId: contribution.author_id,
      authorName:
        names.get(contribution.author_id) ?? "Study member",
      authorColor: colors.get(contribution.author_id) ?? null,
      currentRevisionId: contribution.current_revision_id,
      editedAt: revision.created_at,
      id: contribution.id,
      isMine: contribution.author_id === viewerId,
      kind: contribution.kind as ContributionKind,
      nodeId: contribution.target_node_id,
      plainText: revision.plain_text,
      stableKey,
      visibility: contribution.visibility as ContributionVisibility,
    });
  }

  for (const items of Object.values(grouped)) {
    items.sort(
      (left, right) =>
        Number(right.isMine) - Number(left.isMine) ||
        new Date(right.editedAt).getTime() -
          new Date(left.editedAt).getTime(),
    );
  }
  return grouped;
}
