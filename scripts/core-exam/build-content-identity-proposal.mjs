import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pageManifestPath = path.join(
  root,
  "core-exam/manifests/content-identity.pages.v1.json",
);
const sourceMapPath = path.join(
  root,
  ".local-archive/core-exam/source-map.json",
);
const outputPath = path.join(
  root,
  "core-exam/manifests/content-identity.v1.json",
);

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const [pageManifest, sourceMap] = await Promise.all([
  readJson(pageManifestPath),
  readJson(sourceMapPath),
]);

const citationPattern =
  /\[((?:(?:K(?: chart)?|J|P|PL|ICE|T)\s[^\]\n]+)|(?:School\s+(?:Leaving|Merging|Enduring|Aggressive|Rigid)\s+Notes\s+[^\]\n]+)|(?:(?:register|crosswalk)\s[^\]\n]+))\]/g;
const separatorPattern = /^\|(?:\s*:?-+:?\s*\|)+$/;
const listPattern = /^\s*(?:[-*]|\d+\.)\s+(.+)$/;

const slugify = (value) => {
  const slug = value
    .replace(/[*_`~]/g, "")
    .replace(/[🔴🟡⚪◆✅⚠→←↔]/gu, " ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44)
    .replace(/-$/g, "");

  return slug || "untitled";
};

const citationsFrom = (value) => [...value.matchAll(citationPattern)].map(
  (match) => match[0],
);

const firstLabel = (value) => {
  const bold = value.match(/^\s*(?:[-*]|\d+\.)?\s*\*\*([^*]{1,80})\*\*/);
  if (bold) return slugify(bold[1]);

  const label = value.match(
    /^\s*(?:[-*]|\d+\.)?\s*([A-Z][A-Za-z0-9 /'’()-]{1,52}):/,
  );
  return label ? slugify(label[1]) : undefined;
};

const semanticSummary = (value) => {
  const withoutCitations = value
    .replace(citationPattern, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
    .replace(/[*_`~"“”'‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const firstClause = withoutCitations.split(/[.;:!?](?:\s|$)/)[0];
  return slugify(firstClause);
};

const keyCollisions = [];

const uniqueKey = (base, usedKeys) => {
  let candidate = base;
  let suffix = 2;
  while (usedKeys.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  if (candidate !== base) {
    keyCollisions.push({ requestedKey: base, resolvedKey: candidate });
  }
  usedKeys.add(candidate);
  return candidate;
};

const claimKey = ({ pageKey, sectionSlug, label, citations, usedKeys }) => {
  const base = `${pageKey}.claim.${sectionSlug}.${label}`;
  const citationQualified =
    usedKeys.has(base) && citations.length > 0
      ? `${base}.${slugify(citations[0])}`
      : base;
  return uniqueKey(citationQualified, usedKeys);
};

const sourceCache = new Map();
const loadSourceLines = async (sourceKey) => {
  if (sourceCache.has(sourceKey)) return sourceCache.get(sourceKey);
  const privatePath = sourceMap.sources[sourceKey];
  if (!privatePath) throw new Error(`Missing private source for ${sourceKey}`);
  const lines = (await readFile(privatePath, "utf8")).split(/\r?\n/);
  sourceCache.set(sourceKey, lines);
  return lines;
};

const usedKeys = new Set(pageManifest.nodes.map((node) => node.stableKey));
const proposedNodes = pageManifest.nodes.map((node) => ({ ...node }));
const counts = {
  topic: pageManifest.nodes.filter((node) => node.kind === "topic").length,
  reference: pageManifest.nodes.filter((node) => node.kind === "reference")
    .length,
  section: 0,
  claim: 0,
  table: 0,
  chart_row: 0,
  reference_entry: 0,
};

for (const page of pageManifest.nodes) {
  if (page.contentStatus === "collaborative-empty") continue;
  const lines = await loadSourceLines(page.sourceKey);
  const start = page.legacyLine - 1;
  let end = lines.length;

  if (page.kind === "topic") {
    for (let index = start + 1; index < lines.length; index += 1) {
      if (lines[index].startsWith("# ")) {
        end = index;
        break;
      }
    }
  }

  let currentParent = page.stableKey;
  let currentSectionSlug = "overview";
  let index = start + 1;

  while (index < end) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (!line.trim() || /^---+$/.test(line.trim())) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      currentSectionSlug = slugify(heading[2]);
      const stableKey = uniqueKey(
        `${page.stableKey}.section.${currentSectionSlug}`,
        usedKeys,
      );
      proposedNodes.push({
        stableKey,
        kind: "section",
        parentStableKey: page.stableKey,
        sourceKey: page.sourceKey,
        legacyLine: lineNumber,
        headingLevel: heading[1].length,
      });
      counts.section += 1;
      currentParent = stableKey;
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const tableStart = index;
      const tableLines = [];
      while (index < end && lines[index].startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const headerLabel = slugify(
        tableLines[0].split("|").slice(1, 3).join(" ") || "table",
      );
      const tableKey = uniqueKey(
        `${page.stableKey}.table.${currentSectionSlug}.${headerLabel}`,
        usedKeys,
      );
      proposedNodes.push({
        stableKey: tableKey,
        kind: "table",
        parentStableKey: currentParent,
        sourceKey: page.sourceKey,
        legacyLine: tableStart + 1,
      });
      counts.table += 1;

      let rowOrdinal = 0;
      for (let rowIndex = 2; rowIndex < tableLines.length; rowIndex += 1) {
        if (separatorPattern.test(tableLines[rowIndex])) continue;
        rowOrdinal += 1;
        const rowKind =
          page.stableKey === "reference.kessler-chart"
            ? "chart_row"
            : "reference_entry";
        const cells = tableLines[rowIndex]
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        const rowLabel = slugify(
          cells.find((cell) => cell && !/^\d+$/.test(cell)) ??
            `row-${rowOrdinal}`,
        );
        const stableKey = uniqueKey(
          `${tableKey}.${rowLabel}`,
          usedKeys,
        );
        proposedNodes.push({
          stableKey,
          kind: rowKind,
          parentStableKey: tableKey,
          sourceKey: page.sourceKey,
          legacyLine: tableStart + rowIndex + 1,
          citations: citationsFrom(tableLines[rowIndex]),
        });
        counts[rowKind] += 1;
      }
      continue;
    }

    const listItem = line.match(listPattern);
    if (listItem) {
      const citations = citationsFrom(line);
      if (citations.length > 0) {
        const label = firstLabel(line) ?? semanticSummary(line);
        const stableKey = claimKey({
          pageKey: page.stableKey,
          sectionSlug: currentSectionSlug,
          label,
          citations,
          usedKeys,
        });
        proposedNodes.push({
          stableKey,
          kind: "claim",
          parentStableKey: currentParent,
          sourceKey: page.sourceKey,
          legacyLine: lineNumber,
          citations,
        });
        counts.claim += 1;
      }
      index += 1;
      continue;
    }

    const paragraphStart = index;
    const paragraphLines = [];
    while (
      index < end &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^---+$/.test(lines[index].trim()) &&
      !lines[index].startsWith("|") &&
      !listPattern.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    const paragraph = paragraphLines.join(" ");
    const citations = citationsFrom(paragraph);
    if (citations.length > 0) {
      const label = firstLabel(paragraph) ?? semanticSummary(paragraph);
      const stableKey = claimKey({
        pageKey: page.stableKey,
        sectionSlug: currentSectionSlug,
        label,
        citations,
        usedKeys,
      });
      proposedNodes.push({
        stableKey,
        kind: "claim",
        parentStableKey: currentParent,
        sourceKey: page.sourceKey,
        legacyLine: paragraphStart + 1,
        citations,
      });
      counts.claim += 1;
    }
  }
}

const proposal = {
  manifestVersion: 1,
  spaceKey: pageManifest.spaceKey,
  scope: "canonical-addressable-blocks",
  status: "approved-2026-07-29",
  generatedFrom: "content-identity.pages.v1.json",
  generationPolicy:
    "Frozen proposal: do not regenerate after review without preserving existing keys or adding aliases.",
  reviewNotes: {
    keyCollisions,
  },
  counts,
  nodes: proposedNodes,
};

await writeFile(outputPath, `${JSON.stringify(proposal, null, 2)}\n`);

console.log(
  `Wrote ${proposedNodes.length} nodes to ${path.relative(root, outputPath)}.`,
);
console.log(JSON.stringify(counts, null, 2));
