import type { CSSProperties } from "react";

export type RingMember = {
  userId: string;
  displayName: string;
  avatarColor: string;
};

// Per-question group answer status: one ring per active member, filled when
// they've answered, dimmed when they've hidden it. Color rides on the --ring
// CSS var so the fill/border/glow can be tuned in core-exam.css.
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
          <span
            className="ce-ring"
            data-filled={isAnswered ? "true" : undefined}
            data-hidden={isHidden ? "true" : undefined}
            key={member.userId}
            style={{ "--ring": member.avatarColor } as CSSProperties}
            title={`${member.displayName}: ${
              isAnswered ? "answered" : "not answered"
            }${isHidden ? " (hidden for them)" : ""}`}
          />
        );
      })}
    </span>
  );
}

// x-of-y as a row of neutral, theme-aware rings; the first `filled` are solid.
export function ProgressRings({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  if (total <= 0) return null;
  return (
    <span className="ce-progress-rings" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          className="ce-ring"
          data-filled={index < filled ? "true" : undefined}
          key={index}
        />
      ))}
    </span>
  );
}
