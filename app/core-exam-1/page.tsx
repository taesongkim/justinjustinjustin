import { notFound, redirect } from "next/navigation";
import { loadPrivateReaderPage } from "./private-content";
import { CoreExamFrame } from "./CoreExamFrame";
import type { TopicQuestionGroup } from "./QuestionIndexView";
import { getCoreExamAccess } from "./lib/viewer";
import {
  loadTopicConfidence,
  loadTopicProgress,
  loadTopicQuestions,
  type TopicProgress,
} from "./lib/questions";
import { loadGlobalActivity } from "./lib/activity";
import { loadPageContributions } from "./lib/contributions";
import { loadPageVerifications } from "./lib/verification";
import { loadScoreboard } from "./lib/scoreboard";
import { loadSourceLibrary } from "./lib/sources";
import { UnauthorizedAccount } from "./UnauthorizedAccount";
import { READER_PAGES, TOPICS } from "./topics";
import type { CoreExamViewer } from "./lib/viewer";
import type { CoreExamActivityFeed } from "./lib/activity";
import type { ScoreboardMember } from "./lib/scoreboard";

// Shared placeholder props for the cross-topic views (All Questions, Source
// Library). They render in the reading pane, so the topic-specific props are
// inert — selectedTopic is a placeholder and the topic body is skipped.
const viewFrameBase = (
  viewer: CoreExamViewer,
  activity: CoreExamActivityFeed,
  scoreboard: ScoreboardMember[],
  topicProgress: Record<string, TopicProgress>,
) => ({
  activity,
  collaborativeEmpty: false,
  contributions: {},
  initialTargetId: null,
  markdown: "",
  questions: [],
  scoreboard,
  topicProgress,
  // Synthetic placeholder: matches no real sidebar link, so navigating from a
  // view to any real topic reliably changes selectedTopic.stableKey (which
  // clears the nav loader). The topic body is skipped while `view` is set.
  selectedTopic: { stableKey: "__view__", label: "", kind: "reference" as const },
  sourceAvailable: false,
  topicConfidence: { topicNodeId: null, myLevel: null },
  verifications: {},
  viewer,
});

type CoreExamPageProps = {
  searchParams: Promise<{
    contribution?: string;
    target?: string;
    topic?: string;
    view?: string;
  }>;
};

export default async function CoreExamPage({
  searchParams,
}: CoreExamPageProps) {
  const previewEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.CORE_EXAM_PREVIEW_ENABLED === "true";

  if (!previewEnabled) notFound();

  const access = await getCoreExamAccess();
  if (access.status === "anonymous") redirect("/core-exam-1/login");
  if (access.status === "unauthorized") {
    return <UnauthorizedAccount email={access.email} />;
  }

  const params = await searchParams;

  if (
    params.view === "all-questions" ||
    params.view === "my-answers"
  ) {
    const [activity, groups, scoreboard, topicProgress] = await Promise.all([
      loadGlobalActivity(
        access.viewer.spaceId,
        access.viewer.userId,
      ),
      Promise.all(
        TOPICS.map(async (topic) => ({
          label: topic.label,
          questions: await loadTopicQuestions(
            topic.stableKey,
            access.viewer.userId,
          ),
          stableKey: topic.stableKey,
        })),
      ) satisfies Promise<TopicQuestionGroup[]>,
      loadScoreboard(access.viewer.spaceId, access.viewer.userId).catch(
        (error) => {
          console.error("scoreboard load failed; showing none", error);
          return [];
        },
      ),
      loadTopicProgress(access.viewer.userId),
    ]);

    return (
      <CoreExamFrame
        {...viewFrameBase(access.viewer, activity, scoreboard, topicProgress)}
        view="all-questions"
        indexGroups={groups}
      />
    );
  }

  if (params.view === "sources") {
    const [activity, sources, scoreboard, topicProgress] = await Promise.all([
      loadGlobalActivity(access.viewer.spaceId, access.viewer.userId),
      loadSourceLibrary(access.viewer.spaceId),
      loadScoreboard(access.viewer.spaceId, access.viewer.userId).catch(
        (error) => {
          console.error("scoreboard load failed; showing none", error);
          return [];
        },
      ),
      loadTopicProgress(access.viewer.userId),
    ]);

    return (
      <CoreExamFrame
        {...viewFrameBase(access.viewer, activity, scoreboard, topicProgress)}
        view="sources"
        sourceLibrary={sources}
      />
    );
  }

  const requestedKey = params.topic;
  const selectedTopic =
    READER_PAGES.find((topic) => topic.stableKey === requestedKey) ??
    READER_PAGES[0];
  const [
    activity,
    content,
    questions,
    verifications,
    contributions,
    scoreboard,
    topicConfidence,
    topicProgress,
  ] = await Promise.all([
    loadGlobalActivity(
      access.viewer.spaceId,
      access.viewer.userId,
    ),
    loadPrivateReaderPage(
      selectedTopic.stableKey,
      access.viewer.spaceId,
    ),
    selectedTopic.kind === "topic"
      ? loadTopicQuestions(
          selectedTopic.stableKey,
          access.viewer.userId,
        )
      : Promise.resolve([]),
    loadPageVerifications(selectedTopic.stableKey),
    loadPageContributions(
      selectedTopic.stableKey,
      access.viewer.userId,
    ),
    loadScoreboard(access.viewer.spaceId, access.viewer.userId).catch(
        (error) => {
          console.error("scoreboard load failed; showing none", error);
          return [];
        },
      ),
    selectedTopic.kind === "topic"
      ? loadTopicConfidence(
          selectedTopic.stableKey,
          access.viewer.userId,
        ).catch((error) => {
          console.error("topic confidence load failed", error);
          return { topicNodeId: null, myLevel: null };
        })
      : Promise.resolve({ topicNodeId: null, myLevel: null }),
    loadTopicProgress(access.viewer.userId),
  ]);

  return (
    <CoreExamFrame
      selectedTopic={selectedTopic}
      markdown={content.markdown}
      activity={activity}
      collaborativeEmpty={content.collaborativeEmpty}
      contributions={contributions}
      initialTargetId={params.target ?? null}
      questions={questions}
      scoreboard={scoreboard}
      sourceAvailable={content.available}
      topicConfidence={topicConfidence}
      topicProgress={topicProgress}
      verifications={verifications}
      viewer={access.viewer}
    />
  );
}
