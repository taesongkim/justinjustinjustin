import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import identityManifest from "@/core-exam/manifests/content-identity.v1.json";

type SourceMap = {
  sources: Record<string, string>;
};

type PrivateTopicResult = {
  available: boolean;
  markdown: string;
};

export async function loadPrivateTopic(
  stableKey: string,
): Promise<PrivateTopicResult> {
  const node = identityManifest.nodes.find(
    (candidate) => candidate.stableKey === stableKey,
  );
  if (!node) return { available: false, markdown: "" };

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
    if (!privatePath) return { available: false, markdown: "" };

    const lines = (await readFile(privatePath, "utf8")).split(/\r?\n/);
    const startIndex = node.legacyLine - 1;
    let endIndex = lines.length;

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].startsWith("# ")) {
        endIndex = index;
        break;
      }
    }

    return {
      available: true,
      markdown: lines.slice(startIndex, endIndex).join("\n").trim(),
    };
  } catch {
    return { available: false, markdown: "" };
  }
}
