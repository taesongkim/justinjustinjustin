"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Fragment, useState, type ReactNode } from "react";
import {
  ConfidenceRings,
  type ConfidenceRingMember,
} from "./ConfidenceRings";
import { CONFIDENCE_LABELS, ConfidenceSlider } from "./ConfidenceSlider";
import { hueNameStyle } from "./lib/hue";

// The first Reference: a bespoke, interactive walkthrough of the study flow.
// The demo cards are the real question-card chrome driven by local state — no
// persistence, no RPCs, no group data — so they look and behave like the real
// thing without touching anything.

type Likelihood = "likely" | "unsure" | "unlikely";
type DemoAnswer = { name: string; color: string; text: string };

// The active group, mirrored for the demo. NOTE: colors here are placeholders —
// prod avatar_colors live in the DB, not the local archive. Swap in the real
// hexes once available.
const DEMO_MEMBERS: ConfidenceRingMember[] = [
  { id: "steph", name: "Steph", color: "#e6a9b8", level: 4 },
  { id: "mel", name: "Mel", color: "#a9c8e6", level: 2, hidden: true },
  { id: "george", name: "George", color: "#a9e6c2", level: 5 },
  { id: "elena", name: "Elena", color: "#e6d3a9", level: null },
  { id: "justin", name: "Justin", color: "#c9b0e6", level: 3 },
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
            <ConfidenceRings members={DEMO_MEMBERS} />
          </span>
        </summary>
        <div className="ce-question-body">{children}</div>
      </details>
    </div>
  );
}

// The three answer tabs, rendered with the real answer containers and fonts
// (deliberately no comment threads).
function DemoTabs({
  myAnswer,
  others,
}: {
  myAnswer: string;
  others: DemoAnswer[];
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
          <section className="ce-answer-block ce-answer-mine">
            <div className="ce-answer-markdown">
              <p>{myAnswer}</p>
            </div>
          </section>
        )}
        {tab === "others" &&
          (others.length > 0 ? (
            <section className="ce-answer-block">
              {others.map((entry) => (
                <article className="ce-group-answer" key={entry.name}>
                  <div className="ce-group-answer-meta">
                    <strong style={hueNameStyle(entry.color)}>
                      {entry.name}
                    </strong>
                  </div>
                  <div className="ce-answer-markdown">
                    <p>{entry.text}</p>
                  </div>
                </article>
              ))}
            </section>
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
            name: "Steph",
            color: "#e6a9b8",
            text: "The authentic self that persists under the idealized image — the part that can want, and can be hurt.",
          },
          {
            name: "George",
            color: "#a9e6c2",
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
        others={[
          {
            name: "Elena",
            color: "#e6d3a9",
            text: "Reality testing, regulation of drives, object relations, thought processes, defense, and synthetic integration.",
          },
        ]}
      />
    </DemoCard>
  );
}

// One static slider per level, so each level's look reads at a glance.
// A small illustrative scoreboard bar. "denominator" grows the whole bar (the
// set of Likely questions you're building); "progress" grows the fill within a
// fixed bar (the Likely questions you've brought to level 3+).
function ScoreBarDemo({
  variant,
  caption,
}: {
  variant: "denominator" | "progress";
  caption: string;
}) {
  return (
    <div className="ce-guide-scorebar-demo">
      <span
        aria-hidden="true"
        className={
          variant === "denominator"
            ? "ce-guide-scorebar ce-guide-scorebar-grow"
            : "ce-guide-scorebar"
        }
      >
        <span
          className={
            variant === "progress"
              ? "ce-guide-scorebar-fill ce-guide-scorebar-fill-grow"
              : "ce-guide-scorebar-fill"
          }
        />
      </span>
      <p className="ce-guide-scorebar-caption">{caption}</p>
    </div>
  );
}

function LevelScale() {
  return (
    <div className="ce-guide-levels">
      {CONFIDENCE_LABELS.map((label, index) => {
        const level = index + 1;
        return (
          <Fragment key={level}>
            <div className="ce-guide-level-row">
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
            {level === 3 && (
              <ScoreBarDemo
                caption="This builds your progress in your progress bar."
                variant="progress"
              />
            )}
          </Fragment>
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
          This tool is meant primarily for us as a group to identify good
          questions and answers. The memorization part is more up to your own
          methods. I wrote this guide to help you navigate the first part and to
          be able to take advantage of all the little details I added to make
          this process easier.
        </p>
      </header>

      <ol className="ce-guide-steps">
        <li className="ce-guide-step">
          <div className="ce-guide-step-head">
            <span className="ce-guide-step-num">1</span>
            <div>
              <h3>Collect your questions</h3>
              <p>
                There are pre-loaded questions here, as well as the option to
                contribute your own. My first recommended step is to scan
                through the topics and pick, remove, and add your own questions,
                until you&rsquo;re satisfied you&rsquo;ve covered what you think
                is important.
              </p>
            </div>
          </div>
          <ul className="ce-guide-substeps">
            <li>
              Mark the ones you expect to be tested as <strong>Likely</strong>.
              <ScoreBarDemo
                caption="This builds your denominator in your progress bar."
                variant="denominator"
              />
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
                else&rsquo;s, and general discussion about the question. If you
                love another person&rsquo;s answer, don&rsquo;t be too prideful
                to copy it. Getting it in your own words comes after getting it.
                You can always revise and comment on your answer, as well as
                others&rsquo;.
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
              <h3>Log your mastery of each question</h3>
              <p>
                Every question has a 1&ndash;5 mastery slider that you can slide
                manually. The levels are explained below. The pre-requisite to
                start memorizing is first to try to get every question to level
                3 as soon as you can. On the right side of the sliders,
                you&rsquo;ll see your classmates&rsquo; progress. If their ring
                is x-ed out, it means they decided to hide/ignore that question.
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
              <p>
                Now that you have all your questions and answers, you can begin
                drilling yourself. Use the All Questions page and its filters to
                quickly run yourself through a list of all the questions.
              </p>
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
              <h3>Get to discussion mastery</h3>
              <p>
                As you get comfortable with your memorization, you&rsquo;ll want
                to practice actually talking it out loud. Once you feel like
                you&rsquo;ve mastered your communication of a question-answer,
                slide your mastery level to 5.
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
