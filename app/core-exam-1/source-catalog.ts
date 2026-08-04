import sourceCatalog from "@/core-exam/manifests/source-catalog.v1.json";

export type SourceCategory =
  | "books"
  | "lectures"
  | "school-notes"
  | "canonical-documents"
  | "migration-evidence";

export type PreviewSource = {
  sourceKey: string;
  title: string;
  author: string;
  category: SourceCategory;
  documentType: string;
  kind: "pdf" | "text";
  pageConvention: string;
  provenanceNote: string;
  sortOrder: number;
};

export const PREVIEW_SOURCES: PreviewSource[] = sourceCatalog.sources.map(
  (source) => ({
    sourceKey: source.sourceKey,
    title: source.title,
    author: source.author,
    category: source.category as SourceCategory,
    documentType: source.documentType,
    kind: source.viewerKind as "pdf" | "text",
    pageConvention: source.pageConvention,
    provenanceNote: source.provenanceNote,
    sortOrder: source.sortOrder,
  }),
);

const SOURCE_BY_KEY = new Map(
  PREVIEW_SOURCES.map((source) => [source.sourceKey, source]),
);

export function getPreviewSource(sourceKey: string): PreviewSource | undefined {
  return SOURCE_BY_KEY.get(sourceKey);
}

export function resolveCitationSource(citation: string): {
  source: PreviewSource;
  page?: number;
} | null {
  const inner = citation.slice(1, -1);
  let sourceKey: string | undefined;

  if (/^K(?: chart)?\b/.test(inner)) {
    sourceKey = "book.five-personality-patterns";
  } else if (/^J\b/.test(inner)) {
    sourceKey = "book.character-styles";
  } else if (/^P\b/.test(inner)) {
    sourceKey = "book.core-energetics";
  } else if (/^T\b/.test(inner)) {
    sourceKey = "book.undefended-self";
  } else {
    const schoolPattern = inner.match(
      /^School\s+(Leaving|Merging|Enduring|Aggressive|Rigid)\s+Notes\b/i,
    );
    if (schoolPattern) {
      sourceKey = `school.pattern-notes.${schoolPattern[1].toLowerCase()}`;
    }
  }

  if (!sourceKey) {
    const lecture = inner.match(/^PL\s+(\d+)/);
    if (lecture) {
      const number = Number(lecture[1]);
      sourceKey = [30, 43, 84].includes(number)
        ? `lecture.pathwork-${number}`
        : `lecture.extract-${number}`;
    }
  }

  if (!sourceKey) return null;
  const source = getPreviewSource(sourceKey);
  if (!source) return null;

  const pageMatch = inner.match(/\bp{1,2}\.\s*~?\s*(\d+)/);
  return {
    source,
    page:
      source.kind === "pdf" && pageMatch
        ? Number(pageMatch[1])
        : undefined,
  };
}
