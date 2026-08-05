"use client";

import { useState } from "react";
import { ConfidenceSlider, CONFIDENCE_LABELS } from "./ConfidenceSlider";
import {
  ConfidenceRings,
  type ConfidenceRingMember,
} from "./ConfidenceRings";
import { ConfidenceDevPanel } from "./ConfidenceDevPanel";

// Other members' confidence, shown as the repurposed answer rings.
const MEMBERS: ConfidenceRingMember[] = [
  { id: "a", name: "Steph", color: "#c2410c", level: 1 },
  { id: "b", name: "Mel", color: "#7c3aed", level: 2 },
  { id: "c", name: "George", color: "#0369a1", level: 3 },
  { id: "d", name: "Elena", color: "#be185d", level: 4 },
  { id: "e", name: "Andres", color: "#15803d", level: 5 },
];

export function ConfidenceLab() {
  const [cardLevel, setCardLevel] = useState<number | null>(3);
  const [topicLevel, setTopicLevel] = useState<number | null>(2);

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
          <h2>Your slider — five resting states</h2>
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
          <h2>Group rings — same five states in each member&rsquo;s hue</h2>
          <div className="cs-lab-swatches">
            {[1, 2, 3, 4, 5].map((level) => (
              <div className="cs-lab-swatch" key={level}>
                <ConfidenceRings
                  members={[MEMBERS[level - 1]]}
                />
                <span>
                  {level}. {CONFIDENCE_LABELS[level - 1]}
                </span>
              </div>
            ))}
          </div>
          <p className="cs-lab-note">
            Level 1 (and unset) reads as an empty outline for other members;
            2 pulses, 3 is solid, 4 glows, 5 ripples.
          </p>
        </section>

        <section className="cs-lab-section">
          <h2>In a question card — your slider, then the group rings</h2>
          <div className="cs-lab-card">
            <span className="ce-question-index">03</span>
            <span className="ce-question-prompt">
              How does the mask move between lower and higher registers?
            </span>
            <ConfidenceSlider onChange={setCardLevel} value={cardLevel} />
            <ConfidenceRings members={MEMBERS} />
          </div>
          <p className="cs-lab-note">
            Your level: {cardLevel ?? "unset"}. The rings now reflect each
            member&rsquo;s confidence instead of answered/not-answered.
          </p>
        </section>

        <section className="cs-lab-section">
          <h2>Above a topic title (yours only)</h2>
          <div className="cs-lab-topic">
            <span className="ce-eyebrow">Topic 01</span>
            <ConfidenceSlider onChange={setTopicLevel} value={topicLevel} />
          </div>
          <h3 className="cs-lab-topic-title">Mask · lower and higher</h3>
        </section>
      </div>

      <ConfidenceDevPanel />
    </div>
  );
}
