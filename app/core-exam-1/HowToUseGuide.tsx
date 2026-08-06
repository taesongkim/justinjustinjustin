"use client";

import { useState } from "react";
import { CONFIDENCE_LABELS, ConfidenceSlider } from "./ConfidenceSlider";

// The first Reference: a bespoke, interactive walkthrough of the study flow.
// The demo cards are illustrative only — local state, no persistence, no RPCs —
// so they mirror the real controls' look and feel without touching group data.

type Likelihood = "likely" | "unsure" | "unlikely";

// Step 1 demo — the exam-relevance control, with the card notch reflecting it.
function RelevanceDemo() {
  const [likelihood, setLikelihood] = useState<Likelihood>("likely");
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-demo-card">
        <span className="ce-question-notch" data-relevance={likelihood} />
        <p className="ce-guide-demo-prompt">
          What distinguishes the Leaving pattern from the Merging pattern?
        </p>
        <div className="ce-likelihood">
          <div>
            <p className="ce-eyebrow">Exam relevance</p>
            <h4>How likely is this to be tested?</h4>
          </div>
          <div className="ce-likelihood-options">
            {(["likely", "unsure", "unlikely"] as const).map((option) => (
              <button
                aria-pressed={likelihood === option}
                data-likelihood={option}
                key={option}
                onClick={() => setLikelihood(option)}
                type="button"
              >
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2 demo — the three per-question tabs.
function TabsDemo() {
  const [tab, setTab] = useState<"personal" | "others" | "discussion">(
    "personal",
  );
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-demo-card">
        <p className="ce-guide-demo-prompt">
          Define the Real Self in your own words.
        </p>
        <div className="ce-card-tabs" role="tablist">
          {(["personal", "others", "discussion"] as const).map((key) => (
            <button
              aria-selected={tab === key}
              className="ce-card-tab"
              key={key}
              onClick={() => setTab(key)}
              role="tab"
              type="button"
            >
              {key === "personal"
                ? "My Answer"
                : key === "others"
                  ? "Others' Answers"
                  : "General Discussion"}
            </button>
          ))}
        </div>
        <div className="ce-guide-demo-panel">
          {tab === "personal" && (
            <p>Write your own answer once, then sharpen it over time.</p>
          )}
          {tab === "others" && (
            <p>Read everyone else&rsquo;s and borrow the phrasing that lands.</p>
          )}
          {tab === "discussion" && (
            <p>Argue the edge cases and settle on wording together.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 3 demo — the 1–5 mastery slider (the real component, local state).
function SliderDemo() {
  const [level, setLevel] = useState<number | null>(3);
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-demo-card ce-guide-demo-card-row">
        <p className="ce-guide-demo-prompt">List the ego functions.</p>
        <span className="ce-guide-demo-slider">
          <ConfidenceSlider
            ariaLabel="Demo mastery level"
            onChange={(next) => setLevel(next)}
            value={level}
          />
        </span>
      </div>
      <p className="ce-guide-demo-caption">
        {level ? `${level} · ${CONFIDENCE_LABELS[level - 1]}` : "Not set"}
      </p>
    </div>
  );
}

export function HowToUseGuide() {
  return (
    <div className="ce-guide">
      <header className="ce-guide-head">
        <p className="ce-eyebrow">Reference</p>
        <h2>How to Use This Guide</h2>
        <p className="ce-guide-lead">
          This is a shared, active-recall study space. The point isn&rsquo;t to
          read it &mdash; it&rsquo;s to build a set of questions you can answer
          cold, then rehearse them until they&rsquo;re smooth. Here&rsquo;s the
          flow we recommend.
        </p>
      </header>

      <ol className="ce-guide-steps">
        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">1</span>
            <div>
              <h3>Collect your questions</h3>
              <p>
                First, shape the question set to your exam. Every question
                carries an exam-relevance mark &mdash; use it to focus.
              </p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>
              Mark the ones you expect to be tested as <strong>Likely</strong>.
            </li>
            <li>
              <strong>Hide</strong> the ones you don&rsquo;t need &mdash; they
              drop into a collapsed shelf.
            </li>
            <li>
              <strong>Add</strong> questions you think matter &mdash; they join
              the group&rsquo;s set.
            </li>
          </ul>
          <RelevanceDemo />
        </li>

        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">2</span>
            <div>
              <h3>Collect the best answers</h3>
              <p>
                Each question has three tabs &mdash; your answer, everyone
                else&rsquo;s, and open discussion.
              </p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>
              Write your own under <strong>My Answer</strong>.
            </li>
            <li>
              <strong>Copy the best</strong> from <strong>Others&rsquo;
              Answers</strong> when someone&rsquo;s put it better.
            </li>
          </ul>
          <TabsDemo />
        </li>

        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">3</span>
            <div>
              <h3>Mark your mastery</h3>
              <p>
                Every card has a 1&ndash;5 mastery slider. Set it honestly as
                you study &mdash; it drives the steps below and feeds the group
                scoreboard.
              </p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>1 &middot; Uncertain</li>
            <li>2 &middot; Working on it</li>
            <li>3 &middot; Answered confidently</li>
            <li>4 &middot; Memorized</li>
            <li>5 &middot; Able to teach</li>
          </ul>
          <SliderDemo />
        </li>

        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">4</span>
            <div>
              <h3>Begin memorizing</h3>
              <p>Now drill your Likely set.</p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>
              Start with Likely questions sitting at level 3 (Answered
              confidently).
            </li>
            <li>
              Collapse a card and answer from memory; expand to check yourself.
            </li>
            <li>Push every Likely question to level 4 (Memorized).</li>
          </ul>
        </li>

        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">5</span>
            <div>
              <h3>Begin discussing with others</h3>
              <p>
                Memorized is solid on your own. Able to teach is smooth out
                loud.
              </p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>
              Talk each answer through with someone until it flows without
              effort.
            </li>
            <li>Then slide it to level 5 (Able to teach).</li>
          </ul>
        </li>
      </ol>
    </div>
  );
}
