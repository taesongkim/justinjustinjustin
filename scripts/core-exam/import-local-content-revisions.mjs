import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

const root = process.cwd();
const pageManifest = JSON.parse(
  await readFile(
    path.join(
      root,
      "core-exam/manifests/content-identity.pages.v1.json",
    ),
    "utf8",
  ),
);
const sourceMapPath =
  process.env.CORE_EXAM_SOURCE_MAP ??
  path.join(root, ".local-archive/core-exam/source-map.json");
const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"));

const sourcedPages = pageManifest.nodes.filter(
  (node) => node.contentStatus !== "collaborative-empty",
);

const pageBodies = [];
for (const page of sourcedPages) {
  const privatePath = sourceMap.sources?.[page.sourceKey];
  if (!privatePath) {
    throw new Error(`Missing private source path for ${page.sourceKey}`);
  }

  const lines = (await readFile(privatePath, "utf8")).split(/\r?\n/);
  const startIndex = page.legacyLine - 1;
  if (!lines[startIndex]?.startsWith("# ")) {
    throw new Error(
      `Page root ${page.stableKey} does not point to a level-one heading`,
    );
  }

  let endIndex = lines.length;
  if (page.kind === "topic") {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].startsWith("# ")) {
        endIndex = index;
        break;
      }
    }
  }

  const markdown = lines.slice(startIndex, endIndex).join("\n").trim();
  const body = {
    type: "canonical-markdown",
    markdown,
    source: {
      key: page.sourceKey,
      legacyLine: page.legacyLine,
    },
  };
  const bodySha256 = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
  const plainText = markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~`>|]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  pageBodies.push({
    body,
    bodySha256,
    markdown,
    plainText,
    stableKey: page.stableKey,
  });
}

const { apiUrl, serviceRoleKey } = await resolveAdminTarget();

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .select("id")
  .eq("slug", pageManifest.spaceKey)
  .single();
if (spaceError) throw spaceError;

const { data: ownerMembership, error: ownerError } = await admin
  .from("core_exam_memberships")
  .select("user_id")
  .eq("space_id", space.id)
  .eq("role", "owner")
  .eq("status", "active")
  .limit(1)
  .single();
if (ownerError) throw ownerError;

const { data: nodes, error: nodesError } = await admin
  .from("core_exam_content_nodes")
  .select("id,stable_key,current_revision_id")
  .eq("space_id", space.id)
  .in(
    "stable_key",
    pageBodies.map((page) => page.stableKey),
  );
if (nodesError) throw nodesError;
if (nodes.length !== pageBodies.length) {
  throw new Error(
    `Expected ${pageBodies.length} sourced page nodes; found ${nodes.length}. Run core-exam:import-content-nodes first.`,
  );
}

const nodesByKey = new Map(nodes.map((node) => [node.stable_key, node]));
const currentRevisionIds = nodes
  .map((node) => node.current_revision_id)
  .filter(Boolean);
const currentRevisions = currentRevisionIds.length
  ? await admin
      .from("core_exam_content_revisions")
      .select("id,node_id,body_sha256")
      .in("id", currentRevisionIds)
  : { data: [], error: null };
if (currentRevisions.error) throw currentRevisions.error;
const currentById = new Map(
  currentRevisions.data.map((revision) => [revision.id, revision]),
);

let created = 0;
let revised = 0;
let unchanged = 0;

for (const page of pageBodies) {
  const node = nodesByKey.get(page.stableKey);
  const current = node.current_revision_id
    ? currentById.get(node.current_revision_id)
    : null;
  if (current?.body_sha256 === page.bodySha256) {
    unchanged += 1;
    continue;
  }

  const { data: latestRevision, error: latestError } = await admin
    .from("core_exam_content_revisions")
    .select("id,revision_number")
    .eq("node_id", node.id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;

  const { data: inserted, error: insertError } = await admin
    .from("core_exam_content_revisions")
    .insert({
      based_on_revision_id: latestRevision?.id ?? null,
      body: page.body,
      body_sha256: page.bodySha256,
      edit_summary: latestRevision
        ? "Refresh canonical Markdown from the approved private source"
        : "Import canonical Markdown from the approved private source",
      edited_by: ownerMembership.user_id,
      node_id: node.id,
      plain_text: page.plainText,
      revision_number: (latestRevision?.revision_number ?? 0) + 1,
      schema_version: "core-exam-v1",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { error: advanceError } = await admin
    .from("core_exam_content_nodes")
    .update({
      current_revision_id: inserted.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", node.id);
  if (advanceError) throw advanceError;

  if (latestRevision) revised += 1;
  else created += 1;
}

console.log(
  `Canonical Markdown revisions: ${created} created, ${revised} revised, ${unchanged} unchanged.`,
);
console.log(
  `${pageBodies.length} sourced reader pages are current; collaborative-empty topics were skipped.`,
);
