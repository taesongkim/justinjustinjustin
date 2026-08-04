import { notFound } from "next/navigation";
import { MobileSourceViewer } from "../../MobileSourceViewer";
import { loadSourceFile } from "../../lib/sources";
import { getCoreExamAccess } from "../../lib/viewer";

type SourcePageProps = {
  params: Promise<{ sourceKey: string }>;
  searchParams: Promise<{ citation?: string; page?: string }>;
};

export default async function SourcePage({
  params,
  searchParams,
}: SourcePageProps) {
  const access = await getCoreExamAccess();
  if (access.status !== "member") notFound();

  const [{ sourceKey }, query] = await Promise.all([params, searchParams]);
  const source = await loadSourceFile(
    access.viewer.spaceId,
    sourceKey,
  );
  if (!source) notFound();

  const parsedPage = query.page ? Number(query.page) : undefined;
  const page =
    parsedPage && Number.isInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : undefined;

  return (
    <MobileSourceViewer
      citation={query.citation}
      page={page}
      source={source}
    />
  );
}
