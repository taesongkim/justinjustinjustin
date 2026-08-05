import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";

// Live-refresh when anyone else changes a confidence level, so the group rings
// update without waiting for another action. Confidence upserts (insert or
// update), so we listen to all changes. Own changes are already optimistic
// locally, so we ignore them. Refreshes are debounced to coalesce bursts.
export function useLiveConfidence(
  spaceId: string | null | undefined,
  viewerId: string | null | undefined,
) {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    const supabase = createCoreExamBrowserClient();
    const channel = supabase
      .channel(`core-exam-confidence:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "core_exam_confidence",
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const userId = (payload.new as { user_id?: string })?.user_id;
          if (userId && userId === viewerId) return;
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => router.refresh(), 500);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [spaceId, viewerId, router]);
}
