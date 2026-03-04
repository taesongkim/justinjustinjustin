// ─── Practice Types ─────────────────────────────────────

export type PracticeType = 'mantra' | 'mantra-lines' | 'prompt';
export type CompletionMode = 'manual' | 'auto';
export type LeniencyLevel = 'exact' | 'ignore-case' | 'ignore-punctuation';
export type TypingMode = 'replace' | 'overlay';

// ─── Settings ───────────────────────────────────────────

export interface MantraSettings {
  ghostVisible: boolean;
  completionMode: CompletionMode;
  leniencyLevel: LeniencyLevel;
  typingMode: TypingMode;
  timerEnabled: boolean;
}

export interface PromptSettings {
  instructions: string;
  timerEnabled: boolean;
  wordCountEnabled: boolean;
}

export type PracticeSettings = MantraSettings | PromptSettings;

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
  flowId?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  content?: string; // captured writing for prompt sessions
}

// ─── Defaults ───────────────────────────────────────────

export const DEFAULT_MANTRA_SETTINGS: MantraSettings = {
  ghostVisible: true,
  completionMode: 'auto',
  leniencyLevel: 'ignore-case',
  typingMode: 'replace',
  timerEnabled: true,
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

export function isPromptSettings(s: PracticeSettings): s is PromptSettings {
  return 'wordCountEnabled' in s;
}

// ─── Navigation ─────────────────────────────────────────

export type Page =
  | { name: 'library' }
  | { name: 'editor'; practiceId?: string; type?: PracticeType }
  | { name: 'session'; practiceId: string }
  | { name: 'flow-builder'; flowId?: string };
