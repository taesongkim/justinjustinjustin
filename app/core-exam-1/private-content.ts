import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import identityManifest from "@/core-exam/manifests/content-identity.v1.json";
import {
  CITATION_PATTERN,
  formatReaderMarkdown,
} from "./format-reader-markdown";
import { createCoreExamServerClient } from "./lib/supabase/server";

type SourceMap = {
  sources: Record<string, string>;
};

type PrivateTopicResult = {
  available: boolean;
  collaborativeEmpty: boolean;
  markdown: string;
};

const verificationMarker = (stableKey: string) =>
  `[Verify](#verify-${stableKey} "Verification status")`;

// Matches a citation token sitting at the very end of a line, plus any
// trailing punctuation/quotes after it. Used to slot the verification marker
// between the copy and a closing citation rather than after the citation.
// Note: CITATION_PATTERN contributes its own inner capture group, so the
// citation is group 1 and the trailing punctuation is group 3.
const trailingCitation = new RegExp(
  `(${CITATION_PATTERN.source})([\\s"'”’).,;:]*)$`,
);

// Places the verification marker at the end of a phrase's copy. When the copy
// closes with a citation, the marker lands just before it so citation identity
// stays intact and the marker never shifts the copy's left edge.
const appendMarker = (content: string, marker: string): string => {
  const match = trailingCitation.exec(content);
  if (match && match.index > 0) {
    const before = content.slice(0, match.index).replace(/\s+$/, "");
    const citation = match[1];
    const tail = match[3] ?? "";
    return `${before} ${marker} ${citation}${tail}`;
  }
  return `${content.replace(/\s+$/, "")} ${marker}`;
};

const annotateAddressableLines = (
  lines: string[],
  pageStableKey: string,
  sourceKey: string,
  pageLegacyLine: number,
) => {
  const annotated = [...lines];
  const addressableNodes = identityManifest.nodes.filter(
    (node) =>
      node.sourceKey === sourceKey &&
      node.legacyLine != null &&
      node.stableKey.startsWith(`${pageStableKey}.`) &&
      "parentStableKey" in node,
  );

  for (const node of addressableNodes) {
    if (node.legacyLine == null) continue;
    const index = node.legacyLine - pageLegacyLine;
    const line = annotated[index];
    if (line === undefined) continue;
    const marker = verificationMarker(node.stableKey);

    if (/^#{1,4}\s+/.test(line)) {
      annotated[index] = line.replace(
        /^(#{1,4}\s+)(.*)$/,
        (_full, prefix: string, rest: string) =>
          `${prefix}${appendMarker(rest, marker)}`,
      );
    } else if (line.startsWith("|")) {
      // Sit the marker at the end of the row, before its closing pipe.
      annotated[index] = /\|\s*$/.test(line)
        ? line.replace(/\s*\|\s*$/, ` ${marker} |`)
        : `${line.replace(/\s+$/, "")} ${marker}`;
    } else if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      annotated[index] = line.replace(
        /^(\s*(?:[-*]|\d+\.)\s+)(.*)$/,
        (_full, prefix: string, rest: string) =>
          `${prefix}${appendMarker(rest, marker)}`,
      );
    } else {
      annotated[index] = appendMarker(line, marker);
    }
  }

  return annotated;
};

const renderReaderMarkdown = (
  markdown: string,
  pageStableKey: string,
  sourceKey: string,
  pageLegacyLine: number,
) =>
  formatReaderMarkdown(
    annotateAddressableLines(
      markdown.split(/\r?\n/),
      pageStableKey,
      sourceKey,
      pageLegacyLine,
    ).join("\n"),
    pageStableKey,
  );

const loadCanonicalMarkdownRevision = async (
  stableKey: string,
  spaceId: string,
) => {
  const supabase = await createCoreExamServerClient();
  const { data: contentNode, error: nodeError } = await supabase
    .from("core_exam_content_nodes")
    .select("id,current_revision_id")
    .eq("space_id", spaceId)
    .eq("stable_key", stableKey)
    .maybeSingle();

  if (nodeError || !contentNode?.current_revision_id) return null;

  const { data: revision, error: revisionError } = await supabase
    .from("core_exam_content_revisions")
    .select("body")
    .eq("id", contentNode.current_revision_id)
    .eq("node_id", contentNode.id)
    .maybeSingle();
  if (revisionError || !revision) return null;

  const body = revision.body;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    body.type !== "canonical-markdown" ||
    typeof body.markdown !== "string"
  ) {
    return null;
  }

  return body.markdown;
};

export async function loadPrivateReaderPage(
  stableKey: string,
  spaceId: string,
): Promise<PrivateTopicResult> {
  const node = identityManifest.nodes.find(
    (candidate) => candidate.stableKey === stableKey,
  );
  if (!node) {
    return {
      available: false,
      collaborativeEmpty: false,
      markdown: "",
    };
  }
  if (
    "contentStatus" in node &&
    node.contentStatus === "collaborative-empty"
  ) {
    return {
      available: false,
      collaborativeEmpty: true,
      markdown: "",
    };
  }
  if (!node.sourceKey || !node.legacyLine) {
    return {
      available: false,
      collaborativeEmpty: false,
      markdown: "",
    };
  }

  const canonicalMarkdown = await loadCanonicalMarkdownRevision(
    stableKey,
    spaceId,
  );
  if (canonicalMarkdown) {
    return {
      available: true,
      collaborativeEmpty: false,
      markdown: renderReaderMarkdown(
        canonicalMarkdown,
        stableKey,
        node.sourceKey,
        node.legacyLine,
      ),
    };
  }

  if (process.env.NODE_ENV !== "development") {
    return {
      available: false,
      collaborativeEmpty: false,
      markdown: "",
    };
  }

  const sourceMapPath =
    process.env.CORE_EXAM_SOURCE_MAP ??
    path.join(
      process.cwd(),
      ".local-archive/core-exam/source-map.json",
    );

  try {
    const sourceMap = JSON.parse(
      await readFile(sourceMapPath, "utf8"),
    ) as SourceMap;
    const privatePath = sourceMap.sources[node.sourceKey];
    if (!privatePath) {
      return {
        available: false,
        collaborativeEmpty: false,
        markdown: "",
      };
    }

    const lines = (await readFile(privatePath, "utf8")).split(/\r?\n/);
    const startIndex = node.legacyLine - 1;
    let endIndex = lines.length;

    if (node.kind === "topic") {
      for (let index = startIndex + 1; index < lines.length; index += 1) {
        if (lines[index].startsWith("# ")) {
          endIndex = index;
          break;
        }
      }
    }

    const markdown = lines.slice(startIndex, endIndex).join("\n").trim();

    return {
      available: true,
      collaborativeEmpty: false,
      markdown: renderReaderMarkdown(
        markdown,
        stableKey,
        node.sourceKey,
        node.legacyLine,
      ),
    };
  } catch {
    return {
      available: false,
      collaborativeEmpty: false,
      markdown: "",
    };
  }
}
