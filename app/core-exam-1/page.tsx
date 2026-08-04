import { notFound, redirect } from "next/navigation";
import { loadPrivateReaderPage } from "./private-content";
import { CoreExamFrame } from "./CoreExamFrame";
import {
  QuestionIndexView,
  type TopicQuestionGroup,
} from "./QuestionIndexView";
import { getCoreExamAccess } from "./lib/viewer";
import { loadTopicQuestions } from "./lib/questions";
import { loadGlobalActivity } from "./lib/activity";
import { loadPageContributions } from "./lib/contributions";
import { loadPageVerifications } from "./lib/verification";
import { loadScoreboard } from "./lib/scoreboard";
import { UnauthorizedAccount } from "./UnauthorizedAccount";
import { READER_PAGES, TOPICS } from "./topics";

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
    const [activity, groups, scoreboard] = await Promise.all([
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
    ]);

    return (
      <QuestionIndexView
        activity={activity}
        groups={groups}
        scoreboard={scoreboard}
        viewer={access.viewer}
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
      verifications={verifications}
      viewer={access.viewer}
    />
  );
}
