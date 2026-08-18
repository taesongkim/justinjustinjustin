"use client";

import { useEffect, useRef } from "react";

// A proportionate horizontal timeline of the Core Energetics developmental
// wounding periods, conception to age six. The bars, axis, and labels are data;
// the rapprochement column and the faint full-height gridlines are measured off
// the rendered rows (they need real geometry), so the whole thing is built
// imperatively into a ref rather than as declarative JSX. Displayed ranges and
// hover citations stay the stated numbers — only the drawn bar geometry is
// padded so the feathered edges read as soft thresholds.

type Ghost = {
  s: number;
  e: number;
  word: string;
  type: string;
  win: string;
  cite: string;
  note: string;
};

type Bar = {
  cls: string;
  word: string;
  short: string;
  type: string;
  s: number;
  e: number;
  win: string;
  cite: string;
  note: string;
  flag?: boolean;
  ghost?: Ghost;
};

type Formation = {
  word: string;
  short: string;
  type: string;
  win: string;
  s: number;
  e: number;
  cite: string;
  note: string;
};

const MIN = -9;
const MAX = 72;
const PAD = 4;

const pct = (m: number) => ((m - MIN) / (MAX - MIN)) * 100;
const clamp = (m: number) => Math.max(MIN, Math.min(MAX, m));

const yearLabels: Record<number, string> = {
  0: "Birth",
  12: "1 yr",
  24: "2 yr",
  36: "3 yr",
  48: "4 yr",
  60: "5 yr",
  72: "6 yr",
};

const halfLabels: Record<number, string> = {
  6: "6 mo",
  18: "18 mo",
  30: "30 mo",
  42: "42 mo",
  54: "54 mo",
  66: "66 mo",
};

const rapp = {
  type: "Developmental crisis · Mahler",
  word: "Rapprochement",
  win: "15–24 mo",
  cite: "Mahler via J pp.37,156",
  note: "Mahler's rapprochement subphase — the toddler swings between autonomy and reconnection. The narcissistic injury forms here, and it's where Johnson places the aggressive/psychopathic structure. Marked across all bars because it colors the whole early-childhood field.",
};

const patterns: Bar[] = [
  {
    cls: "c-leaving",
    word: "Leaving",
    short: "utero–6mo",
    type: "Kessler pattern · Embodiment",
    s: -9,
    e: 6,
    win: "in utero – 6 mo",
    cite: "K p.87",
    note: "Johnson: schizoid, earliest months — aligned. [J ch.2 pp.21–27]",
  },
  {
    cls: "c-merging",
    word: "Merging",
    short: "6mo–2½yr",
    type: "Kessler pattern · Taking In",
    s: 6,
    e: 30,
    win: "6 mo – 2½ yr",
    cite: "K p.87",
    note: "Johnson: oral, first year+ — overlaps the rapprochement window. [J ch.2 pp.27–34]",
  },
  {
    cls: "c-enduring",
    word: "Enduring",
    short: "1½–3yr",
    type: "Kessler pattern · Putting Out",
    s: 18,
    e: 36,
    win: "1½ – 3 yr",
    cite: "K p.87",
    note: "Johnson: masochistic, 18 mo – 2 yr+ — close, not identical. [J ch.9]",
  },
  {
    cls: "c-aggressive",
    word: "Aggressive",
    short: "2½–4yr",
    type: "Kessler pattern · Trusting Others",
    s: 30,
    e: 48,
    win: "2½ – 4 yr",
    cite: "K p.87",
    flag: true,
    note: "Kessler's window. See the hatched ghost for Johnson's divergent placement.",
    ghost: {
      s: 15,
      e: 24,
      word: "Aggressive — Johnson's divergence",
      type: "Source conflict · register S2",
      win: "15–24 mo (Johnson)",
      cite: "J pp.37,156",
      note: "<b>Neighborhood, not equation.</b> Kessler puts Aggressive at 2½–4 yr, but its nearest Johnson name — the narcissist, via “psychopathic” — forms in rapprochement, 15–24 mo. The names align through “psychopathic”; the timing doesn't.",
    },
  },
  {
    cls: "c-rigid",
    word: "Rigid",
    short: "3½–5yr",
    type: "Kessler pattern · Trusting Self",
    s: 42,
    e: 60,
    win: "3½ – 5 yr",
    cite: "K p.87",
    note: "Johnson: the oedipal era (hysterical + OC) — aligned in era, split in structure. [J ch.4, ch.10]",
  },
];

