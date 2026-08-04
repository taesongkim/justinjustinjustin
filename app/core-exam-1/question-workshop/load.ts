import "server-only";

import type { CoreExamViewer } from "../lib/viewer";
import { createCoreExamServerClient } from "../lib/supabase/server";
import { TOPICS } from "../topics";
import {
  createQuestionBankDocument,
  initializeQuestionBankDraft,
  readQuestionBankDraft,
} from "./store";
import type { WorkshopQuestion } from "./types";

export async function loadQuestionWorkshopDocument(viewer: CoreExamViewer) {
  const existingDraft = await readQuestionBankDraft();
  if (existingDraft) return existingDraft;

  const supabase = await createCoreExamServerClient();
  const { data: topicRows, error: topicError } = await supabase
    .from("core_exam_content_nodes")
    .select("id, stable_key")
    .eq("space_id", viewer.spaceId)
    .eq("kind", "topic");
  if (topicError) throw topicError;

  const topicStableKeys = new Map(
    (topicRows ?? []).map((topic) => [topic.id, topic.stable_key]),
  );
  const { data: questions, error: questionError } = await supabase
    .from("core_exam_questions")
    .select("stable_key, topic_node_id, prompt, rank, archived_at")
    .eq("space_id", viewer.spaceId)
    .eq("origin", "curated")
    .order("rank");
  if (questionError) throw questionError;

  const workshopQuestions = (questions ?? [])
    .map((question): WorkshopQuestion | null => {
      const topicStableKey = topicStableKeys.get(question.topic_node_id);
      if (!question.stable_key || !topicStableKey) return null;
      return {
        archived: Boolean(question.archived_at),
        prompt: question.prompt,
        rank: question.rank,
        stableKey: question.stable_key,
        topicStableKey,
      };
    })
    .filter((question): question is WorkshopQuestion => Boolean(question))
    .sort((left, right) => {
      const leftTopic = TOPICS.findIndex(
        (topic) => topic.stableKey === left.topicStableKey,
      );
      const rightTopic = TOPICS.findIndex(
        (topic) => topic.stableKey === right.topicStableKey,
      );
      return leftTopic - rightTopic || left.rank - right.rank;
    });

  if (workshopQuestions.length === 0) {
    throw new Error(
      "No curated questions are available. Import the local question bank first.",
    );
  }

  return initializeQuestionBankDraft(
    createQuestionBankDocument(workshopQuestions),
  );
}
