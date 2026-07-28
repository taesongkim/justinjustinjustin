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
const editorSchemaPath = path.join(root, "core-exam/editor-schema.v1.json");
const sourceMapPath = path.join(
  root,
  ".local-archive/core-exam/source-map.json",
);

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const [inventory, identity, editorSchema] = await Promise.all([
  readJson(inventoryPath),
  readJson(identityPath),
  readJson(editorSchemaPath),
]);

const errors = [];
const sourceKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const stableKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const checksumPattern = /^[a-f0-9]{64}$/;

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

const sourceKeys = new Set(inventory.sources.map((source) => source.sourceKey));

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

for (const node of identity.nodes) {
  if (!stableKeyPattern.test(node.stableKey)) {
    errors.push(`Invalid stable key: ${node.stableKey}`);
  }
  if (!sourceKeys.has(node.sourceKey)) {
    errors.push(
      `Unknown source key ${node.sourceKey} on ${node.stableKey}`,
    );
  }
  if (!Number.isInteger(node.legacyLine) || node.legacyLine <= 0) {
    errors.push(`Invalid legacy line on ${node.stableKey}`);
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
    const contents = privateContents.get(node.sourceKey);
    if (!contents) continue;
    const lines = contents.toString("utf8").split(/\r?\n/);
    const legacyLine = lines[node.legacyLine - 1];
    if (!legacyLine?.startsWith("# ")) {
      errors.push(
        `Legacy locator for ${node.stableKey} is not a level-one heading`,
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
    `Validated ${inventory.sources.length} sources, ${identity.nodes.length} stable keys, editor schema${fileSuffix}.`,
  );
}
