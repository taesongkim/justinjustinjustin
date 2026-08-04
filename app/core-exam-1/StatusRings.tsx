import type { CSSProperties } from "react";

export type RingMember = {
  userId: string;
  displayName: string;
  avatarColor: string;
};

// Per-question group answer status: one ring per active member, filled when
// they've answered, dimmed when they've hidden it. Drawn as an SVG circle (not
// a CSS box) so it stays perfectly round at any size/pixel density. Color rides
// on the --ring var so the fill/stroke/glow are tunable in core-exam.css.
export function GroupRings({
  roster,
  answeredBy,
  hiddenBy,
}: {
  roster: RingMember[];
  answeredBy: string[];
  hiddenBy: Array<{ id: string; name: string }>;
}) {
  if (roster.length === 0) return null;
  const answered = new Set(answeredBy);
  const hidden = new Set(hiddenBy.map((entry) => entry.id));
  return (
    <span className="ce-group-rings" aria-label="Group answer status">
      {roster.map((member) => {
        const isAnswered = answered.has(member.userId);
        const isHidden = hidden.has(member.userId);
        return (
          <svg
            className="ce-ring"
            data-filled={isAnswered ? "true" : undefined}
            data-hidden={isHidden ? "true" : undefined}
            key={member.userId}
            style={{ "--ring": member.avatarColor } as CSSProperties}
            viewBox="0 0 12 12"
          >
            <title>{`${member.displayName}: ${
              isAnswered ? "answered" : "not answered"
            }${isHidden ? " (hidden for them)" : ""}`}</title>
            <circle cx="6" cy="6" r="5" />
          </svg>
        );
      })}
    </span>
  );
}
