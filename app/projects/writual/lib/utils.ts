import { LeniencyFlags } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

// ─── Completion Checking ────────────────────────────────

function normalize(text: string, flags: LeniencyFlags): string {
  let result = text;
  if (flags.ignoreCaps) {
    result = result.toLowerCase();
  }
  if (flags.ignorePunctuation) {
    result = result.replace(/[^\w\s]/g, '');
  }
  return result;
}

export function checkCompletion(
  input: string,
  target: string,
  flags: LeniencyFlags
): { isComplete: boolean; correctCount: number } {
  const normInput = normalize(input, flags);
  const normTarget = normalize(target, flags);

  let correctCount = 0;
  for (let i = 0; i < Math.min(normInput.length, normTarget.length); i++) {
    if (normInput[i] === normTarget[i]) {
      correctCount++;
    } else {
      break;
    }
  }

  const isComplete =
    normInput.length === normTarget.length && correctCount === normTarget.length;

  return { isComplete, correctCount };
}

// ─── Word Count ─────────────────────────────────────────

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── Time Formatting ────────────────────────────────────

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
