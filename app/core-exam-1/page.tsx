import { notFound, redirect } from "next/navigation";
import { loadPrivateReaderPage } from "./private-content";
import { CoreExamFrame } from "./CoreExamFrame";
import type { TopicQuestionGroup } from "./QuestionIndexView";
import { getCoreExamAccess, loadSpaceMember } from "./lib/viewer";
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
import type { CoreExamViewer, PovMember } from "./lib/viewer";
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
  povMember: PovMember | null,
) => ({
  activity,
  collaborativeEmpty: false,
  contributions: {},
  initialTargetId: null,
  markdown: "",
  questions: [],
  scoreboard,
  topicProgress,
  povMember,
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
    pov?: string;
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

  // "View POV": render another member's perspective (their marks, confidence,
  // answers, hidden set) read-only. Auth stays the real viewer; only the
  // "my"-perspective loads use the pov member's id. An invalid/foreign id or the
  // viewer's own id resolves to null and we render normally.
  const povMember = params.pov
    ? await loadSpaceMember(
        access.viewer.spaceId,
        params.pov,
        access.viewer.userId,
      )
    : null;
  const perspectiveUserId = povMember?.userId ?? access.viewer.userId;

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
            perspectiveUserId,
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
      loadTopicProgress(perspectiveUserId),
    ]);

    return (
      <CoreExamFrame
        {...viewFrameBase(
          access.viewer,
          activity,
          scoreboard,
          topicProgress,
          povMember,
        )}
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
      loadTopicProgress(perspectiveUserId),
    ]);

    return (
      <CoreExamFrame
        {...viewFrameBase(
          access.viewer,
          activity,
          scoreboard,
          topicProgress,
          povMember,
        )}
        view="sources"
        sourceLibrary={sources}
      />
    );
  }

  if (params.view === "timeline") {
    const [activity, scoreboard, topicProgress] = await Promise.all([
      loadGlobalActivity(access.viewer.spaceId, access.viewer.userId),
      loadScoreboard(access.viewer.spaceId, access.viewer.userId).catch(
        (error) => {
          console.error("scoreboard load failed; showing none", error);
          return [];
        },
      ),
      loadTopicProgress(perspectiveUserId),
    ]);

    return (
      <CoreExamFrame
        {...viewFrameBase(
          access.viewer,
          activity,
          scoreboard,
          topicProgress,
          povMember,
        )}
        view="timeline"
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
          perspectiveUserId,
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
          perspectiveUserId,
        ).catch((error) => {
          console.error("topic confidence load failed", error);
          return { topicNodeId: null, myLevel: null };
        })
      : Promise.resolve({ topicNodeId: null, myLevel: null }),
    loadTopicProgress(perspectiveUserId),
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
      povMember={povMember}
    />
  );
}
