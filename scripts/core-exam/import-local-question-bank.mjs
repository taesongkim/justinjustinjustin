import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

const dryRun = process.argv.includes("--dry-run");
const useDraft = process.argv.includes("--draft");
const sourceMapPath =
  process.env.CORE_EXAM_SOURCE_MAP ??
  path.join(process.cwd(), ".local-archive/core-exam/source-map.json");
const workshopRoot = path.join(
  process.cwd(),
  ".local-archive/core-exam/question-workshop",
);
const workshopPath = path.join(
  workshopRoot,
  useDraft ? "draft.json" : "finalized.json",
);

async function loadWorkshopQuestions() {
  try {
    const document = JSON.parse(await readFile(workshopPath, "utf8"));
    if (
      document.schemaVersion !== "core-exam-question-bank-v1" ||
      !Array.isArray(document.questions)
    ) {
      throw new Error("Question Workshop manifest has an invalid schema");
    }
    return document.questions.map((question) => ({
      archived: Boolean(question.archived),
      prompt: String(question.prompt).trim(),
      rank: Number(question.rank),
      stableKey: String(question.stableKey),
      topicStableKey: String(question.topicStableKey),
    }));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function loadLegacyQuestions() {
  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"));
  const questionBankPath = sourceMap.sources?.["canonical.gap-register"];
  if (!questionBankPath) {
    throw new Error("The private source map has no canonical.gap-register");
  }

  const source = await readFile(questionBankPath, "utf8");
  const section = source.match(
    /# PART B — THE QUESTION BANK([\s\S]*?)# PART C —/,
  )?.[1];
  if (!section) throw new Error("Could not locate the canonical question bank");

  const legacyQuestions = [];
  for (const match of section.matchAll(
    /^(\d+)\.\s+[◆]+\s+(.+?)(?:\s+→.*)?$/gm,
  )) {
    legacyQuestions.push({
      number: Number(match[1]),
      prompt: match[2].trim(),
    });
  }

  const patternBlock = section.match(
    /## B3 · The five patterns[\s\S]*?For \*\*each\*\*[\s\S]*?\n([\s\S]*?)\n## B4/,
  )?.[1];
  if (!patternBlock) throw new Error("Could not locate per-pattern questions");

  const patternPrompts = [
    ...patternBlock.matchAll(/^-\s+[◆]+\s+(.+)$/gm),
  ].map((match) => match[1].trim().replace(/\s+→.*$/, ""));
  if (patternPrompts.length !== 5) {
    throw new Error(
      `Expected 5 per-pattern prompts; found ${patternPrompts.length}`,
    );
  }

  const patterns = [
    ["Leaving", "topic-03.leaving-pattern"],
    ["Merging", "topic-04.merging-pattern"],
    ["Enduring", "topic-05.enduring-pattern"],
    ["Aggressive", "topic-06.aggressive-pattern"],
    ["Rigid", "topic-07.rigid-pattern"],
  ];
  let expandedNumber = 21;
  for (const [pattern, topicStableKey] of patterns) {
    for (const prompt of patternPrompts) {
      legacyQuestions.push({
        number: expandedNumber,
        prompt: `For the ${pattern} pattern: ${prompt}`,
        topicStableKey,
      });
      expandedNumber += 1;
    }
  }

  const topicForQuestion = (number) => {
    if (number <= 10) return "topic-01.mask-lower-higher";
    if (number <= 20) return "topic-02.images-real-false-needs";
    if (number >= 21 && number <= 45) {
      return legacyQuestions.find((question) => question.number === number)
        ?.topicStableKey;
    }

    const explicit = new Map([
      [46, "topic-03.leaving-pattern"],
      [47, "topic-04.merging-pattern"],
      [48, "topic-03.leaving-pattern"],
      [49, "topic-06.aggressive-pattern"],
      [50, "topic-03.leaving-pattern"],
      [51, "topic-04.merging-pattern"],
      [52, "topic-03.leaving-pattern"],
      [53, "topic-07.rigid-pattern"],
      [54, "topic-07.rigid-pattern"],
      [55, "topic-06.aggressive-pattern"],
      [56, "topic-03.leaving-pattern"],
      [57, "topic-06.aggressive-pattern"],
      [58, "topic-03.leaving-pattern"],
      [59, "topic-03.leaving-pattern"],
      [60, "topic-04.merging-pattern"],
      [61, "topic-03.leaving-pattern"],
      [62, "topic-03.leaving-pattern"],
      [63, "topic-03.leaving-pattern"],
    ]);
    if (explicit.has(number)) return explicit.get(number);
    if (number <= 65) return "topic-08.ego-functions-development";
    if (number <= 71) return "topic-09.reason-will-emotion";
    if (number <= 75) return "topic-10.pride-self-will-fear";
    if ([76, 77, 79, 80, 81, 83].includes(number)) {
      return "topic-11.narcissism";
    }
    if ([78, 82, 84].includes(number)) {
      return "topic-12.rapprochement-crisis";
    }
    if (number === 85 || number === 87 || number === 88) {
      return "topic-01.mask-lower-higher";
    }
    if (number === 86) return "topic-02.images-real-false-needs";
    if (number === 89) return "topic-03.leaving-pattern";
    return "topic-12.rapprochement-crisis";
  };

  legacyQuestions.sort((left, right) => left.number - right.number);
  for (const question of legacyQuestions) {
    question.topicStableKey ??= topicForQuestion(question.number);
  }

  const numberSet = new Set(
    legacyQuestions.map((question) => question.number),
  );
  const missing = Array.from({ length: 90 }, (_, index) => index + 1).filter(
    (number) => !numberSet.has(number),
  );
  if (legacyQuestions.length !== 90 || missing.length > 0) {
    throw new Error(
      `Expected questions 1–90; found ${legacyQuestions.length}; missing ${missing.join(", ")}`,
    );
  }

  const rankByTopic = new Map();
  for (const question of legacyQuestions) {
    const nextRank = (rankByTopic.get(question.topicStableKey) ?? 0) + 1000;
    rankByTopic.set(question.topicStableKey, nextRank);
    question.rank = nextRank;
    question.stableKey = `question.q${String(question.number).padStart(3, "0")}`;
    question.archived = false;
  }
  return legacyQuestions;
}

const workshopQuestions = await loadWorkshopQuestions();
const questions = workshopQuestions ?? (await loadLegacyQuestions());
const stableKeys = new Set();
const activePositions = new Set();
for (const question of questions) {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(question.stableKey)) {
    throw new Error(`Invalid question stable key: ${question.stableKey}`);
  }
  if (stableKeys.has(question.stableKey)) {
    throw new Error(`Duplicate question stable key: ${question.stableKey}`);
  }
  if (
    question.prompt.length < 5 ||
    question.prompt.length > 500 ||
    !Number.isInteger(question.rank) ||
    question.rank < 1
  ) {
    throw new Error(`Invalid question entry: ${question.stableKey}`);
  }
  stableKeys.add(question.stableKey);
  if (!question.archived) {
    const position = `${question.topicStableKey}:${question.rank}`;
    if (activePositions.has(position)) {
      throw new Error(`Duplicate active question position: ${position}`);
    }
    activePositions.add(position);
  }
}

if (dryRun) {
  const activeQuestions = questions.filter((question) => !question.archived);
  const topicKeys = [...new Set(activeQuestions.map(
    (question) => question.topicStableKey,
  ))];
  const counts = Object.fromEntries(
    topicKeys.map((stableKey) => [
      stableKey,
      activeQuestions.filter(
        (question) => question.topicStableKey === stableKey,
      ).length,
    ]),
  );
  console.log(
    JSON.stringify(
      {
        activeCount: activeQuestions.length,
        archivedCount: questions.length - activeQuestions.length,
        counts,
        source: workshopQuestions
          ? useDraft
            ? "workshop-draft"
            : "workshop-finalized"
          : "legacy-gap-register",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const { apiUrl, serviceRoleKey } = await resolveAdminTarget();

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .select("id")
  .eq("slug", "core-exam-1")
  .single();
if (spaceError) throw spaceError;

const { data: ownerMembership, error: ownerError } = await admin
  .from("core_exam_memberships")
  .select("user_id")
  .eq("space_id", space.id)
  .eq("role", "owner")
  .eq("status", "active")
  .limit(1)
  .single();
if (ownerError) throw ownerError;

const pageManifest = JSON.parse(
  await readFile(
    path.join(
      process.cwd(),
      "core-exam/manifests/content-identity.v1.json",
    ),
    "utf8",
  ),
);
const topics = pageManifest.nodes.filter((node) => node.kind === "topic");
const { error: nodeError } = await admin
  .from("core_exam_content_nodes")
  .upsert(
    topics.map((node, index) => ({
      space_id: space.id,
      stable_key: node.stableKey,
      kind: "topic",
      sort_key: String(index + 1).padStart(3, "0"),
      created_by: ownerMembership.user_id,
    })),
    { onConflict: "space_id,stable_key" },
  );
if (nodeError) throw nodeError;

const { data: topicRows, error: topicError } = await admin
  .from("core_exam_content_nodes")
  .select("id,stable_key")
  .eq("space_id", space.id)
  .eq("kind", "topic");
if (topicError) throw topicError;
const topicIds = new Map(topicRows.map((topic) => [topic.stable_key, topic.id]));

const { error: questionError } = await admin
  .from("core_exam_questions")
  .upsert(
    questions.map((question) => ({
      space_id: space.id,
      topic_node_id: topicIds.get(question.topicStableKey),
      stable_key: question.stableKey,
      origin: "curated",
      prompt: question.prompt,
      rank: question.rank,
      submitted_by: null,
      archived_at: question.archived ? new Date().toISOString() : null,
    })),
    { onConflict: "space_id,stable_key" },
  );
if (questionError) throw questionError;

const { data: existingCurated, error: existingQuestionError } = await admin
  .from("core_exam_questions")
  .select("id,stable_key")
  .eq("space_id", space.id)
  .eq("origin", "curated");
if (existingQuestionError) throw existingQuestionError;
const omittedIds = (existingCurated ?? [])
  .filter((question) => !stableKeys.has(question.stable_key))
  .map((question) => question.id);
if (omittedIds.length > 0) {
  const { error: archiveError } = await admin
    .from("core_exam_questions")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", omittedIds);
  if (archiveError) throw archiveError;
}

const activeCount = questions.filter((question) => !question.archived).length;
console.log(
  `Imported ${activeCount} active and ${questions.length - activeCount} archived curated questions into local Supabase.`,
);
console.log("No private source content or service-role credential was stored.");
