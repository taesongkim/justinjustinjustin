import { notFound } from "next/navigation";
import { loadSourceFile } from "../lib/sources";
import { createCoreExamServerClient } from "../lib/supabase/server";
import { getCoreExamAccess } from "../lib/viewer";

export async function GET(request: Request) {
  const access = await getCoreExamAccess();
  if (access.status !== "member") notFound();

  const sourceKey = new URL(request.url).searchParams.get("key");
  if (!sourceKey) notFound();

  const source = await loadSourceFile(
    access.viewer.spaceId,
    sourceKey,
  );
  if (!source) notFound();

  const supabase = await createCoreExamServerClient();
  if (source.kind === "text") {
    const { data, error } = await supabase.storage
      .from(source.storageBucket)
      .download(source.storagePath);
    if (error || !data) notFound();

    const escapedText = (await data.text())
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${source.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 32px clamp(20px, 5vw, 64px) 80px;
        background: #f7f8f5;
        color: #26332d;
        font: 15px/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      pre { margin: 0 auto; max-width: 960px; white-space: pre-wrap; overflow-wrap: anywhere; }
    </style>
  </head>
  <body><pre>${escapedText}</pre></body>
</html>`;

    return new Response(document, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { data, error } = await supabase.storage
    .from(source.storageBucket)
    .createSignedUrl(source.storagePath, 15 * 60, {
      download: false,
    });
  if (error || !data?.signedUrl) notFound();

  return new Response(null, {
    headers: {
      "Cache-Control": "private, no-store",
      Location: data.signedUrl,
      "X-Content-Type-Options": "nosniff",
    },
    status: 307,
  });
}
