'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import './styles.css';

const SLIDES = [
  // 0 — Cover
  () => (
    <>
      <div className="aw-cover-ornament">✦ ✦ ✦</div>
      <div className="aw-section-label">Participant Guide</div>
      <h1>The Artist's Way<br />+ Group</h1>
      <div className="aw-cover-rule" />
      <p className="aw-subtitle">
        What to expect, what you're agreeing to, and what to do when things
        don't go to plan.
      </p>
      <p>
        This guide is for anyone intending to begin the Artist's Way program and join an Artist's Way group. It draws
        directly from Julia Cameron's text — the commitments, the structure,
        the cautions, and the grace the practice asks of you.
      </p>
      <div className="aw-cover-rule" style={{ opacity: 0.3 }} />
      <p className="aw-cover-meta">Guide written for April 2026 Group by Justin</p>
    </>
  ),

  // 1 — What this is
  () => (
    <>
      <div className="aw-section-label">Orientation</div>
      <h2>What is the program?</h2>
      <p>
        The Artist's Way is a personal 12-week daily creative practice. 
        An Artist's Way group is intended to witness and accompany your process. When journeying as a group, it's recommended that you think of this as an individual project with group support, rather than as a group project.
        </p>
        <p>
        In fact the weekly group meeting is the smallest part of the commitment. The
        bulk of the work happens on your own time.
      </p>
      <p>
        The program is built around two core tools — morning pages and artist
        dates — supported by weekly reading, exercises.
      </p>
      <div className="aw-cover-rule" style={{ opacity: 0.3 }} />

      <h3>The 12-week arc</h3>
      <p>
        Each week has a theme around recovering a sense of something. The
        chapters build on each other and are done in order. You don't skip
        weeks or rearrange them.
      </p>

      <div className="aw-arc-phase aw-phase-a">
        <div className="aw-arc-phase-label">Weeks 1–4 · Foundation</div>
        <div className="aw-arc-weeks">
          <span className="aw-arc-week">Safety</span>
          <span className="aw-arc-week">Identity</span>
          <span className="aw-arc-week">Power</span>
          <span className="aw-arc-week">Integrity</span>
        </div>
      </div>
      <div className="aw-arc-phase aw-phase-b">
        <div className="aw-arc-phase-label">Weeks 5–8 · Deepening</div>
        <div className="aw-arc-weeks">
          <span className="aw-arc-week">Possibility</span>
          <span className="aw-arc-week">Abundance</span>
          <span className="aw-arc-week">Connection</span>
          <span className="aw-arc-week">Strength</span>
        </div>
      </div>
      <div className="aw-arc-phase aw-phase-c">
        <div className="aw-arc-phase-label">Weeks 9–12 · Integration</div>
        <div className="aw-arc-weeks">
          <span className="aw-arc-week">Compassion</span>
          <span className="aw-arc-week">Self-protection</span>
          <span className="aw-arc-week">Autonomy</span>
          <span className="aw-arc-week">Faith</span>
        </div>
      </div>
      <p>
        The program has a known rhythm. The first weeks often feel giddy or
        tentative. The middle weeks surface anger, grief, or resistance. Weeks
        8–10 are where groups tend to fracture. Cameron names this as a
        "creative U-turn" — knowing it's coming is part of the practice.
      </p>
    </>
  ),

  // 2 — Morning Pages + Artist Date
  () => (
    <>
      <div className="aw-section-label">The Two Core Tools</div>
      <h2>What you're committing to</h2>

      <h3>Morning pages — daily, non-negotiable</h3>
      <p>
        Three pages of longhand, stream-of-consciousness writing, done first
        thing every morning, every day for 12 weeks. 
      </p>
      <div className="aw-callout">
        <div className="aw-callout-label">Note from Justin</div>
        <p>For time reasons, I'm going to experiment with typed morning pages. But you're welcome to commit in whatever style you want.</p>
      </div>
      <p>
        Morning pages are not meant to be good writing, interesting writing, or even
        coherent writing. They are a brain drain — a daily clearing of whatever
        is sitting in front of your creative life.
      </p>
      <ul>
        <li>Three pages, every morning, before other activities if possible</li>
        <li>Stream-of-consciousness — write whatever comes, without editing</li>
        <li>Do not share them with anyone, including the group</li>
        <li>Do not reread them yourself for the first eight weeks</li>
        <li>There is no wrong entry. Nothing is too petty, too silly, or too weird.</li>
      </ul>
      <div className="aw-callout">
        <div className="aw-callout-label">Time</div>
        <p>Roughly 30–45 minutes per day depending on your handwriting pace.</p>
        <p>Roughly 10-20 minutes typed.</p>
      </div>

      <h3>Artist date — weekly, solo</h3>
      <p>
        One block of time per week — roughly two hours — committed to nurturing
        your inner creative life. An excursion, a play date with yourself.
        Something you genuinely enjoy or find interesting.
      </p>
      <ul>
        <li>Once per week, every week</li>
        <li>Alone — no partners, friends, children, or companions of any kind</li>
        <li>Preplanned and protected from scheduling pressure</li>
        <li>Not productive. Not an errand. Not something you "should" do.</li>
        <li>Cost is not the point; time is the point.</li>
      </ul>
      <p>
        Examples: a solo trip to a museum, a film seen alone, a walk somewhere
        new, time in a record store or bookshop, sitting in a café with no
        agenda.
      </p>
    </>
  ),

  // 3 — Weekly structure
  () => (
    <>
      <div className="aw-section-label">Weekly Rhythm</div>
      <h2>The weekly structure</h2>

      <h3>Reading and exercises</h3>
      <p>
        Read the chapter for the week — Cameron suggests Sunday night.
        Immediately after reading, speed-write through the exercises (examples on next page). The speed
        is intentional. Moving fast bypasses the inner critic.
      </p>
      <p>
        Each chapter also includes tasks. You won't complete all of them. Aim
        for roughly half — the ones that appeal to you, and the ones you most
        resist. Leave the neutral ones.
      </p>
      <blockquote><p>Examples of tasks: Could be a journaling thing, like listing 20 things you enjoy doing; could be more active, like: buying yourself a favorite childhood food, or sending postcards to five people you'd love to hear from ... etc.</p></blockquote>

      <h3>Weekly check-in (Personal)</h3>
      <p>
        At the end of each week, spend about 20 minutes writing answers to
        these three questions:
      </p>
      <ol>
        <li>How many days this week did you do your morning pages? How was the experience?</li>
        <li>Did you do your artist date this week? What did you do? How did it feel?</li>
        <li>Were there any other issues this week that felt significant for your recovery?</li>
      </ol>

      <h3>Weekly group meeting — 2 to 3 hours</h3>
      <p>
        The meeting covers a shared check-in, exercises discussed in groups of
        four, and space for whatever else arises. Cameron says this will take 2-3 hours. Might be shorter.
      </p>
      <div className="aw-callout">
        <div className="aw-callout-label">The core rule</div>
        <p>
          Intend primarily to witness; not to fix. When someone shares, the group
          listens. No advice, no analysis, no solutions are necessary. You are to be mirrors for
          each other; not therapists nor advisors. 
        </p>
      </div>

      <h3>Total time per week</h3>
      <table className="aw-time-table">
        <tbody>
          <tr><td>Morning pages (7 days)</td><td>3.5–5 hrs written, 1-2hrs typed</td></tr>
          <tr><td>Artist date</td><td>2 hrs</td></tr>
          <tr><td>Reading + exercises</td><td>1–1.5 hrs</td></tr>
          <tr><td>Weekly meeting</td><td>2–3 hrs</td></tr>
          <tr><td>Check-in</td><td>20 min</td></tr>
          <tr className="aw-total"><td>Total</td><td>~7–12 hrs</td></tr>
        </tbody>
      </table>
      <p>
        This is not light. If your life is already at capacity, it's worth
        waiting for a time when it isn't.
      </p>
    </>
  ),

  // 4 — Exercises
  () => (
    <>
      <div className="aw-section-label">Inside the Meeting</div>
      <h2>What the exercises look like</h2>
      <p>
        Each week's exercises are prompted writing done quickly. Some are
        sentence completions, some are lists, some are maps or inventories.
        Here are real examples from across the 12 weeks.
      </p>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">Sentence completions</div>
        <p>
          People with money are ____. Money makes people ____. My dad thought
          money was ____. I'm afraid that if I had money I would ____. (20
          phrases total)
        </p>
        <span className="aw-exercise-week">Week 6 — Abundance</span>
      </div>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">Lists</div>
        <p>
          List five hobbies that sound fun. List five things you personally
          would never do that sound fun. List five things you used to enjoy
          doing. List five silly things you would like to try once.
        </p>
        <span className="aw-exercise-week">Week 4 — Integrity</span>
      </div>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">Inventory</div>
        <p>List ten things you love and would love to do but are not allowed to do.</p>
        <span className="aw-exercise-week">Week 5 — Possibility</span>
      </div>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">A map</div>
        <p>
          Draw three columns. In the first, list people you feel jealous of. In
          the second, write why. In the third, list one action you could take to
          move toward that thing rather than away from it.
        </p>
        <span className="aw-exercise-week">Week 7 — Connection</span>
      </div>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">Childhood excavation</div>
        <p>
          As a kid, I missed the chance to ____. As a kid, I dreamed of being
          ____. As a kid, I could have used ____.
        </p>
        <span className="aw-exercise-week">Week 7 — Connection</span>
      </div>

      <div className="aw-exercise-card">
        <div className="aw-exercise-type">Goal work</div>
        <p>
          In a perfect world, I would secretly love to be a ____. Name one
          concrete goal that would signal movement in that direction. Name one
          action you could take this week.
        </p>
        <span className="aw-exercise-week">Week 9 — Compassion</span>
      </div>

      <p>
        These are shared in the meeting in groups of four — not read aloud
        verbatim, but discussed: what came up, what surprised you, what you
        resisted writing. The group's job is to receive without commentary.
        The value is in the witnessing, not the feedback.
      </p>
    </>
  ),

  // 5 — Principles
  () => (
    <>
      <div className="aw-section-label">The Agreement</div>
      <h2>What you're agreeing to</h2>
      <p>
        These principles are drawn directly from the text — the Basic
        Principles, the Rules of the Road, and the Creative Clusters
        guidelines.
      </p>

      <div className="aw-principle">
        <div className="aw-principle-title">I commit to the work.</div>
        <p className="aw-principle-body">
          Morning pages every day. Artist date every week. For all 12 weeks.
          These are the spine of the practice; not accessories to it.
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">I keep my pages private.</div>
        <p className="aw-principle-body">
          I won't share my morning pages with anyone, and I won't read them
          back to myself for the first eight weeks.
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">I show up to witness, not to fix.</div>
        <p className="aw-principle-body">
          When others share, I listen. I won't analyze, advise, or try to solve
          anyone else's process. Each person's recovery belongs to them.
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">I do the work, not judge the work.</div>
        <p className="aw-principle-body">
          My job is to show up and produce. It is not my job to decide whether
          what I'm making is good enough. <u>Quality is not my concern during this
          process.</u>
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">I claim my own recovery.</div>
        <p className="aw-principle-body">
          No one can do this for me — not the facilitator, not the group. The
          work is mine.
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">I keep what's shared here sacred.</div>
        <p className="aw-principle-body">
          What people bring to this group is sensitive. We are dealing with dreams
          and wounds. That deserves protection. I agree not to share sensitive information about others carelessly. And I agree to inform others when something I'm sharing is sensitive to me, and I'd like it kept private.
        </p>
      </div>
      <div className="aw-principle">
        <div className="aw-principle-title">
          I expect resistance and I will not quit because of it.
        </div>
        <p className="aw-principle-body">
          I understand I will feel rebellious at points. I understand that the urge to quit
          is part of the process, not a signal that the process isn't working.
        </p>
      </div>
    </>
  ),

  // 6 — When things go wrong
  () => (
    <>
      <div className="aw-section-label">When Things Don't Go to Plan</div>
      <h2>What to do</h2>

      <h3>When you miss morning pages</h3>
      <p>
        Relapse is okay. Cameron says this directly:{' '}
        <em>
          "You cannot do this process perfectly, so relax, be kind to yourself,
          and hold on to your hat."
        </em>{' '}
        Missing a day does not break the practice. Return the next morning
        without self-flagellation. The pages don't accumulate — you don't owe
        yesterday's pages today. You just start again.
      </p>
      <p>
        What to avoid: using a missed day as evidence that the practice isn't
        working, or as permission to stop.
      </p>

      <h3>When you miss your artist date</h3>
      <p>
        Take note of what got in the way. Resistance to the artist date is
        often stronger than resistance to the pages, because spending two hours
        purely on yourself can feel harder to justify. If you missed it because
        it felt selfish or indulgent, that's information worth writing about in
        your pages. Reschedule it. Protect the next one more deliberately.
      </p>

      <h3>When you miss a weekly meeting</h3>
      <p>A missed meeting does not mean a missed week. Do the full week on your own:</p>
      <ol>
        <li>Read the chapter (Cameron suggests Sunday night)</li>
        <li>Immediately speed-write through the exercises after reading</li>
        <li>Attempt roughly half the tasks — the appealing ones and the ones you most resist</li>
        <li>Do your check-in at the end of the week (the three questions, by hand)</li>
        <li>Continue morning pages and your artist date without interruption</li>
      </ol>
      <p>
        What you miss is the sharing-in-fours. That is valuable, but it is not
        the mechanism through which the program works.
      </p>

      <h3>When you feel like quitting</h3>
      <p>
        This is expected at weeks 3–5, and again at weeks 8–10. The instruction
        is not to push through with willpower — it's to notice the resistance,
        name it, and keep doing the small daily actions regardless of how you
        feel.
      </p>
      <blockquote>
        <p>
          "Even when you feel nothing is happening, you will be changing at
          great velocity."
          <br />
          <span className="aw-quote-attr">— Julia Cameron</span>
        </p>
      </blockquote>

      <h3>When the group feels wrong</h3>
      <p>
        Cameron is direct: if the group or facilitator doesn't feel in alignment with you, leave
        and work on your own, or start/join another group. The practice does not require a particular group or a group at all. It
        requires the daily work.
      </p>
    </>
  ),

  // 7 — What this is not
  () => (
    <>
      <div className="aw-section-label">A Final Note</div>
      <h2>What this is not</h2>

      <p>
        Cameron is emphatic that this is not therapy and should not function
        like therapy. Over-processing and intellectualizing are forms of
        resistance — ways of talking about creativity instead of practicing it.
        The group should not become a space for analyzing why people are
        blocked. It should be a space for doing the work and witnessing each
        other doing it.
      </p>

      <p>
        The program is also not a writing group, a critique circle, or a
        workshop. Morning pages are not meant to be shared or discussed. The work produced
        during the 12 weeks is private unless you choose to share it, and the
        group has no role in evaluating it.
      </p>

      <div className="aw-closing">
        <div className="aw-cover-ornament" style={{ fontSize: 18, marginBottom: 16 }}>✦</div>
        <p className="aw-closing-note">
          Next steps:<br></br>
          - Pick what weekday and time we're meeting<br></br>
          - Pick our start date<br></br>
          - Everyone make final decision whether they're in for the group or not
        </p>
      </div>
    </>
  ),
];

