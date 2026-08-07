export type ReaderPageSummary = {
  number?: number;
  stableKey: string;
  label: string;
  kind: "topic" | "reference";
};

export const TOPICS: ReaderPageSummary[] = [
  {
    number: 1,
    stableKey: "topic-01.mask-lower-higher",
    label: "Mask, Lower Self, Higher Self",
    kind: "topic",
  },
  {
    number: 2,
    stableKey: "topic-02.images-real-false-needs",
    label: "Images & Real and False Needs",
    kind: "topic",
  },
  {
    number: 3,
    stableKey: "topic-03.leaving-pattern",
    label: "The Leaving Pattern",
    kind: "topic",
  },
  {
    number: 4,
    stableKey: "topic-04.merging-pattern",
    label: "The Merging Pattern",
    kind: "topic",
  },
  {
    number: 5,
    stableKey: "topic-05.enduring-pattern",
    label: "The Enduring Pattern",
    kind: "topic",
  },
  {
    number: 6,
    stableKey: "topic-06.aggressive-pattern",
    label: "The Aggressive Pattern",
    kind: "topic",
  },
  {
    number: 7,
    stableKey: "topic-07.rigid-pattern",
    label: "The Rigid Pattern",
    kind: "topic",
  },
  {
    number: 8,
    stableKey: "topic-08.ego-functions-development",
    label: "Ego Functions and Development",
    kind: "topic",
  },
  {
    number: 9,
    stableKey: "topic-09.reason-will-emotion",
    label: "Reason, Will and Emotion",
    kind: "topic",
  },
  {
    number: 10,
    stableKey: "topic-10.pride-self-will-fear",
    label: "Pride, Self-Will and Fear",
    kind: "topic",
  },
  {
    number: 11,
    stableKey: "topic-11.narcissism",
    label: "Narcissism",
    kind: "topic",
  },
  {
    number: 12,
    stableKey: "topic-12.rapprochement-crisis",
    label: "The Rapprochement Crisis",
    kind: "topic",
  },
  {
    number: 13,
    stableKey: "topic-13.ethics",
    label: "Ethics",
    kind: "topic",
  },
  {
    number: 14,
    stableKey: "topic-14.polyvagal-theory",
    label: "Polyvagal Theory",
    kind: "topic",
  },
  {
    number: 15,
    stableKey: "topic-15.touch-soft-techniques",
    label: "Touch and Soft Techniques",
    kind: "topic",
  },
  {
    number: 16,
    stableKey: "topic-16.transference-countertransference",
    label: "Transference and Countertransference",
    kind: "topic",
  },
];

// Rendered as a bespoke interactive page (HowToUseGuide), not markdown content.
export const HOW_TO_USE_KEY = "reference.how-to-use";

// Also a bespoke interactive page (LowerSelfGuide) — see the note in
// CoreExamFrame's reader body: new references render as reader content
// (markdown, or a component keyed by stableKey), never a separate route.
export const LOWER_SELF_KEY = "reference.lower-self";

export const REFERENCES: ReaderPageSummary[] = [
  {
    stableKey: HOW_TO_USE_KEY,
    label: "How to Use This Guide",
    kind: "reference",
  },
  {
    stableKey: "reference.study-guide",
    label: "Study Guide",
    kind: "reference",
  },
  {
    stableKey: "reference.conflict-register",
    label: "Conflict Register",
    kind: "reference",
  },
  {
    stableKey: "reference.crosswalks",
    label: "Crosswalks",
    kind: "reference",
  },
  {
    stableKey: "reference.gaps-question-bank",
    label: "Gaps & Question Bank",
    kind: "reference",
  },
  {
    stableKey: "reference.kessler-chart",
    label: "Kessler Chart",
    kind: "reference",
  },
  {
    stableKey: LOWER_SELF_KEY,
    label: "The Lower Self",
    kind: "reference",
  },
];

export const READER_PAGES = [...TOPICS, ...REFERENCES];
