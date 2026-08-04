import "server-only";

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOPICS } from "../topics";
import {
  QUESTION_BANK_SCHEMA_VERSION,
  type QuestionBankDocument,
  type WorkshopQuestion,
} from "./types";

const workshopRoot = path.join(
  process.cwd(),
  ".local-archive/core-exam/question-workshop",
);
const draftPath = path.join(workshopRoot, "draft.json");
const baselinePath = path.join(workshopRoot, "baseline.json");
const finalizedPath = path.join(workshopRoot, "finalized.json");
const snapshotsPath = path.join(workshopRoot, "snapshots");
const topicKeys = new Set(TOPICS.map((topic) => topic.stableKey));

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(
  filePath: string,
  document: QuestionBankDocument,
) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(document, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, filePath);
}

export function normalizeQuestionBank(
  input: unknown,
): QuestionBankDocument {
  if (!input || typeof input !== "object") {
    throw new Error("Question bank must be an object.");
  }

  const candidate = input as Partial<QuestionBankDocument>;
  if (!Array.isArray(candidate.questions)) {
    throw new Error("Question bank must include a question list.");
  }
  if (candidate.questions.length < 1 || candidate.questions.length > 500) {
    throw new Error("Question bank must contain between 1 and 500 questions.");
  }

  const stableKeys = new Set<string>();
  const activeRanks = new Set<string>();
  const rankByTopic = new Map<string, number>();
  const normalized: WorkshopQuestion[] = [];

  for (const rawQuestion of candidate.questions) {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      throw new Error("Every question must be an object.");
    }
    const raw = rawQuestion as Partial<WorkshopQuestion>;
    const stableKey = String(raw.stableKey ?? "").trim();
    const topicStableKey = String(raw.topicStableKey ?? "").trim();
    const prompt = String(raw.prompt ?? "").trim();
    const archived = Boolean(raw.archived);

    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(stableKey)) {
      throw new Error("A question has an invalid stable identity.");
    }
    if (stableKeys.has(stableKey)) {
      throw new Error(`Duplicate question identity: ${stableKey}`);
    }
    if (!topicKeys.has(topicStableKey)) {
      throw new Error(`Unknown topic: ${topicStableKey}`);
    }
    if (prompt.length < 5 || prompt.length > 500) {
      throw new Error("Every question must be between 5 and 500 characters.");
    }

    stableKeys.add(stableKey);
    const nextRank = archived
      ? Math.max(1, Number(raw.rank) || 1000)
      : (rankByTopic.get(topicStableKey) ?? 0) + 1000;
    if (!archived) {
      rankByTopic.set(topicStableKey, nextRank);
      const position = `${topicStableKey}:${nextRank}`;
      if (activeRanks.has(position)) {
        throw new Error(`Duplicate question position: ${position}`);
      }
      activeRanks.add(position);
    }
    normalized.push({
      archived,
      prompt,
      rank: nextRank,
      stableKey,
      topicStableKey,
    });
  }

  normalized.sort((left, right) => {
    const leftTopic = TOPICS.findIndex(
      (topic) => topic.stableKey === left.topicStableKey,
    );
    const rightTopic = TOPICS.findIndex(
      (topic) => topic.stableKey === right.topicStableKey,
    );
    return (
      leftTopic - rightTopic ||
      Number(left.archived) - Number(right.archived) ||
      left.rank - right.rank ||
      left.stableKey.localeCompare(right.stableKey)
    );
  });

  return {
    questions: normalized,
    savedAt: new Date().toISOString(),
    schemaVersion: QUESTION_BANK_SCHEMA_VERSION,
  };
}

export function createQuestionBankDocument(
  questions: WorkshopQuestion[],
): QuestionBankDocument {
  return normalizeQuestionBank({
    questions,
    savedAt: new Date().toISOString(),
    schemaVersion: QUESTION_BANK_SCHEMA_VERSION,
  });
}

export async function readQuestionBankDraft() {
  if (!(await exists(draftPath))) return null;
  return normalizeQuestionBank(
    JSON.parse(await readFile(draftPath, "utf8")) as unknown,
  );
}

export async function initializeQuestionBankDraft(
  document: QuestionBankDocument,
) {
  const normalized = normalizeQuestionBank(document);
  await mkdir(snapshotsPath, { recursive: true });
  if (!(await exists(baselinePath))) {
    await writeJsonAtomic(baselinePath, normalized);
  }
  if (!(await exists(draftPath))) {
    await writeJsonAtomic(draftPath, normalized);
  }
  return normalized;
}

export async function saveQuestionBankDraft(input: unknown) {
  const normalized = normalizeQuestionBank(input);
  await writeJsonAtomic(draftPath, normalized);
  return normalized;
}

export async function snapshotQuestionBank(
  label: "finalized" | "pre-finalize",
  document: QuestionBankDocument,
) {
  const normalized = normalizeQuestionBank(document);
  await mkdir(snapshotsPath, { recursive: true });
  const snapshotPath = path.join(
    snapshotsPath,
    `${label}-${timestampForPath()}.json`,
  );
  await writeJsonAtomic(snapshotPath, normalized);
  return snapshotPath;
}

export async function markQuestionBankFinalized(
  document: QuestionBankDocument,
) {
  const normalized = normalizeQuestionBank(document);
  await writeJsonAtomic(finalizedPath, normalized);
  await snapshotQuestionBank("finalized", normalized);
  return normalized;
}
