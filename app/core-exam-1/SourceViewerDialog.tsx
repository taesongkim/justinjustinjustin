"use client";

import { useEffect, useRef } from "react";
import type { PreviewSource } from "./source-catalog";

type SourceViewerDialogProps = {
  citation?: string;
  onClose: () => void;
  page?: number;
  source: PreviewSource;
};

export function SourceViewerDialog({
  citation,
  onClose,
  page,
  source,
}: SourceViewerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sourceUrl = `/core-exam-1/source?key=${encodeURIComponent(source.sourceKey)}${
    page ? `#page=${page}` : ""
  }`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby="ce-source-title"
      className="ce-source-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <header className="ce-source-dialog-header">
        <div>
          <p className="ce-eyebrow">Source library</p>
          <h2 id="ce-source-title">{source.title}</h2>
          <p className="ce-source-author">
            {source.author}
            {citation ? ` · ${citation}` : ""}
          </p>
        </div>
        <div className="ce-source-actions">
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            Open file
          </a>
          <button onClick={onClose} type="button">
            Back to study
          </button>
        </div>
      </header>
      <iframe
        className="ce-source-frame"
        src={sourceUrl}
        title={`${source.title} source viewer`}
      />
    </dialog>
  );
}
