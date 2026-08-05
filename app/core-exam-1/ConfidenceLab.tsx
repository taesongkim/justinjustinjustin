"use client";

import { useState } from "react";
import {
  ConfidenceSlider,
  CONFIDENCE_LABELS,
  type ConfidenceMember,
} from "./ConfidenceSlider";
import { ConfidenceDevPanel } from "./ConfidenceDevPanel";

const MOCK_MEMBERS: ConfidenceMember[] = [
  { id: "a", name: "Steph", color: "#c2410c", level: 2 },
  { id: "b", name: "Mel", color: "#7c3aed", level: 4 },
  { id: "c", name: "George", color: "#0369a1", level: 5 },
  { id: "d", name: "Elena", color: "#be185d", level: 3 },
];

export function ConfidenceLab() {
  const [cardLevel, setCardLevel] = useState<number | null>(3);
  const [topicLevel, setTopicLevel] = useState<number | null>(2);
  // One static swatch per level so all five resting states are visible at once.
  const swatchLevels = [1, 2, 3, 4, 5];

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
            {swatchLevels.map((level) => (
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
          <h2>In a question card (left of the answer rings)</h2>
          <div className="cs-lab-card">
            <span className="ce-question-index">03</span>
            <span className="ce-question-prompt">
              How does the mask move between lower and higher registers?
            </span>
            <ConfidenceSlider
              members={MOCK_MEMBERS}
              onChange={setCardLevel}
              value={cardLevel}
            />
            <span className="cs-lab-rings-stub" aria-hidden="true">
              ● ● ● ● ●
            </span>
          </div>
          <p className="cs-lab-note">
            Your level: {cardLevel ?? "unset"} · members shown as colored pips.
          </p>
        </section>

        <section className="cs-lab-section">
          <h2>Above a topic title (right of the TOPIC X eyebrow)</h2>
          <div className="cs-lab-topic">
            <span className="ce-eyebrow">Topic 01</span>
            <ConfidenceSlider
              members={MOCK_MEMBERS}
              onChange={setTopicLevel}
              value={topicLevel}
            />
          </div>
          <h3 className="cs-lab-topic-title">Mask · lower and higher</h3>
        </section>
      </div>

      <ConfidenceDevPanel />
    </div>
  );
}
