import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const inventoryPath = path.join(
  root,
  "core-exam/manifests/source-inventory.v1.json",
);
const identityPath = path.join(
  root,
  "core-exam/manifests/content-identity.v1.json",
);
const sourceCatalogPath = path.join(
  root,
  "core-exam/manifests/source-catalog.v1.json",
);
const editorSchemaPath = path.join(root, "core-exam/editor-schema.v1.json");
const sourceMapPath = path.join(
  root,
  ".local-archive/core-exam/source-map.json",
);

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const [inventory, identity, sourceCatalog, editorSchema] = await Promise.all([
  readJson(inventoryPath),
  readJson(identityPath),
  readJson(sourceCatalogPath),
  readJson(editorSchemaPath),
]);

const errors = [];
const sourceKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const stableKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const checksumPattern = /^[a-f0-9]{64}$/;
const contentKinds = new Set([
  "chart_row",
  "claim",
  "reference",
  "reference_entry",
  "section",
  "table",
  "topic",
]);

const assertUnique = (values, label) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
};

assertUnique(
  inventory.sources.map((source) => source.sourceKey),
  "source key",
);
assertUnique(
  identity.nodes.map((node) => node.stableKey),
  "stable key",
);
assertUnique(
  sourceCatalog.sources.map((source) => source.sourceKey),
  "source-catalog key",
);

const sourceKeys = new Set(inventory.sources.map((source) => source.sourceKey));
const catalogKeys = new Set(
  sourceCatalog.sources.map((source) => source.sourceKey),
);
const contentKeys = new Set(identity.nodes.map((node) => node.stableKey));

for (const source of inventory.sources) {
  if (!sourceKeyPattern.test(source.sourceKey)) {
    errors.push(`Invalid source key: ${source.sourceKey}`);
  }
  if (!Number.isInteger(source.bytes) || source.bytes <= 0) {
    errors.push(`Invalid byte count for ${source.sourceKey}`);
  }
  if (!checksumPattern.test(source.sha256)) {
    errors.push(`Invalid SHA-256 for ${source.sourceKey}`);
  }
}

for (const source of sourceCatalog.sources) {
  if (!sourceKeyPattern.test(source.sourceKey)) {
    errors.push(`Invalid source-catalog key: ${source.sourceKey}`);
  }
  if (!sourceKeys.has(source.sourceKey)) {
    errors.push(`Catalog source is missing from inventory: ${source.sourceKey}`);
  }
  if (
    !source.title?.trim() ||
    !source.author?.trim() ||
    !source.documentType?.trim() ||
    !["pdf", "text"].includes(source.viewerKind) ||
    !Number.isInteger(source.sortOrder) ||
    source.sortOrder <= 0
  ) {
    errors.push(`Invalid source-catalog entry: ${source.sourceKey}`);
  }
}

for (const sourceKey of sourceKeys) {
  if (!catalogKeys.has(sourceKey)) {
    errors.push(`Inventory source is missing from catalog: ${sourceKey}`);
  }
}

for (const node of identity.nodes) {
  if (!stableKeyPattern.test(node.stableKey)) {
    errors.push(`Invalid stable key: ${node.stableKey}`);
  }
  const isCollaborativeEmpty =
    node.kind === "topic" &&
    node.contentStatus === "collaborative-empty";
  if (isCollaborativeEmpty) {
    if (node.sourceKey != null || node.legacyLine != null) {
      errors.push(
        `Collaborative-empty topic must not have a source locator: ${node.stableKey}`,
      );
    }
    continue;
  }
  if (!sourceKeys.has(node.sourceKey)) {
    errors.push(
      `Unknown source key ${node.sourceKey} on ${node.stableKey}`,
    );
  }
  if (!Number.isInteger(node.legacyLine) || node.legacyLine <= 0) {
    errors.push(`Invalid legacy line on ${node.stableKey}`);
  }
  if (!contentKinds.has(node.kind)) {
    errors.push(`Unsupported content kind ${node.kind} on ${node.stableKey}`);
  }
  if (node.parentStableKey && !contentKeys.has(node.parentStableKey)) {
    errors.push(
      `Unknown parent ${node.parentStableKey} on ${node.stableKey}`,
    );
  }
}

if (editorSchema.schemaVersion !== "core-exam-v1") {
  errors.push("Unexpected editor schema version");
}
if (editorSchema.allowsImages || editorSchema.allowsRawHtml) {
  errors.push("Editor schema must reject images and raw HTML");
}
if (!editorSchema.requiredAddressableAttribute) {
  errors.push("Editor schema must define its stable-key attribute");
}

if (process.argv.includes("--verify-files")) {
  const sourceMap = await readJson(sourceMapPath);
  const mappedKeys = Object.keys(sourceMap.sources);
  const privateContents = new Map();
  assertUnique(mappedKeys, "source-map key");

  for (const source of inventory.sources) {
    const privatePath = sourceMap.sources[source.sourceKey];
    if (!privatePath) {
      errors.push(`Missing private path for ${source.sourceKey}`);
      continue;
    }

    try {
      const fileStat = await stat(privatePath);
      if (fileStat.size !== source.bytes) {
        errors.push(
          `Byte mismatch for ${source.sourceKey}: expected ${source.bytes}, got ${fileStat.size}`,
        );
      }
      const contents = await readFile(privatePath);
      privateContents.set(source.sourceKey, contents);
      const checksum = createHash("sha256").update(contents).digest("hex");
      if (checksum !== source.sha256) {
        errors.push(`Checksum mismatch for ${source.sourceKey}`);
      }
    } catch (error) {
      errors.push(
        `Cannot read ${source.sourceKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (const node of identity.nodes) {
    if (node.contentStatus === "collaborative-empty") continue;
    const contents = privateContents.get(node.sourceKey);
    if (!contents) continue;
    const lines = contents.toString("utf8").split(/\r?\n/);
    const legacyLine = lines[node.legacyLine - 1];
    const locatorMatches =
      node.kind === "topic" || node.kind === "reference"
        ? legacyLine?.startsWith("# ")
        : node.kind === "section"
          ? /^#{1,4}\s+/.test(legacyLine ?? "")
          : node.kind === "table" ||
              node.kind === "chart_row" ||
              node.kind === "reference_entry"
            ? legacyLine?.startsWith("|")
            : Boolean(legacyLine?.trim());
    if (!locatorMatches) {
      errors.push(
        `Legacy locator does not match ${node.kind} ${node.stableKey}`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const fileSuffix = process.argv.includes("--verify-files")
    ? " and private files"
    : "";
  console.log(
    `Validated ${inventory.sources.length} sources and catalog entries, ${identity.nodes.length} stable keys, editor schema${fileSuffix}.`,
  );
}
