import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

const root = process.cwd();
const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));
const [inventory, catalog, sourceMap] = await Promise.all([
  readJson(
    path.join(root, "core-exam/manifests/source-inventory.v1.json"),
  ),
  readJson(
    path.join(root, "core-exam/manifests/source-catalog.v1.json"),
  ),
  readJson(
    process.env.CORE_EXAM_SOURCE_MAP ??
      path.join(root, ".local-archive/core-exam/source-map.json"),
  ),
]);

const inventoryByKey = new Map(
  inventory.sources.map((source) => [source.sourceKey, source]),
);
const catalogByKey = new Map(
  catalog.sources.map((source) => [source.sourceKey, source]),
);
if (
  inventory.sources.length !== catalog.sources.length ||
  inventoryByKey.size !== catalogByKey.size
) {
  throw new Error("Source inventory and catalog do not have exact coverage");
}

const preparedSources = [];
for (const source of catalog.sources) {
  const inventorySource = inventoryByKey.get(source.sourceKey);
  const privatePath = sourceMap.sources?.[source.sourceKey];
  if (!inventorySource || !privatePath) {
    throw new Error(`Missing source material for ${source.sourceKey}`);
  }

  const contents = await readFile(privatePath);
  const checksum = createHash("sha256").update(contents).digest("hex");
  if (
    contents.byteLength !== inventorySource.bytes ||
    checksum !== inventorySource.sha256
  ) {
    throw new Error(`Private source validation failed for ${source.sourceKey}`);
  }

  const originalFilename = path.basename(privatePath);
  const storageFilename = originalFilename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  preparedSources.push({
    ...source,
    byteSize: contents.byteLength,
    checksum,
    contents,
    mimeType:
      inventorySource.kind === "pdf"
        ? "application/pdf"
        : "text/plain",
    originalFilename,
    storageFilename: storageFilename || `${source.sourceKey}.txt`,
  });
}

const { apiUrl, serviceRoleKey } = await resolveAdminTarget();

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .select("id")
  .eq("slug", catalog.spaceKey)
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

let created = 0;
let revised = 0;
let unchanged = 0;

for (const source of preparedSources) {
  const { data: catalogRow, error: catalogReadError } = await admin
    .from("core_exam_source_catalog")
    .select("asset_id")
    .eq("space_id", space.id)
    .eq("source_key", source.sourceKey)
    .maybeSingle();
  if (catalogReadError) throw catalogReadError;

  let assetId = catalogRow?.asset_id ?? randomUUID();
  let asset = null;
  let currentVersion = null;
  if (catalogRow) {
    const { data: assetRow, error: assetReadError } = await admin
      .from("core_exam_assets")
      .select("id,current_version_id")
      .eq("id", assetId)
      .single();
    if (assetReadError) throw assetReadError;
    asset = assetRow;

    if (asset.current_version_id) {
      const { data: versionRow, error: versionReadError } = await admin
        .from("core_exam_asset_versions")
        .select("id,version_number,checksum_sha256")
        .eq("id", asset.current_version_id)
        .single();
      if (versionReadError) throw versionReadError;
      currentVersion = versionRow;
    }
  }

  const fileIsCurrent = currentVersion?.checksum_sha256 === source.checksum;
  if (!fileIsCurrent) {
    const versionId = randomUUID();
    const versionNumber = (currentVersion?.version_number ?? 0) + 1;
    const storagePath = [
      "core-exam-1",
      "system",
      "sources",
      assetId,
      versionId,
      source.storageFilename,
    ].join("/");
    const { error: uploadError } = await admin.storage
      .from("core-exam-files")
      .upload(storagePath, source.contents, {
        cacheControl: "3600",
        contentType: source.mimeType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    if (!asset) {
      const { error: assetInsertError } = await admin
        .from("core_exam_assets")
        .insert({
          asset_role: "canonical_source",
          byte_size: source.byteSize,
          checksum_sha256: source.checksum,
          description: source.provenanceNote,
          id: assetId,
          mime_type: source.mimeType,
          original_filename: source.originalFilename,
          space_id: space.id,
          system_managed: true,
          title: source.title,
          uploader_id: ownerMembership.user_id,
          visibility: "group",
        });
      if (assetInsertError) throw assetInsertError;
    }

    const { error: versionInsertError } = await admin
      .from("core_exam_asset_versions")
      .insert({
        asset_id: assetId,
        byte_size: source.byteSize,
        checksum_sha256: source.checksum,
        id: versionId,
        mime_type: source.mimeType,
        storage_bucket: "core-exam-files",
        storage_path: storagePath,
        uploaded_by: ownerMembership.user_id,
        version_number: versionNumber,
      });
    if (versionInsertError) throw versionInsertError;

    const { error: assetAdvanceError } = await admin
      .from("core_exam_assets")
      .update({
        byte_size: source.byteSize,
        checksum_sha256: source.checksum,
        current_version_id: versionId,
        description: source.provenanceNote,
        mime_type: source.mimeType,
        original_filename: source.originalFilename,
        title: source.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId);
    if (assetAdvanceError) throw assetAdvanceError;

    if (currentVersion) revised += 1;
    else created += 1;
  } else {
    const { error: assetMetadataError } = await admin
      .from("core_exam_assets")
      .update({
        description: source.provenanceNote,
        original_filename: source.originalFilename,
        title: source.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId);
    if (assetMetadataError) throw assetMetadataError;
    unchanged += 1;
  }

  const { error: catalogError } = await admin
    .from("core_exam_source_catalog")
    .upsert(
      {
        asset_id: assetId,
        author: source.author,
        category: source.category,
        document_type: source.documentType,
        page_convention: source.pageConvention,
        pdf_page_offset: null,
        provenance_note: source.provenanceNote,
        sort_key: String(source.sortOrder).padStart(6, "0"),
        source_key: source.sourceKey,
        space_id: space.id,
        updated_at: new Date().toISOString(),
        viewer_kind: source.viewerKind,
      },
      { onConflict: "space_id,source_key" },
    );
  if (catalogError) throw catalogError;
}

console.log(
  `Source Library: ${created} created, ${revised} revised, ${unchanged} unchanged.`,
);
console.log(
  `Validated and cataloged ${preparedSources.length} private sources in local Supabase Storage.`,
);
console.log("No private source path or service-role credential was stored.");
