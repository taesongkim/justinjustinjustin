"use client";

import { useEffect, useMemo, useState } from "react";

type Control = {
  var: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  default: number;
};

// Every tunable value the slider reads via var(--cs-*, fallback). The panel
// writes them to :root so all live sliders update at once; "Copy CSS" emits a
// snippet to bake into `.ce-confidence` once the values settle.
const CONTROLS: Control[] = [
  { var: "--cs-size", label: "Handle · rest size", min: 3, max: 40, step: 1, unit: "px", default: 5 },
  { var: "--cs-size-active", label: "Handle · active size", min: 10, max: 64, step: 1, unit: "px", default: 20 },
  { var: "--cs-track-w", label: "Track width", min: 24, max: 260, step: 1, unit: "px", default: 33 },
  { var: "--cs-rail-h", label: "Rail thickness", min: 1, max: 8, step: 1, unit: "px", default: 1 },
  { var: "--cs-notch", label: "Notch size", min: 2, max: 18, step: 1, unit: "px", default: 5 },
  { var: "--cs-notch-bw", label: "Notch ring width", min: 0.5, max: 4, step: 0.5, unit: "px", default: 1 },
  { var: "--cs-pip", label: "Member pip size", min: 2, max: 14, step: 1, unit: "px", default: 3 },
  { var: "--cs-op-uncertain", label: "L1 · rest opacity", min: 0.1, max: 1, step: 0.05, unit: "", default: 0.5 },
  { var: "--cs-pulse-min", label: "L2 · pulse min opacity", min: 0.05, max: 1, step: 0.05, unit: "", default: 0.25 },
  { var: "--cs-pulse-ms", label: "L2 · pulse duration", min: 400, max: 3000, step: 50, unit: "ms", default: 850 },
  { var: "--cs-glow-blur", label: "L4 · glow blur", min: 0, max: 30, step: 1, unit: "px", default: 6 },
  { var: "--cs-glow-spread", label: "L4 · glow spread", min: 0, max: 14, step: 1, unit: "px", default: 0 },
  { var: "--cs-glow-ms", label: "L4 · glow pulse", min: 400, max: 3200, step: 50, unit: "ms", default: 1150 },
  { var: "--cs-rings-ms", label: "L5 · ring cadence", min: 800, max: 4000, step: 50, unit: "ms", default: 3750 },
  { var: "--cs-rings-scale", label: "L5 · ring max scale", min: 1.5, max: 6, step: 0.1, unit: "", default: 3 },
  { var: "--cs-resize-ms", label: "Hover/drag resize", min: 60, max: 500, step: 10, unit: "ms", default: 100 },
  { var: "--cs-move-ms", label: "Move ripple time", min: 200, max: 1000, step: 20, unit: "ms", default: 200 },
  { var: "--cs-move-scale", label: "Move ripple scale", min: 1.5, max: 4, step: 0.1, unit: "", default: 1.5 },
  { var: "--cs-land-ms", label: "Settle ripple time", min: 200, max: 1200, step: 20, unit: "ms", default: 320 },
  { var: "--cs-land-scale", label: "Settle ripple scale", min: 1.5, max: 6, step: 0.1, unit: "", default: 4 },
  { var: "--cr-hidden-op", label: "Hidden · ring opacity", min: 0.05, max: 1, step: 0.05, unit: "", default: 0.2 },
  { var: "--cr-x-size", label: "Hidden · X size", min: 4, max: 16, step: 0.5, unit: "px", default: 8 },
  { var: "--cr-x-weight", label: "Hidden · X weight", min: 0.5, max: 3, step: 0.25, unit: "px", default: 1 },
];

// Handle color is theme-aware (--cs-color in :root light/dark), not tuned here.

export function ConfidenceDevPanel() {
  const [nums, setNums] = useState<Record<string, number>>(() =>
    Object.fromEntries(CONTROLS.map((c) => [c.var, c.default])),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const c of CONTROLS) root.style.setProperty(c.var, `${nums[c.var]}${c.unit}`);
  }, [nums]);

  const snippet = useMemo(() => {
    const lines = CONTROLS.map((c) => `  ${c.var}: ${nums[c.var]}${c.unit};`);
    return `.ce-confidence {\n${lines.join("\n")}\n}`;
  }, [nums]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — the snippet is still visible to copy by hand */
    }
  };

  const reset = () => {
    setNums(Object.fromEntries(CONTROLS.map((c) => [c.var, c.default])));
  };

  return (
    <aside className="cs-panel" data-collapsed={collapsed || undefined}>
      <header className="cs-panel-head">
        <strong>Confidence controls</strong>
        <button onClick={() => setCollapsed((v) => !v)} type="button">
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </header>
      {!collapsed && (
        <>
          <div className="cs-panel-body">
            {CONTROLS.map((c) => (
              <label className="cs-row" key={c.var}>
                <span>
                  {c.label}
                  <em>
                    {nums[c.var]}
                    {c.unit}
                  </em>
                </span>
                <input
                  max={c.max}
                  min={c.min}
                  onChange={(e) =>
                    setNums((prev) => ({
                      ...prev,
                      [c.var]: Number(e.target.value),
                    }))
                  }
                  step={c.step}
                  type="range"
                  value={nums[c.var]}
                />
              </label>
            ))}
          </div>
          <div className="cs-panel-foot">
            <button onClick={copy} type="button">
              {copied ? "Copied ✓" : "Copy CSS"}
            </button>
            <button onClick={reset} type="button">
              Reset
            </button>
          </div>
          <pre className="cs-panel-snippet">{snippet}</pre>
        </>
      )}
    </aside>
  );
}
