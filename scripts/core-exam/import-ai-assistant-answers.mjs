import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

const questionBankPath = path.join(
  process.cwd(),
  ".local-archive/core-exam/question-workshop/finalized.json",
);
const answerBankPath = path.join(
  process.cwd(),
  ".local-archive/core-exam/ai-assistant/answers.finalized.json",
);

const [questionBank, answerBank] = await Promise.all([
  readFile(questionBankPath, "utf8").then(JSON.parse),
  readFile(answerBankPath, "utf8").then(JSON.parse),
]);

if (questionBank.schemaVersion !== "core-exam-question-bank-v1") {
  throw new Error("Unsupported finalized question-bank schema");
}
if (answerBank.schemaVersion !== "core-exam-ai-answer-bank-v1") {
  throw new Error("Unsupported AI answer-bank schema");
}

const activeQuestions = questionBank.questions.filter(
  (question) => !question.archived,
);
const answersByQuestionKey = new Map();
for (const answer of answerBank.answers) {
  if (answersByQuestionKey.has(answer.questionStableKey)) {
    throw new Error(
      `Duplicate AI answer for ${answer.questionStableKey}`,
    );
  }
  if (!answer.markdown?.trim()) {
    throw new Error(
      `Empty AI answer for ${answer.questionStableKey}`,
    );
  }
  answersByQuestionKey.set(answer.questionStableKey, answer.markdown.trim());
}

const activeQuestionKeys = new Set(
  activeQuestions.map((question) => question.stableKey),
);
const missingAnswers = [...activeQuestionKeys].filter(
  (stableKey) => !answersByQuestionKey.has(stableKey),
);
const extraAnswers = [...answersByQuestionKey.keys()].filter(
  (stableKey) => !activeQuestionKeys.has(stableKey),
);
// The finalized answer bank can hold answers for questions that were later
// archived (the owner trimmed the set after finalizing). Those are skipped, not
// fatal — the import loop only touches active questions. An active question
// without a finalized answer is left blank.
if (missingAnswers.length) {
  console.warn(
    `Leaving ${missingAnswers.length} active question(s) blank (no finalized AI answer): ${missingAnswers.join(", ")}`,
  );
}
if (extraAnswers.length) {
  console.warn(
    `Skipping ${extraAnswers.length} answer(s) whose question is archived: ${extraAnswers.join(", ")}`,
  );
}

const { apiUrl, serviceRoleKey, mode } = await resolveAdminTarget();
console.log(`→ AI answers target: ${mode} Supabase (${apiUrl})`);

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .select("id")
  .eq("slug", "core-exam-1")
  .single();
if (spaceError) throw spaceError;

const identity = {
  avatarColor: answerBank.identity.avatarColor ?? "#657873",
  displayName: answerBank.identity.displayName ?? "AI-Assistant",
  email: answerBank.identity.email ?? "ai-assistant@core-exam.invalid",
};
const { data: userList, error: userListError } =
  await admin.auth.admin.listUsers();
if (userListError) throw userListError;

let aiUser = userList.users.find((user) => user.email === identity.email);
if (!aiUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email: identity.email,
    email_confirm: true,
    user_metadata: { display_name: identity.displayName },
  });
  if (error) throw error;
  aiUser = data.user;
}
if (!aiUser) throw new Error("AI-Assistant auth identity was not created");

const { error: profileError } = await admin
  .from("core_exam_profiles")
  .upsert({
    avatar_color: "#333b36", // neutral — must match ASSISTANT_AVATAR_COLOR in app/core-exam-1/lib/hue.ts
    display_name: identity.displayName,
    user_id: aiUser.id,
  });
if (profileError) throw profileError;

const { error: membershipError } = await admin
  .from("core_exam_memberships")
  .upsert({
    role: "member",
    space_id: space.id,
    status: "active",
    participation: "assistant",
    user_id: aiUser.id,
  });
if (membershipError) throw membershipError;

const { data: questions, error: questionError } = await admin
  .from("core_exam_questions")
  .select("id,stable_key")
  .eq("space_id", space.id)
  .is("archived_at", null)
  .in("stable_key", [...activeQuestionKeys]);
if (questionError) throw questionError;

