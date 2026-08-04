import { notFound, redirect } from "next/navigation";
import { getCoreExamAccess } from "../lib/viewer";
import { TOPICS } from "../topics";
import { QuestionWorkshop } from "./QuestionWorkshop";
import { loadQuestionWorkshopDocument } from "./load";

export default async function QuestionWorkshopPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const access = await getCoreExamAccess();
  if (access.status === "anonymous") {
    redirect("/core-exam-1/login");
  }
  if (access.status !== "member" || access.viewer.role !== "owner") {
    notFound();
  }

  const document = await loadQuestionWorkshopDocument(access.viewer);

  return (
    <QuestionWorkshop
      initialDocument={document}
      topics={TOPICS.map((topic) => ({
        label: topic.label,
        stableKey: topic.stableKey,
      }))}
      viewerName={access.viewer.displayName}
    />
  );
}
