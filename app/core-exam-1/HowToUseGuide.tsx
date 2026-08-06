"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import {
  ConfidenceRings,
  type ConfidenceRingMember,
} from "./ConfidenceRings";
import { CONFIDENCE_LABELS, ConfidenceSlider } from "./ConfidenceSlider";

// The first Reference: a bespoke, interactive walkthrough of the study flow.
// The demo cards are the real question-card chrome driven by local state — no
// persistence, no RPCs, no group data — so they look and behave like the real
// thing without touching anything.

type Likelihood = "likely" | "unsure" | "unlikely";

// A believable stand-in group for the confidence rings in the card summary.
const DEMO_RINGS: ConfidenceRingMember[] = [
  { id: "mara", name: "Mara", color: "#c8694a", level: 4 },
  { id: "devin", name: "Devin", color: "#4a6fc8", level: 2 },
  { id: "sam", name: "Sam", color: "#5aa06b", level: null },
];

const DEMO_LIKELIHOOD_COUNTS: Record<Likelihood, number> = {
  likely: 3,
  unsure: 1,
  unlikely: 1,
};

// The real question-card shell (summary with index, prompt, mastery slider, and
// group rings; expandable body) with its own local slider state.
function DemoCard({
  index,
  prompt,
  notch,
  defaultLevel = 3,
  hidden,
  children,
}: {
  index: string;
  prompt: string;
  notch: Likelihood;
  defaultLevel?: number | null;
  hidden?: boolean;
  children: ReactNode;
}) {
  const [level, setLevel] = useState<number | null>(defaultLevel);
  return (
    <div className="ce-guide-demo">
      <details
        className="ce-question-card"
        data-hidden={hidden || undefined}
        open
      >
        <summary>
          <span className="ce-question-notch" data-relevance={notch} />
          <span className="ce-question-index">{index}</span>
          <span className="ce-question-prompt">{prompt}</span>
          <span className="ce-question-summary-meta">
            <span
              className="ce-question-confidence"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ConfidenceSlider
                onChange={(next) => setLevel(next)}
                value={level}
              />
            </span>
            <ConfidenceRings members={DEMO_RINGS} />
          </span>
        </summary>
        <div className="ce-question-body">{children}</div>
      </details>
    </div>
  );
}

// The three answer tabs, with sample content (deliberately no comment threads).
function DemoTabs({
  myAnswer,
  others,
}: {
  myAnswer: string;
  others: { name: string; text: string }[];
}) {
  const [tab, setTab] = useState<"personal" | "others" | "discussion">(
    "personal",
  );
  return (
    <>
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
          <p className="ce-guide-demo-answer">{myAnswer}</p>
        )}
        {tab === "others" &&
          (others.length > 0 ? (
            <div className="ce-guide-demo-answers">
              {others.map((entry) => (
                <div className="ce-guide-demo-answer" key={entry.name}>
                  <span className="ce-guide-demo-author">{entry.name}</span>
                  {entry.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="ce-guide-demo-muted">No one else has answered yet.</p>
          ))}
        {tab === "discussion" && (
          <p className="ce-guide-demo-muted">
            Thread for arguing edge cases and settling on wording together.
          </p>
        )}
      </div>
    </>
  );
}

// Step 1 — exam-relevance buttons (drive the notch) plus the Hide control.
function Step1Card() {
  const [likelihood, setLikelihood] = useState<Likelihood>("likely");
  const [hidden, setHidden] = useState(false);
  return (
    <DemoCard
      hidden={hidden}
      index="01"
      notch={likelihood}
      prompt="What distinguishes the Leaving pattern from the Merging pattern?"
    >
      <section className="ce-likelihood">
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
              <small>{DEMO_LIKELIHOOD_COUNTS[option]}</small>
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
      </section>
    </DemoCard>
  );
}

// Step 2 — the answer tabs, populated.
function Step2Card() {
  return (
    <DemoCard
      index="02"
      notch="likely"
      prompt="Define the Real Self in your own words."
    >
      <DemoTabs
        myAnswer="The felt core of who you are beneath the mask — spontaneous, needing, and able to make real contact. It's what the defenses cover over."
        others={[
          {
            name: "Mara",
            text: "The authentic self that persists under the idealized image — the part that can want, and can be hurt.",
          },
          {
            name: "Devin",
            text: "Who you are when you stop performing: direct feeling and real need, not the polished front.",
          },
        ]}
      />
    </DemoCard>
  );
}

// Step 3 — a well-answered card; the mastery slider sits in the summary.
function Step3Card() {
  return (
    <DemoCard
      defaultLevel={3}
      index="03"
      notch="likely"
      prompt="List the ego functions."
    >
      <DemoTabs
        myAnswer="Perception, memory, judgment, impulse control, affect regulation, object relations, defense, and synthesis."
        others={[]}
      />
    </DemoCard>
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
          <Step1Card />
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
          <Step2Card />
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
          <Step3Card />
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
