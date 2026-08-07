import Link from "next/link";
import type { SourceCategory } from "./source-catalog";
import type { SourceLibraryItem } from "./lib/sources";

const SOURCE_GROUPS: {
  category: SourceCategory;
  description: string;
  label: string;
}[] = [
  {
    category: "books",
    label: "Books",
    description: "Primary books used throughout the study material.",
  },
  {
    category: "lectures",
    label: "Pathwork lectures",
    description: "Lecture PDFs and preserved text extracts.",
  },
  {
    category: "school-notes",
    label: "School notes",
    description: "Direct handouts for the five personality patterns.",
  },
  {
    category: "canonical-documents",
    label: "Canonical study documents",
    description: "The reviewed documents that support the in-site reader.",
  },
  {
    category: "migration-evidence",
    label: "Migration evidence",
    description:
      "Preserved provenance and review artifacts—not canonical study material.",
  },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// The Source Library, rendered inside the main reading pane (the standalone
// /sources route's page chrome — header, identity — is supplied by the frame).
export function SourceLibraryContent({
  sources,
}: {
  sources: SourceLibraryItem[];
}) {
  return (
    <div className="ce-source-library-shell ce-source-library-embedded">
      <header className="ce-source-library-intro">
        <div>
          <p className="ce-eyebrow">Source library</p>
          <h2>Study sources</h2>
          <p>
            Books, lectures, school notes, canonical documents, and migration
            evidence available to this group.
          </p>
        </div>
        <span>{sources.length} sources</span>
      </header>

      {sources.length === 0 ? (
        <section className="ce-source-library-empty">
          <h3>Source library unavailable</h3>
          <p>The private source catalog has not been imported yet.</p>
        </section>
      ) : (
        SOURCE_GROUPS.map((group) => {
          const groupSources = sources.filter(
            (source) => source.category === group.category,
          );
          if (groupSources.length === 0) return null;

          return (
            <section
              className={`ce-source-group ce-source-group-${group.category}`}
              key={group.category}
            >
              <header>
                <div>
                  <h3>{group.label}</h3>
                  <p>{group.description}</p>
                </div>
                <span>{groupSources.length}</span>
              </header>
              <div className="ce-source-grid">
                {groupSources.map((source) => (
                  <article className="ce-source-card" key={source.sourceKey}>
                    <div>
                      <p className="ce-source-type">{source.documentType}</p>
                      <h4>{source.title}</h4>
                      <p className="ce-source-card-author">{source.author}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Source key</dt>
                        <dd>{source.sourceKey}</dd>
                      </div>
                      <div>
                        <dt>File</dt>
                        <dd>
                          {source.kind.toUpperCase()} ·{" "}
                          {formatBytes(source.byteSize)}
                        </dd>
                      </div>
                    </dl>
                    <p className="ce-source-provenance">
                      {source.provenanceNote}
                    </p>
                    <Link
                      href={`/core-exam-1/sources/${encodeURIComponent(source.sourceKey)}`}
                    >
                      View source
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