const injuries: Bar[] = [
  {
    cls: "c-narciss",
    word: "Narc.",
    short: "15–24mo",
    type: "Injury window",
    s: 15,
    e: 24,
    win: "15–24 mo",
    cite: "J pp.37,156",
    note: "Narcissistic injury. Forms in Mahler's rapprochement. This window is exactly where Kessler's Aggressive and Johnson's narcissist part ways.",
  },
  {
    cls: "c-oedipal",
    word: "Oedipal",
    short: "~3½–5yr",
    type: "Injury window",
    s: 42,
    e: 60,
    win: "~3½–5 yr",
    cite: "J ch.4, ch.10; K p.87",
    note: "Biased to your sources' window (folded into Rigid). Other framings run classic oedipal wider, ~3–6 yr.",
  },
];

const formation: Formation = {
  word: "Image, Mask, Lower Self Formation",
  short: "childhood · no fixed window",
  type: "Formation",
  win: "childhood · no defined window",
  s: 0,
  e: 60,
  cite: "PL 14; ICE §Step 2; T ch.7",
  note: "Images, the lower self, and the mask all form here — no fixed age in the sources. They form at the point of wounding, so they span the early-childhood wounding period. PL 14: honest awareness of the feeling/action gap prevents mask formation.",
};

function tipHtml(d: { type: string; word: string; win: string; cite: string; note?: string }) {
  return (
    '<div class="t-type">' +
    d.type +
    '</div><div class="t-name">' +
    d.word +
    ' &nbsp;<span class="t-win">' +
    d.win +
    "</span></div><span class=\"t-cite\">" +
    d.cite +
    "</span>" +
    (d.note ? '<div class="t-note">' + d.note + "</div>" : "")
  );
}

