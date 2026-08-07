"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import type { ScoreboardMember } from "./lib/scoreboard";
import { hueNameStyle } from "./lib/hue";

// Order members for the board: the viewer first, then everyone else in join
// order. The assistant is dropped — its progress is always ~complete and isn't
// meaningful to track alongside the people studying.
function orderMembers(
  members: ScoreboardMember[],
): ScoreboardMember[] {
  const studiers = members.filter(
    (member) => member.participation === "active",
  );
  return [...studiers].sort((left, right) => {
    if (left.isViewer !== right.isViewer) return left.isViewer ? -1 : 1;
    return 0;
  });
}

function ScoreChip({ member }: { member: ScoreboardMember }) {
  const nameStyle = hueNameStyle(member.avatarColor);
  const ratio =
    member.likely > 0 ? member.likelyAtLevel3 / member.likely : 0;
  const fillStyle: CSSProperties = {
    width: `${Math.round(ratio * 100)}%`,
    background: member.avatarColor,
  };
  const trackStyle: CSSProperties = {
    background: `color-mix(in oklch, ${member.avatarColor}, transparent 82%)`,
  };

  // Glow for ~half a second whenever this member brings one more Likely question
  // up to level 3+ (their bar just grew). One-shot Web-Animations pulse — an
  // outer halo around the bar, tinted to the member's own hue — rather than
  // routing it through React state.
  const barRef = useRef<HTMLSpanElement>(null);
  const previousAtLevel3 = useRef(member.likelyAtLevel3);
  useEffect(() => {
    const increased = member.likelyAtLevel3 > previousAtLevel3.current;
    previousAtLevel3.current = member.likelyAtLevel3;
    if (!increased || !barRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const glow = `color-mix(in oklch, ${member.avatarColor}, transparent 15%)`;
    barRef.current.animate(
      [
        { boxShadow: "0 0 0 0 transparent" },
        { boxShadow: `0 0 9px 2px ${glow}`, offset: 0.35 },
        { boxShadow: "0 0 0 0 transparent" },
      ],
      { duration: 500, easing: "ease" },
    );
  }, [member.likelyAtLevel3, member.avatarColor]);

  return (
    <div className="ce-score-chip" role="listitem">
      <span className="ce-score-name" style={nameStyle}>
        {member.firstName}
      </span>
      <span
        className="ce-score-bar"
        ref={barRef}
        style={trackStyle}
        title={`Of the questions ${member.firstName} marked "likely to be tested" (${member.likely}), how many they've reached mastery level 3+ on (${member.likelyAtLevel3}).`}
      >
        <span className="ce-score-bar-fill" style={fillStyle} />
      </span>
      <span className="ce-score-ratio" style={nameStyle}>
        {member.likelyAtLevel3}/{member.likely}
      </span>
    </div>
  );
}

export function Scoreboard({
  members,
}: {
  members: ScoreboardMember[];
}) {
  const ordered = orderMembers(members);
  if (ordered.length === 0) return null;
  // On mobile the collapsed summary shows the viewer's own progress at a
  // glance (falling back to the first member if the viewer isn't on the board).
  const summaryMember =
    ordered.find((member) => member.isViewer) ?? ordered[0];

  return (
    <>
      <div className="ce-scoreboard" role="list" aria-label="Study progress">
        {ordered.map((member) => (
          <ScoreChip key={member.userId} member={member} />
        ))}
      </div>
      <details className="ce-scoreboard-mobile">
        <summary aria-label="Study progress">
          <ScoreChip member={summaryMember} />
        </summary>
        <div className="ce-scoreboard-mobile-list" role="list">
          {ordered.map((member) => (
            <ScoreChip key={member.userId} member={member} />
          ))}
        </div>
      </details>
    </>
  );
}
