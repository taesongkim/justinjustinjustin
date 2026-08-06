"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { CONFIDENCE_LABELS, ConfidenceSlider } from "./ConfidenceSlider";

// The first Reference: a bespoke, interactive walkthrough of the study flow.
// The demo cards are illustrative only — local state, no persistence, no RPCs —
// so they mirror the real controls' look and feel without touching group data.

type Likelihood = "likely" | "unsure" | "unlikely";

// Step 1 demo — the exam-relevance control (notch reflects it) plus the Hide
// control; hiding dims the card the way it drops out of the active set.
function RelevanceDemo() {
  const [likelihood, setLikelihood] = useState<Likelihood>("likely");
  const [hidden, setHidden] = useState(false);
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-demo-card" data-hidden={hidden || undefined}>
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
          <div className="ce-question-hide">
            <button onClick={() => setHidden((value) => !value)} type="button">
              {hidden
                ? "Show this question again"
                : "Hide this question (personally)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2 demo — the three per-question tabs, with sample answer content
// (deliberately no comment threads).
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
            <p className="ce-guide-demo-answer">
              The felt core of who you are beneath the mask &mdash; spontaneous,
              needing, and able to make real contact. It&rsquo;s what the
              defenses cover over.
            </p>
          )}
          {tab === "others" && (
            <div className="ce-guide-demo-answers">
              <div className="ce-guide-demo-answer">
                <span className="ce-guide-demo-author">Mara</span>
                The authentic self that persists under the idealized image
                &mdash; the part that can want, and can be hurt.
              </div>
              <div className="ce-guide-demo-answer">
                <span className="ce-guide-demo-author">Devin</span>
                Who you are when you stop performing: direct feeling and real
                need, not the polished front.
              </div>
            </div>
          )}
          {tab === "discussion" && (
            <p className="ce-guide-demo-muted">
              Thread for arguing edge cases and settling on wording together.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 3 demo — a well-answered question with its 1–5 mastery slider.
function SliderDemo() {
  const [level, setLevel] = useState<number | null>(3);
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-demo-card">
        <p className="ce-guide-demo-prompt">List the ego functions.</p>
        <p className="ce-guide-demo-answer">
          Perception, memory, judgment, impulse control, affect regulation,
          object relations, defense, and synthesis.
        </p>
        <div className="ce-guide-demo-sliderrow">
          <span className="ce-guide-demo-slider">
            <ConfidenceSlider
              ariaLabel="Demo mastery level"
              onChange={(next) => setLevel(next)}
              value={level}
            />
          </span>
          <span className="ce-guide-demo-caption">
            {level ? `${level} · ${CONFIDENCE_LABELS[level - 1]}` : "Not set"}
          </span>
        </div>
      </div>
    </div>
  );
}

// One static slider per level, so each level's look reads at a glance.
function LevelScale() {
  return (
    <div className="ce-guide-levels">
      {CONFIDENCE_LABELS.map((label, index) => {
        const level = index + 1;
        return (
          <div className="ce-guide-level-row" key={level}>
            <span className="ce-guide-level-slider">
              <ConfidenceSlider
                ariaLabel={`Level ${level}: ${label}`}
                interactive={false}
                value={level}
              />
            </span>
            <span className="ce-guide-level-label">
              {level} &middot; {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Steps 4 & 5 visual — "move this one up a level," from → to, with a nudging
// arrow between the before and after sliders.
function LevelBump({ from, to }: { from: number; to: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="ce-guide-demo">
      <div className="ce-guide-bump">
        <div className="ce-guide-bump-side">
          <ConfidenceSlider
            ariaLabel={`Level ${from}`}
            interactive={false}
            value={from}
          />
          <span className="ce-guide-bump-label">
            {from} &middot; {CONFIDENCE_LABELS[from - 1]}
          </span>
        </div>
        <motion.span
          animate={reduceMotion ? undefined : { x: [0, 7, 0] }}
          aria-hidden="true"
          className="ce-guide-bump-arrow"
          transition={
            reduceMotion
              ? undefined
              : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="24"
          >
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </motion.span>
        <div className="ce-guide-bump-side">
          <ConfidenceSlider
            ariaLabel={`Level ${to}`}
            interactive={false}
            value={to}
          />
          <span className="ce-guide-bump-label">
            {to} &middot; {CONFIDENCE_LABELS[to - 1]}
          </span>
        </div>
      </div>
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
                scoreboard. Try to get every question to level 3 as soon as you
                can.
              </p>
            </div>
          </div>
          <LevelScale />
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
          <LevelBump from={3} to={4} />
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
          <LevelBump from={4} to={5} />
        </li>
      </ol>
    </div>
  );
}
