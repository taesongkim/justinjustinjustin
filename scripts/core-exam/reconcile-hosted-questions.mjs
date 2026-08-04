import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  resolveLocalTarget,
  resolveHostedTarget,
} from "./lib/target.mjs";

// Reconcile the hosted question/answer set to the owner's LIVE LOCAL curation.
//
// The deterministic importers seed hosted from the finalized archive (95
// curated questions, each with an AI answer). The owner has since trimmed that
// locally to 84 active questions / 80 AI answers (some questions intentionally
// left answer-less). This script reads local as the source of truth and
// soft-archives (sets archived_at — never hard-deletes) whatever on hosted is
// not part of the live local set:
//   - questions whose stable_key is not active locally
//   - answers whose question is not answered-by-AI locally
//
// Run AFTER the content/question/answer importers. Idempotent. Pass --dry-run
// to preview without writing.
//
//   HOSTED_SUPABASE_URL=https://<ref>.supabase.co \
//   HOSTED_SERVICE_ROLE_KEY=... \
//   node scripts/core-exam/reconcile-hosted-questions.mjs --dry-run

const dryRun = process.argv.includes("--dry-run");
const AI_EMAIL = "ai-assistant@core-exam.invalid";
const nowIso = new Date().toISOString();

const local = await resolveLocalTarget();
const hosted = await resolveHostedTarget();
const localDb = createClient(local.apiUrl, local.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const hostedDb = createClient(hosted.apiUrl, hosted.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Source of truth: the live local curated set ------------------------------
const { data: localUsers, error: localUsersError } =
  await localDb.auth.admin.listUsers();
if (localUsersError) throw localUsersError;
const localAi = localUsers.users.find((user) => user.email === AI_EMAIL);
if (!localAi) {
  throw new Error(`No local AI-Assistant user (${AI_EMAIL}); is local seeded?`);
}

const { data: localQuestions, error: lqError } = await localDb
  .from("core_exam_questions")
  .select("id, stable_key, archived_at")
  .not("stable_key", "is", null);
if (lqError) throw lqError;

const localStableById = new Map(
  localQuestions.map((q) => [q.id, q.stable_key]),
);
const localActive = new Set(
  localQuestions.filter((q) => !q.archived_at).map((q) => q.stable_key),
);

const { data: localAnswers, error: laError } = await localDb
  .from("core_exam_answers")
  .select("question_id, archived_at, author_id")
  .eq("author_id", localAi.id)
  .is("archived_at", null);
if (laError) throw laError;

const localAnswered = new Set(
  localAnswers
    .map((a) => localStableById.get(a.question_id))
    .filter((sk) => sk && localActive.has(sk)),
);

// Safety: never archive against an empty/unseeded local DB.
if (localActive.size === 0) {
  throw new Error(
    "Local has zero active curated questions — refusing to reconcile (would archive everything on hosted). Seed local first.",
  );
}

console.log(
  `Local source of truth: ${localActive.size} active questions, ${localAnswered.size} AI-answered.`,
);

// --- Target: hosted -----------------------------------------------------------
const { data: hostedQuestions, error: hqError } = await hostedDb
  .from("core_exam_questions")
  .select("id, stable_key, archived_at")
  .not("stable_key", "is", null);
if (hqError) throw hqError;

const hostedStableById = new Map(
  hostedQuestions.map((q) => [q.id, q.stable_key]),
);

const { data: hostedAnswers, error: haError } = await hostedDb
  .from("core_exam_answers")
  .select("id, question_id, archived_at");
if (haError) throw haError;

const questionsToArchive = hostedQuestions.filter(
  (q) => !q.archived_at && !localActive.has(q.stable_key),
);
const answersToArchive = hostedAnswers.filter((a) => {
  if (a.archived_at) return false;
  const sk = hostedStableById.get(a.question_id);
  return !sk || !localAnswered.has(sk);
});

const hostedActiveQ = hostedQuestions.filter((q) => !q.archived_at).length;
const hostedActiveA = hostedAnswers.filter((a) => !a.archived_at).length;
console.log(
  `Hosted now: ${hostedActiveQ} active questions, ${hostedActiveA} active answers.`,
);
console.log(
  `Would archive: ${questionsToArchive.length} questions, ${answersToArchive.length} answers.`,
);
console.log(
  `Result after: ${hostedActiveQ - questionsToArchive.length} active questions, ${hostedActiveA - answersToArchive.length} active answers.`,
);
if (questionsToArchive.length) {
  console.log(
    "  questions →",
    questionsToArchive.map((q) => q.stable_key).join(", "),
  );
}

if (dryRun) {
  console.log("\n[dry run] no changes written.");
} else {
  if (questionsToArchive.length) {
    const { error } = await hostedDb
      .from("core_exam_questions")
      .update({ archived_at: nowIso })
      .in(
        "id",
        questionsToArchive.map((q) => q.id),
      );
    if (error) throw error;
  }
  if (answersToArchive.length) {
    const { error } = await hostedDb
      .from("core_exam_answers")
      .update({ archived_at: nowIso })
      .in(
        "id",
        answersToArchive.map((a) => a.id),
      );
    if (error) throw error;
  }
  console.log("\nReconciled. Hosted now mirrors the live local set.");
}
