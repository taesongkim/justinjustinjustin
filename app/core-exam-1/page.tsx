import { notFound } from "next/navigation";
import { loadPrivateTopic } from "./private-content";
import { CoreExamFrame } from "./CoreExamFrame";
import { TOPICS } from "./topics";

type CoreExamPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function CoreExamPage({
  searchParams,
}: CoreExamPageProps) {
  const previewEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.CORE_EXAM_PREVIEW_ENABLED === "true";

  if (!previewEnabled) notFound();

  const params = await searchParams;
  const requestedKey = params.topic;
  const selectedTopic =
    TOPICS.find((topic) => topic.stableKey === requestedKey) ?? TOPICS[0];
  const content = await loadPrivateTopic(selectedTopic.stableKey);

  return (
    <CoreExamFrame
      topics={TOPICS}
      selectedTopic={selectedTopic}
      markdown={content.markdown}
      sourceAvailable={content.available}
    />
  );
}
