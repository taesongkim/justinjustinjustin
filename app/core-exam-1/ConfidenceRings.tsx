import type { CSSProperties } from "react";
import { CONFIDENCE_LABELS } from "./ConfidenceSlider";

export type ConfidenceRingMember = {
  id: string;
  name: string;
  color: string;
  // 1–5, or null if that member hasn't set their level yet.
  level: number | null;
  // Member has hidden this question — ring dims and gets an X overlay.
  hidden?: boolean;
};

// Per-question group confidence: one ring per member, styled with the same
// per-level language as the slider (2 pulsing · 3 solid · 4 glow · 5 rippling
// rings). Unlike the viewer's own handle, an unset/level-1 ring reads as an
// empty outline rather than a faint filled dot.
export function ConfidenceRings({
  members,
}: {
  members: ConfidenceRingMember[];
}) {
  if (members.length === 0) return null;
  return (
    <span className="ce-conf-rings" aria-label="Group confidence">
      {members.map((member) => (
        <span
          className="ce-conf-ring"
          data-hidden={member.hidden || undefined}
          data-level={member.level ?? 1}
          key={member.id}
          style={{ "--ring": member.color } as CSSProperties}
          title={`${member.name}: ${
            member.hidden
              ? "hidden"
              : member.level
                ? CONFIDENCE_LABELS[member.level - 1]
                : "not set"
          }`}
        >
          <span className="ce-conf-ring-visual" aria-hidden="true">
            <span className="ce-conf-ring-core" />
            <span className="ce-conf-ring-fill" />
            <span className="ce-conf-ring-glow" />
            <span className="ce-conf-ring-rings" />
          </span>
          {member.hidden && (
            <svg
              aria-hidden="true"
              className="ce-conf-ring-x"
              viewBox="0 0 10 10"
            >
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          )}
        </span>
      ))}
    </span>
  );
}
