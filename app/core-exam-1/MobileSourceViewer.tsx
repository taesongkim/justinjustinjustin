"use client";

import { useRouter } from "next/navigation";
import type { PreviewSource } from "./source-catalog";

type MobileSourceViewerProps = {
  citation?: string;
  page?: number;
  source: PreviewSource;
};

export function MobileSourceViewer({
  citation,
  page,
  source,
}: MobileSourceViewerProps) {
  const router = useRouter();
  const sourceUrl = `/core-exam-1/source?key=${encodeURIComponent(source.sourceKey)}${
    page ? `#page=${page}` : ""
  }`;

  return (
    <main className="ce-mobile-source-viewer">
      <header className="ce-source-dialog-header">
        <div>
          <p className="ce-eyebrow">Source library</p>
          <h1>{source.title}</h1>
          <p className="ce-source-author">
            {source.author}
            {citation ? ` · ${citation}` : ""}
          </p>
        </div>
        <div className="ce-source-actions">
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            Open file
          </a>
          <button onClick={() => router.back()} type="button">
            Back to study
          </button>
        </div>
      </header>
      <iframe
        className="ce-source-frame"
        src={sourceUrl}
        title={`${source.title} source viewer`}
      />
    </main>
  );
}
