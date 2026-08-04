import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";

// Live-refresh the current view when anyone else in the space acts. Every
// collaborative action inserts a core_exam_activity_events row, so this single
// INSERT subscription covers answers, comments, likelihood, hides, verification,
// and contributions. Own actions already refresh locally, so we ignore them.
// Refreshes are debounced to coalesce bursts.
export function useLiveActivity(
  spaceId: string | null | undefined,
  viewerId: string | null | undefined,
) {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    const supabase = createCoreExamBrowserClient();
    const channel = supabase
      .channel(`core-exam-activity:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "core_exam_activity_events",
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const actorId = (payload.new as { actor_id?: string })?.actor_id;
          if (actorId && actorId === viewerId) return;
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
