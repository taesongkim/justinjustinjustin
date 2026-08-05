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

type ColorControl = { var: string; label: string; default: string };

// Every tunable value the slider reads via var(--cs-*, fallback). The panel
// writes them to :root so all live sliders update at once; "Copy CSS" emits a
// snippet to bake into `.ce-confidence` once the values settle.
const CONTROLS: Control[] = [
  { var: "--cs-size", label: "Handle · rest size", min: 6, max: 40, step: 1, unit: "px", default: 14 },
  { var: "--cs-size-active", label: "Handle · active size", min: 10, max: 64, step: 1, unit: "px", default: 24 },
  { var: "--cs-track-w", label: "Track width", min: 40, max: 260, step: 2, unit: "px", default: 96 },
  { var: "--cs-rail-h", label: "Rail thickness", min: 1, max: 8, step: 1, unit: "px", default: 2 },
  { var: "--cs-notch", label: "Notch size", min: 3, max: 18, step: 1, unit: "px", default: 7 },
  { var: "--cs-notch-bw", label: "Notch ring width", min: 1, max: 4, step: 0.5, unit: "px", default: 1.5 },
  { var: "--cs-pip", label: "Member pip size", min: 3, max: 14, step: 1, unit: "px", default: 6 },
  { var: "--cs-op-uncertain", label: "L1 · rest opacity", min: 0.1, max: 1, step: 0.05, unit: "", default: 0.5 },
  { var: "--cs-pulse-min", label: "L2 · pulse min opacity", min: 0.05, max: 1, step: 0.05, unit: "", default: 0.35 },
  { var: "--cs-pulse-ms", label: "L2 · pulse duration", min: 400, max: 3000, step: 50, unit: "ms", default: 1500 },
  { var: "--cs-glow-blur", label: "L4 · glow blur", min: 0, max: 30, step: 1, unit: "px", default: 10 },
  { var: "--cs-glow-spread", label: "L4 · glow spread", min: 0, max: 14, step: 1, unit: "px", default: 3 },
  { var: "--cs-glow-ms", label: "L4 · glow pulse", min: 400, max: 3200, step: 50, unit: "ms", default: 1600 },
  { var: "--cs-rings-ms", label: "L5 · ring cadence", min: 800, max: 4000, step: 50, unit: "ms", default: 2000 },
  { var: "--cs-rings-scale", label: "L5 · ring max scale", min: 1.5, max: 6, step: 0.1, unit: "", default: 3.4 },
  { var: "--cs-resize-ms", label: "Hover/drag resize", min: 60, max: 500, step: 10, unit: "ms", default: 180 },
  { var: "--cs-land-ms", label: "Release ripple time", min: 200, max: 1200, step: 20, unit: "ms", default: 620 },
  { var: "--cs-land-scale", label: "Release ripple scale", min: 1.5, max: 6, step: 0.1, unit: "", default: 3.2 },
];

const COLORS: ColorControl[] = [
  { var: "--cs-color", label: "Handle color", default: "#2f7b68" },
];

export function ConfidenceDevPanel() {
  const [nums, setNums] = useState<Record<string, number>>(() =>
    Object.fromEntries(CONTROLS.map((c) => [c.var, c.default])),
  );
  const [colors, setColors] = useState<Record<string, string>>(() =>
    Object.fromEntries(COLORS.map((c) => [c.var, c.default])),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const c of CONTROLS) root.style.setProperty(c.var, `${nums[c.var]}${c.unit}`);
    for (const c of COLORS) root.style.setProperty(c.var, colors[c.var]);
  }, [nums, colors]);

  const snippet = useMemo(() => {
    const lines = [
      ...CONTROLS.map((c) => `  ${c.var}: ${nums[c.var]}${c.unit};`),
      ...COLORS.map((c) => `  ${c.var}: ${colors[c.var]};`),
    ];
    return `.ce-confidence {\n${lines.join("\n")}\n}`;
  }, [nums, colors]);

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
    setColors(Object.fromEntries(COLORS.map((c) => [c.var, c.default])));
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
            {COLORS.map((c) => (
              <label className="cs-row" key={c.var}>
                <span>{c.label}</span>
                <input
                  onChange={(e) =>
                    setColors((prev) => ({ ...prev, [c.var]: e.target.value }))
                  }
                  type="color"
                  value={colors[c.var]}
                />
              </label>
            ))}
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
