// ─── Practice Types ─────────────────────────────────────

export type PracticeType = 'mantra' | 'mantra-lines' | 'prompt';
export type TypingMode = 'replace' | 'overlay';

export interface LeniencyFlags {
  ignoreCaps: boolean;
  ignorePunctuation: boolean;
}

// ─── Settings ───────────────────────────────────────────

export interface MantraSettings {
  ghostVisible: boolean;
  completionDetection: boolean;
  leniency: LeniencyFlags;
  typingMode: TypingMode;
  timerEnabled: boolean;
}

export interface MantraLinesSettings {
  lineCount: number;
  ghostVisible: boolean;
  completionDetection: boolean;
  leniency: LeniencyFlags;
  autoAdvance: boolean;
  lineTimerEnabled: boolean;
  sessionTimerEnabled: boolean;
}

export interface PromptSettings {
  instructions: string;
  timerEnabled: boolean;
  wordCountEnabled: boolean;
}

export type PracticeSettings = MantraSettings | MantraLinesSettings | PromptSettings;

// ─── Practice (template) ────────────────────────────────

export interface Practice {
  id: string;
  type: PracticeType;
  title: string;
  content: string; // mantra phrase or prompt text
  settings: PracticeSettings;
  createdAt: number;
  updatedAt: number;
}

// ─── Practice Flow ──────────────────────────────────────

export interface PracticeFlow {
  id: string;
  title: string;
  description: string;
  practiceIds: string[];
  sessionTimerEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ─── Session Record ─────────────────────────────────────

export interface SessionRecord {
  id: string;
  practiceId: string;
  practiceTitle?: string; // snapshot for history resilience
  practiceType?: PracticeType; // snapshot for history resilience
  flowId?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  content?: string; // captured writing for prompt sessions
}

// ─── Defaults ───────────────────────────────────────────

export const DEFAULT_MANTRA_SETTINGS: MantraSettings = {
  ghostVisible: true,
  completionDetection: true,
  leniency: { ignoreCaps: false, ignorePunctuation: false },
  typingMode: 'overlay',
  timerEnabled: true,
};

export const DEFAULT_MANTRA_LINES_SETTINGS: MantraLinesSettings = {
  lineCount: 10,
  ghostVisible: true,
  completionDetection: true,
  leniency: { ignoreCaps: false, ignorePunctuation: false },
  autoAdvance: true,
  lineTimerEnabled: false,
  sessionTimerEnabled: true,
};

export const DEFAULT_PROMPT_SETTINGS: PromptSettings = {
  instructions: '',
  timerEnabled: true,
  wordCountEnabled: true,
};

// ─── Type Guards ────────────────────────────────────────

export function isMantraSettings(s: PracticeSettings): s is MantraSettings {
  return 'typingMode' in s;
}

export function isMantraLinesSettings(s: PracticeSettings): s is MantraLinesSettings {
  return 'lineCount' in s;
}

export function isPromptSettings(s: PracticeSettings): s is PromptSettings {
  return 'wordCountEnabled' in s;
}

// ─── Navigation ─────────────────────────────────────────

export type Page =
  | { name: 'library' }
  | { name: 'editor'; practiceId?: string; type?: PracticeType }
  | { name: 'session'; practiceId: string }
  | { name: 'history'; sessionId?: string }
  | { name: 'flow-builder'; flowId?: string };