export function DevelopmentalTimeline() {
  const innerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = innerRef.current;
    const tip = tipRef.current;
    if (!inner || !tip) return;
    inner.replaceChildren();

    const geo = (el: HTMLElement, s: number, e: number) => {
      const a = clamp(s - PAD);
      const b = clamp(e + PAD);
      el.style.left = pct(a) + "%";
      el.style.width = pct(b) - pct(a) + "%";
    };

    const tipShow = (html: string, cx: number, cy: number) => {
      tip.innerHTML = html;
      tip.classList.add("on");
      let x = cx + 14;
      let y = cy + 14;
      if (x + 312 > window.innerWidth) x = cx - 312;
      if (x < 6) x = 6;
      if (y + tip.offsetHeight > window.innerHeight) y = cy - tip.offsetHeight - 12;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    };
    const tipHide = () => tip.classList.remove("on");
    const bindTip = (el: HTMLElement, html: string) => {
      el.addEventListener("mousemove", (e) => tipShow(html, e.clientX, e.clientY));
      el.addEventListener("mouseleave", tipHide);
      el.addEventListener("focus", () => {
        const b = el.getBoundingClientRect();
        tipShow(html, b.left + b.width / 2, b.bottom);
      });
      el.addEventListener("blur", tipHide);
    };

    // axis: month / half-year / year notches + year labels
    const axis = document.createElement("div");
    axis.className = "tl-axis";
    for (let m = MIN; m <= MAX; m++) {
      const n = document.createElement("span");
      n.className = "tl-notch " + (m % 12 === 0 ? "yr" : m % 6 === 0 ? "half" : "mo");
      n.style.left = pct(m) + "%";
      axis.appendChild(n);
    }
    for (const k of Object.keys(yearLabels)) {
      const l = document.createElement("span");
      l.className = "tl-ylabel";
      l.style.left = pct(Number(k)) + "%";
      l.textContent = yearLabels[Number(k)];
      axis.appendChild(l);
    }
    for (const k of Object.keys(halfLabels)) {
      const l = document.createElement("span");
      l.className = "tl-ylabel half";
      l.style.left = pct(Number(k)) + "%";
      l.textContent = halfLabels[Number(k)];
      axis.appendChild(l);
    }
    inner.appendChild(axis);

    const mkBar = (d: Bar) => {
      const bar = document.createElement("div");
      bar.className = "tl-bar " + d.cls;
      bar.tabIndex = 0;
      geo(bar, d.s, d.e);
      bar.innerHTML =
        '<span class="tl-glow"></span><span class="tl-fill"></span><span class="tl-label"><span class="tl-word">' +
        d.word +
        '</span><span class="tl-range">' +
        d.short +
        "</span></span>" +
        (d.flag ? '<span class="tl-flag">⚠</span>' : "");
      bindTip(bar, tipHtml(d));
      return bar;
    };

    // GROUP 1 — patterns
    const g1 = document.createElement("div");
    g1.className = "tl-group patterns";
    const l1 = document.createElement("div");
    l1.className = "tl-group-label";
    l1.textContent = "Kessler patterns";
    g1.appendChild(l1);
    let firstRow: HTMLElement | null = null;
    for (const d of patterns) {
      const row = document.createElement("div");
      row.className = "tl-row";
      if (!firstRow) firstRow = row;
      if (d.ghost) {
        const g = document.createElement("div");
        g.className = "tl-ghost";
        g.tabIndex = 0;
        g.style.left = pct(d.ghost.s) + "%";
        g.style.width = pct(d.ghost.e) - pct(d.ghost.s) + "%";
        bindTip(g, tipHtml(d.ghost));
        row.appendChild(g);
      }
      row.appendChild(mkBar(d));
      g1.appendChild(row);
    }
    inner.appendChild(g1);

    // GROUP 2 — injuries
    const g2 = document.createElement("div");
    g2.className = "tl-group";
    const l2 = document.createElement("div");
    l2.className = "tl-group-label";
    l2.textContent = "Injury windows";
    g2.appendChild(l2);
    const irow = document.createElement("div");
    irow.className = "tl-row";
    for (const d of injuries) irow.appendChild(mkBar(d));
    g2.appendChild(irow);
    inner.appendChild(g2);

    // GROUP 3 — formation
    const g3 = document.createElement("div");
    g3.className = "tl-group";
    const l3 = document.createElement("div");
    l3.className = "tl-group-label";
    l3.textContent = "No defined window";
    g3.appendChild(l3);
    const frow = document.createElement("div");
    frow.className = "tl-row";
    const span = document.createElement("div");
    span.className = "tl-span";
    span.tabIndex = 0;
    geo(span, formation.s, formation.e);
    // Right edge flush with the graph's right edge — signals it continues past 6 yr.
    span.style.width = 100 - parseFloat(span.style.left) + "%";
    span.innerHTML =
      '<span class="tl-label"><span class="tl-word">' +
      formation.word +
      '</span><span class="tl-range">' +
      formation.short +
      "</span></span>";
    bindTip(span, tipHtml(formation));
    frow.appendChild(span);
    g3.appendChild(frow);
    inner.appendChild(g3);

    // Behind everything: extend the axis notches as faint full-height gridlines,
    // and the rapprochement column across every bar (first row → last row).
    const irTop = inner.getBoundingClientRect().top;
    const axisBottom = axis.offsetTop + axis.offsetHeight;
    const topY = (firstRow as HTMLElement).getBoundingClientRect().top - irTop;
    const botY = frow.getBoundingClientRect().bottom - irTop;
    for (let gm = MIN; gm <= MAX; gm++) {
      const tier = gm % 12 === 0 ? "yr" : gm % 6 === 0 ? "half" : "mo";
      const gl = document.createElement("div");
      gl.className = "tl-gridline " + tier;
      gl.style.left = pct(gm) + "%";
      gl.style.top = axisBottom + "px";
      gl.style.height = botY - axisBottom + "px";
      gl.style.bottom = "auto";
      inner.appendChild(gl);
    }
    const band = document.createElement("div");
    band.className = "tl-band";
    band.style.left = pct(15) + "%";
    band.style.width = pct(24) - pct(15) + "%";
    band.style.top = topY + "px";
    band.style.height = botY - topY + "px";
    const bl = document.createElement("div");
    bl.className = "tl-band-label";
    bl.tabIndex = 0;
    bl.style.left = (pct(15) + pct(24)) / 2 + "%";
    bl.style.top = topY + 3 + "px";
    bl.textContent = "Rapp.";
    bindTip(bl, tipHtml(rapp));
    inner.appendChild(band);
    inner.appendChild(bl);

    return () => {
      inner.replaceChildren();
      tip.classList.remove("on");
    };
  }, []);

  return (
    <div className="tl-view-shell">
      <article className="tl">
        <p className="eyebrow">Reference</p>
        <h1>Developmental Timeline</h1>
        <p className="lede">
          Kessler&rsquo;s five patterns and the injury windows on one
          proportionate axis, conception to age six. Hover any bar for its
          citation and source conflicts.
        </p>

        <div className="tl-chart">
          <div className="tl-scroll">
            <div className="tl-inner" ref={innerRef} />
          </div>
        </div>

        <p className="tl-foot">
          <b>Sources.</b> K = Kessler (chart p.87) · J = Johnson · Mahler via J ·
          ICE / T = Thesenga · PL = Pathwork Lecture. Bars are Kessler&rsquo;s
          windows; the hatched ghost + ⚠ on Aggressive marks where Johnson/Mahler
          place that wound differently.
        </p>
        <div className="tl-tip" ref={tipRef} role="status" />
      </article>
    </div>
  );
}