const questionByStableKey = new Map(
  questions.map((question) => [question.stable_key, question]),
);
const missingDatabaseQuestions = [...activeQuestionKeys].filter(
  (stableKey) => !questionByStableKey.has(stableKey),
);
if (missingDatabaseQuestions.length) {
  throw new Error(
    `Import the finalized question bank first. Missing database questions: ${missingDatabaseQuestions.join(", ")}`,
  );
}

const questionIds = questions.map((question) => question.id);
const { data: existingAnswers, error: existingAnswerError } = await admin
  .from("core_exam_answers")
  .select("id,question_id,current_revision_id")
  .eq("space_id", space.id)
  .eq("author_id", aiUser.id)
  .is("archived_at", null)
  .in("question_id", questionIds);
if (existingAnswerError) throw existingAnswerError;

const revisionIds = existingAnswers
  .map((answer) => answer.current_revision_id)
  .filter(Boolean);
const { data: currentRevisions, error: currentRevisionError } =
  revisionIds.length
    ? await admin
        .from("core_exam_answer_revisions")
        .select("id,plain_text")
        .in("id", revisionIds)
    : { data: [], error: null };
if (currentRevisionError) throw currentRevisionError;

const currentRevisionById = new Map(
  currentRevisions.map((revision) => [revision.id, revision]),
);
const existingAnswerByQuestionId = new Map(
  existingAnswers.map((answer) => [answer.question_id, answer]),
);

let created = 0;
let updated = 0;
let unchanged = 0;
for (const question of activeQuestions) {
  const databaseQuestion = questionByStableKey.get(question.stableKey);
  const markdown = answersByQuestionKey.get(question.stableKey);
  if (!markdown) continue; // active question with no finalized AI answer
  const existingAnswer = existingAnswerByQuestionId.get(databaseQuestion.id);
  const currentRevision = existingAnswer?.current_revision_id
    ? currentRevisionById.get(existingAnswer.current_revision_id)
    : null;

  if (currentRevision?.plain_text === markdown) {
    unchanged += 1;
    continue;
  }

  let answerId = existingAnswer?.id;
  if (!answerId) {
    const { data, error } = await admin
      .from("core_exam_answers")
      .insert({
        author_id: aiUser.id,
        question_id: databaseQuestion.id,
        space_id: space.id,
        visibility: "group",
      })
      .select("id")
      .single();
    if (error) throw error;
    answerId = data.id;
  }

  const { data: latestRevision, error: latestRevisionError } = await admin
    .from("core_exam_answer_revisions")
    .select("id,revision_number")
    .eq("answer_id", answerId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestRevisionError) throw latestRevisionError;

  const { data: insertedRevision, error: revisionError } = await admin
    .from("core_exam_answer_revisions")
    .insert({
      answer_id: answerId,
      based_on_revision_id: latestRevision?.id ?? null,
      body: {
        content: [
          {
            content: [{ text: markdown, type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc",
      },
      edit_summary: latestRevision
        ? "Refresh proposed starting answer"
        : "Seed proposed starting answer",
      edited_by: aiUser.id,
      plain_text: markdown,
      revision_number: (latestRevision?.revision_number ?? 0) + 1,
      schema_version: "core-exam-v1",
    })
    .select("id")
    .single();
  if (revisionError) throw revisionError;

  const { error: updateError } = await admin
    .from("core_exam_answers")
    .update({
      current_revision_id: insertedRevision.id,
      updated_at: new Date().toISOString(),
      visibility: "group",
    })
    .eq("id", answerId);
  if (updateError) throw updateError;

  if (existingAnswer) updated += 1;
  else created += 1;
}

// The seed identity is visible and commentable as a group participant, but its
// one-time bootstrap should not flood member activity feeds or unread badges.
const { error: activityError } = await admin
  .from("core_exam_activity_events")
  .delete()
  .eq("space_id", space.id)
  .eq("actor_id", aiUser.id);
if (activityError) throw activityError;

console.log(
  `AI-Assistant answers imported: ${created} created, ${updated} updated, ${unchanged} unchanged.`,
);
console.log(
  `Validated exact coverage of ${activeQuestions.length} finalized questions.`,
);
console.log(
  "Removed AI-Assistant bootstrap events from the activity feed; answers remain group-visible and commentable.",
);
console.log("No service-role credential was stored or printed.");
