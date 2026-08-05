"use client";

import { useEffect, useState } from "react";

type Visibility = "full" | "partial";

// Desktop sticky rail: one tick per (non-hidden) question, in three states —
// off-screen (base), partially visible (halfway), fully visible (full). The lit
// window tracks continuously and can't skip a card at any scroll speed. The
// rail fades out when every question is fully on screen and back in when some
// are off. Recomputes on scroll, resize, and card toggle.
export function QuestionTOC({ questionIds }: { questionIds: string[] }) {
  const [visibility, setVisibility] = useState<Map<string, Visibility>>(
    new Map(),
  );
  const [allVisible, setAllVisible] = useState(true);

  useEffect(() => {
    if (questionIds.length === 0) return;
    let frame = 0;
    const compute = () => {
      frame = 0;
      const top = 76; // just below the sticky header
      const bottom = window.innerHeight;
      const next = new Map<string, Visibility>();
      for (const id of questionIds) {
        const element = document.getElementById(`ce-question-${id}`);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top >= top - 1 && rect.bottom <= bottom + 1) {
          next.set(id, "full");
        } else if (rect.bottom > top && rect.top < bottom) {
          next.set(id, "partial");
        }
      }
      setVisibility(next);
      // Fade the rail when every question is fully on screen.
      setAllVisible(questionIds.every((id) => next.get(id) === "full"));
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(compute);
    };
    compute();
    // Capture phase so a nested scroll container's scroll still reaches us.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("toggle", schedule, true);
    // A card's expand/collapse animates its height over ~0.26s *after* the
    // toggle event fires, so a one-shot recompute on toggle lands on the
    // pre-animation layout. Observe each card's size instead: the growing card
    // fires continuously through the animation, and compute() re-reads every
    // card's position each time, so the ticks track the whole transition.
    const observer = new ResizeObserver(schedule);
    for (const id of questionIds) {
      const element = document.getElementById(`ce-question-${id}`);
      if (element) observer.observe(element);
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("toggle", schedule, true);
      observer.disconnect();
    };
  }, [questionIds]);

  if (questionIds.length === 0) return null;

  const jumpTo = (id: string) => {
    document
      .getElementById(`ce-question-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Questions on this page"
      className="ce-question-toc"
      data-faded={allVisible ? "true" : undefined}
    >
      {questionIds.map((id, index) => (
        <button
          aria-label={`Jump to question ${index + 1}`}
          className="ce-toc-tick"
          data-visibility={visibility.get(id)}
          key={id}
          onClick={() => jumpTo(id)}
          type="button"
        />
      ))}
    </nav>
  );
}