export default function WhatToExpect() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(0);
  const [exitIndex, setExitIndex] = useState<number | null>(null);
  const slidesRef = useRef<(HTMLDivElement | null)[]>([]);
  const total = SLIDES.length;

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current || index < 0 || index >= total) return;
      setAnimating(true);
      setDirection(index > current ? 1 : -1);
      setExitIndex(current);
      setCurrent(index);

      setTimeout(() => {
        setAnimating(false);
        setExitIndex(null);
      }, 460);
    },
    [animating, current, total],
  );

  // Reset scroll on slide change
  useEffect(() => {
    slidesRef.current[current]?.scrollTo(0, 0);
  }, [current]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(current + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(current - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goTo, current]);

  // Swipe support
  useEffect(() => {
    let startX = 0;
    function onStart(e: TouchEvent) { startX = e.touches[0].clientX; }
    function onEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    }
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [goTo, current]);

  return (
    <div className="aw-shell">
      <div className="aw-topbar">
        <span className="aw-book-title">The Artist's Way</span>
        <span className="aw-page-counter">{current + 1} / {total}</span>
      </div>
      <div className="aw-top-rule" />

      <div className="aw-slides-wrapper">
        {SLIDES.map((Slide, i) => {
          let className = 'aw-slide';
          let style: React.CSSProperties = {};

          if (i === current) {
            className += ' aw-slide-active';
          } else if (i === exitIndex) {
            className += ' aw-slide-exit';
            style.transform = direction > 0 ? 'translateX(-40px)' : 'translateX(40px)';
          }

          // Entering slide direction
          if (i === current && animating) {
            // handled by CSS transition from initial offset
          }

          return (
            <div
              key={i}
              ref={el => { slidesRef.current[i] = el; }}
              className={className}
              style={style}
            >
              <Slide />
            </div>
          );
        })}
      </div>

      <div className="aw-bottom-rule" />
      <div className="aw-bottom-nav">
        <button
          className="aw-nav-btn aw-prev"
          disabled={current === 0}
          onClick={() => goTo(current - 1)}
        >
          ← Prev
        </button>
        <div className="aw-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`aw-dot${i === current ? ' aw-dot-active' : ''}`}
              aria-label={`Page ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          className="aw-nav-btn aw-next"
          disabled={current === total - 1}
          onClick={() => goTo(current + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
