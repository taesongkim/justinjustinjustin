"use client";

import { useState } from "react";
import {
  ConfidenceSlider,
  CONFIDENCE_LABELS,
  type ConfidenceMember,
} from "./ConfidenceSlider";
import { ConfidenceDevPanel } from "./ConfidenceDevPanel";
import { GroupRings, type RingMember } from "./StatusRings";

// Shared roster used for both the confidence pips and the answer-status rings,
// so the two per-member visuals can be compared at real size.
const ROSTER: RingMember[] = [
  { userId: "a", displayName: "Steph", avatarColor: "#c2410c" },
  { userId: "b", displayName: "Mel", avatarColor: "#7c3aed" },
  { userId: "c", displayName: "George", avatarColor: "#0369a1" },
  { userId: "d", displayName: "Elena", avatarColor: "#be185d" },
  { userId: "e", displayName: "Andres", avatarColor: "#15803d" },
];
const ANSWERED_BY = ["a", "c", "e"];

const MEMBER_LEVELS: ConfidenceMember[] = [
  { id: "a", name: "Steph", color: "#c2410c", level: 2 },
  { id: "b", name: "Mel", color: "#7c3aed", level: 4 },
  { id: "c", name: "George", color: "#0369a1", level: 5 },
  { id: "d", name: "Elena", color: "#be185d", level: 3 },
  { id: "e", name: "Andres", color: "#15803d", level: 1 },
];

export function ConfidenceLab() {
  const [cardLevel, setCardLevel] = useState<number | null>(3);
  const [topicLevel, setTopicLevel] = useState<number | null>(2);
  const [sharedLevel, setSharedLevel] = useState<number | null>(3);

  return (
    <div className="cs-lab">
      <div className="cs-lab-main">
        <header className="cs-lab-head">
          <p className="ce-eyebrow">Sandbox · dev only</p>
          <h1>Confidence slider</h1>
          <p className="cs-lab-sub">
            Drag the handle to set a level. Tune every size, opacity, glow, and
            timing from the panel, then Copy CSS to bake it in.
          </p>
        </header>

        <section className="cs-lab-section">
          <h2>All five resting states</h2>
          <div className="cs-lab-swatches">
            {[1, 2, 3, 4, 5].map((level) => (
              <div className="cs-lab-swatch" key={level}>
                <ConfidenceSlider interactive={false} value={level} />
                <span>
                  {level}. {CONFIDENCE_LABELS[level - 1]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="cs-lab-section">
          <h2>Size match — slider beside the real answer rings</h2>
          <div className="cs-lab-card">
            <span className="ce-question-index">03</span>
            <span className="ce-question-prompt">
              How does the mask move between lower and higher registers?
            </span>
            <ConfidenceSlider onChange={setCardLevel} value={cardLevel} />
            <GroupRings
              answeredBy={ANSWERED_BY}
              hiddenBy={[]}
              roster={ROSTER}
            />
          </div>
          <p className="cs-lab-note">
            Left: your confidence slider (level {cardLevel ?? "unset"}). Right:
            the actual <code>GroupRings</code> at real size — tune the slider to
            sit comfortably next to them.
          </p>
        </section>

        <section className="cs-lab-section">
          <h2>Above a topic title (right of the TOPIC X eyebrow)</h2>
          <div className="cs-lab-topic">
            <span className="ce-eyebrow">Topic 01</span>
            <ConfidenceSlider onChange={setTopicLevel} value={topicLevel} />
          </div>
          <h3 className="cs-lab-topic-title">Mask · lower and higher</h3>
        </section>

        <section className="cs-lab-section">
          <h2>Shared view — others&rsquo; confidence as pips (needs your call)</h2>
          <div className="cs-lab-card">
            <span className="ce-question-index">03</span>
            <span className="ce-question-prompt">
              Same slider, with each member&rsquo;s level as a colored pip below
              the rail.
            </span>
            <ConfidenceSlider
              members={MEMBER_LEVELS}
              onChange={setSharedLevel}
              value={sharedLevel}
            />
          </div>
          <p className="cs-lab-note">
            You picked &ldquo;shared with group,&rdquo; so this is my first take
            on showing everyone&rsquo;s confidence. Keep it, change it, or drop
            the pips — your call.
          </p>
        </section>
      </div>

      <ConfidenceDevPanel />
    </div>
  );
}
