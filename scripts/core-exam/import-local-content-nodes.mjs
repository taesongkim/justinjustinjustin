import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

const manifestPath = path.join(
  process.cwd(),
  "core-exam/manifests/content-identity.v1.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const keys = new Set();
const nodesByKey = new Map();
for (const node of manifest.nodes) {
  if (keys.has(node.stableKey)) {
    throw new Error(`Duplicate stable key: ${node.stableKey}`);
  }
  keys.add(node.stableKey);
  nodesByKey.set(node.stableKey, node);
  if (node.parentStableKey && !manifest.nodes.some(
    (candidate) => candidate.stableKey === node.parentStableKey,
  )) {
    throw new Error(
      `Missing parent ${node.parentStableKey} for ${node.stableKey}`,
    );
  }
}

const depthFor = (node) => {
  let depth = 0;
  let current = node;
  while (current.parentStableKey) {
    depth += 1;
    current = nodesByKey.get(current.parentStableKey);
    if (!current) throw new Error(`Missing parent for ${node.stableKey}`);
  }
  return depth;
};

const { apiUrl, serviceRoleKey } = await resolveAdminTarget();

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .select("id")
  .eq("slug", manifest.spaceKey)
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

const maxDepth = Math.max(...manifest.nodes.map(depthFor));
const idsByKey = new Map();
const chunksOf = (values, size = 75) =>
  Array.from(
    { length: Math.ceil(values.length / size) },
    (_, index) => values.slice(index * size, (index + 1) * size),
  );

for (let depth = 0; depth <= maxDepth; depth += 1) {
  const nodesAtDepth = manifest.nodes.filter((node) => depthFor(node) === depth);
  const { error: upsertError } = await admin
    .from("core_exam_content_nodes")
    .upsert(
      nodesAtDepth.map((node) => ({
        space_id: space.id,
        stable_key: node.stableKey,
        kind: node.kind === "reference" ? "page" : node.kind,
        parent_id: node.parentStableKey
          ? idsByKey.get(node.parentStableKey)
          : null,
        sort_key: String(manifest.nodes.indexOf(node) + 1).padStart(6, "0"),
        created_by: ownerMembership.user_id,
      })),
      { onConflict: "space_id,stable_key" },
    );
  if (upsertError) throw upsertError;

  for (const stableKeys of chunksOf(
    nodesAtDepth.map((node) => node.stableKey),
  )) {
    const { data: inserted, error: readError } = await admin
      .from("core_exam_content_nodes")
      .select("id,stable_key")
      .eq("space_id", space.id)
      .in("stable_key", stableKeys);
    if (readError) throw readError;
    for (const node of inserted) idsByKey.set(node.stable_key, node.id);
  }
}

console.log(
  `Imported ${manifest.nodes.length} stable content nodes into local Supabase.`,
);
console.log("No private source content or service-role credential was stored.");
