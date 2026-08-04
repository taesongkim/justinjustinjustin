import "server-only";

import type {
  PreviewSource,
  SourceCategory,
} from "../source-catalog";
import { createCoreExamServerClient } from "./supabase/server";

export type SourceLibraryItem = PreviewSource & {
  assetId: string;
  byteSize: number;
  filename: string;
  versionNumber: number;
};

export type SourceFileRecord = SourceLibraryItem & {
  storageBucket: string;
  storagePath: string;
};

type CatalogRow = {
  asset_id: string;
  author: string;
  category: SourceCategory;
  document_type: string;
  page_convention: string | null;
  provenance_note: string | null;
  sort_key: string;
  source_key: string;
  viewer_kind: "pdf" | "text";
};

type AssetRow = {
  byte_size: number;
  current_version_id: string | null;
  id: string;
  original_filename: string;
  title: string;
};

type VersionRow = {
  asset_id: string;
  id: string;
  storage_bucket: string;
  storage_path: string;
  version_number: number;
};

const toSourceItem = (
  catalog: CatalogRow,
  asset: AssetRow,
  version: VersionRow,
): SourceFileRecord => ({
  assetId: asset.id,
  author: catalog.author,
  byteSize: asset.byte_size,
  category: catalog.category,
  documentType: catalog.document_type,
  filename: asset.original_filename,
  kind: catalog.viewer_kind,
  pageConvention: catalog.page_convention ?? "",
  provenanceNote: catalog.provenance_note ?? "",
  sortOrder: Number(catalog.sort_key),
  sourceKey: catalog.source_key,
  storageBucket: version.storage_bucket,
  storagePath: version.storage_path,
  title: asset.title,
  versionNumber: version.version_number,
});

export async function loadSourceLibrary(
  spaceId: string,
): Promise<SourceLibraryItem[]> {
  const supabase = await createCoreExamServerClient();
  const { data: catalog, error: catalogError } = await supabase
    .from("core_exam_source_catalog")
    .select(
      "asset_id,author,category,document_type,page_convention,provenance_note,sort_key,source_key,viewer_kind",
    )
    .eq("space_id", spaceId)
    .order("sort_key");
  if (catalogError || !catalog?.length) return [];

  const assetIds = catalog.map((entry) => entry.asset_id);
  const { data: assets, error: assetsError } = await supabase
    .from("core_exam_assets")
    .select("byte_size,current_version_id,id,original_filename,title")
    .eq("space_id", spaceId)
    .is("archived_at", null)
    .in("id", assetIds);
  if (assetsError || !assets?.length) return [];

  const versionIds = assets
    .map((asset) => asset.current_version_id)
    .filter((id): id is string => Boolean(id));
  if (versionIds.length === 0) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("core_exam_asset_versions")
    .select(
      "asset_id,id,storage_bucket,storage_path,version_number",
    )
    .in("id", versionIds);
  if (versionsError || !versions?.length) return [];

  const assetsById = new Map(
    (assets as AssetRow[]).map((asset) => [asset.id, asset]),
  );
  const versionsById = new Map(
    (versions as VersionRow[]).map((version) => [version.id, version]),
  );

  return (catalog as CatalogRow[])
    .map((entry) => {
      const asset = assetsById.get(entry.asset_id);
      const version = asset?.current_version_id
        ? versionsById.get(asset.current_version_id)
        : undefined;
      return asset && version ? toSourceItem(entry, asset, version) : null;
    })
    .filter((entry): entry is SourceFileRecord => entry !== null);
}

export async function loadSourceFile(
  spaceId: string,
  sourceKey: string,
): Promise<SourceFileRecord | null> {
  const supabase = await createCoreExamServerClient();
  const { data: catalog, error: catalogError } = await supabase
    .from("core_exam_source_catalog")
    .select(
      "asset_id,author,category,document_type,page_convention,provenance_note,sort_key,source_key,viewer_kind",
    )
    .eq("space_id", spaceId)
    .eq("source_key", sourceKey)
    .maybeSingle();
  if (catalogError || !catalog) return null;

  const { data: asset, error: assetError } = await supabase
    .from("core_exam_assets")
    .select("byte_size,current_version_id,id,original_filename,title")
    .eq("space_id", spaceId)
    .eq("id", catalog.asset_id)
    .is("archived_at", null)
    .maybeSingle();
  if (assetError || !asset?.current_version_id) return null;

  const { data: version, error: versionError } = await supabase
    .from("core_exam_asset_versions")
    .select(
      "asset_id,id,storage_bucket,storage_path,version_number",
    )
    .eq("id", asset.current_version_id)
    .eq("asset_id", asset.id)
    .maybeSingle();
  if (versionError || !version) return null;

  return toSourceItem(
    catalog as CatalogRow,
    asset as AssetRow,
    version as VersionRow,
  );
}
