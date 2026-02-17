import { useState, useCallback } from "react";

// ─── Sparkle Animation Variations ──────────────────────────────────

function StarBurst({ trigger }) {
  if (!trigger) return null;
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const rad = (angle * Math.PI) / 180;
    const dist = 18 + Math.random() * 8;
    return { id: i, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, size: 3 + Math.random() * 3, delay: Math.random() * 0.05 };
  });
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", width: p.size, height: p.size, borderRadius: "50%",
          background: "#f5c542",
          left: 0, top: 0,
          animation: `starBurst 0.5s ${p.delay}s ease-out forwards`,
          "--tx": `${p.x}px`, "--ty": `${p.y}px`,
        }} />
      ))}
    </div>
  );
}

function SparkleRing({ trigger }) {
  if (!trigger) return null;
  const sparks = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * 360 + Math.random() * 20;
    const rad = (angle * Math.PI) / 180;
    const dist = 14 + Math.random() * 6;
    return { id: i, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, delay: i * 0.03 };
  });
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      {sparks.map(s => (
        <svg key={s.id} width="8" height="8" viewBox="0 0 8 8" style={{
          position: "absolute", left: 0, top: 0,
          animation: `sparkleRing 0.55s ${s.delay}s ease-out forwards`,
          "--tx": `${s.x}px`, "--ty": `${s.y}px`,
        }}>
          <path d="M4 0L4.8 3.2L8 4L4.8 4.8L4 8L3.2 4.8L0 4L3.2 3.2Z" fill="#f5c542" />
        </svg>
      ))}
    </div>
  );
}

function ConfettiPop({ trigger }) {
  if (!trigger) return null;
  const colors = ["#f5c542", "#4ecdc4", "#ff6b6b", "#a78bfa", "#34d399"];
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360 + (Math.random() - 0.5) * 30;
    const rad = (angle * Math.PI) / 180;
    const dist = 16 + Math.random() * 14;
    return {
      id: i, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist,
      color: colors[i % colors.length], rot: Math.random() * 360,
      w: 2 + Math.random() * 3, h: 2 + Math.random() * 2,
      delay: Math.random() * 0.08
    };
  });
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", width: p.w, height: p.h, borderRadius: 1,
          background: p.color,
          left: 0, top: 0,
          transform: `rotate(${p.rot}deg)`,
          animation: `confettiPop 0.6s ${p.delay}s ease-out forwards`,
          "--tx": `${p.x}px`, "--ty": `${p.y}px`,
        }} />
      ))}
    </div>
  );
}

function GlowPulse({ trigger }) {
  if (!trigger) return null;
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,197,66,0.7) 0%, rgba(245,197,66,0) 70%)",
        animation: "glowPulse 0.5s ease-out forwards",
      }} />
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <div key={i} style={{
            position: "absolute", width: 2, height: 8, borderRadius: 1,
            background: "#f5c542", left: 0, top: 0,
            transformOrigin: "center",
            animation: `glowRay 0.45s ${i * 0.04}s ease-out forwards`,
            "--tx": `${Math.cos(rad) * 18}px`, "--ty": `${Math.sin(rad) * 18}px`,
            "--rot": `${angle + 90}deg`,
          }} />
        );
      })}
    </div>
  );
}

function RisingStars({ trigger }) {
  if (!trigger) return null;
  const stars = Array.from({ length: 5 }, (_, i) => ({
    id: i, x: -10 + Math.random() * 20, delay: i * 0.06, size: 4 + Math.random() * 4
  }));
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      {stars.map(s => (
        <svg key={s.id} width={s.size} height={s.size} viewBox="0 0 8 8" style={{
          position: "absolute", left: s.x, top: 0,
          animation: `risingStars 0.65s ${s.delay}s ease-out forwards`,
        }}>
          <path d="M4 0L4.8 3.2L8 4L4.8 4.8L4 8L3.2 4.8L0 4L3.2 3.2Z" fill="#f5c542" />
        </svg>
      ))}
    </div>
  );
}

function SpiralDust({ trigger }) {
  if (!trigger) return null;
  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 720;
    const rad = (angle * Math.PI) / 180;
    const dist = 6 + i * 2;
    return { id: i, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, delay: i * 0.03, size: 3 - i * 0.2 };
  });
  return (
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 10 }}>
      {dots.map(d => (
        <div key={d.id} style={{
          position: "absolute", width: Math.max(1.5, d.size), height: Math.max(1.5, d.size),
          borderRadius: "50%", background: "#f5c542",
          left: 0, top: 0,
          animation: `spiralDust 0.55s ${d.delay}s ease-out forwards`,
          "--tx": `${d.x}px`, "--ty": `${d.y}px`,
        }} />
      ))}
    </div>
  );
}

// ─── Checkbox Component ──────────────────────────────────────────────

function DemoCheckbox({ label, SparkleComponent }) {
  const [checked, setChecked] = useState(false);
  const [trigger, setTrigger] = useState(0);

  const handleClick = useCallback(() => {
    const next = !checked;
    setChecked(next);
    if (next) setTrigger(t => t + 1);
  }, [checked]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, position: "relative", cursor: "pointer", minHeight: 44 }} onClick={handleClick}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: checked ? "2px solid #333" : "2px solid #ccc",
        background: checked ? "#333" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {checked && (
          <svg viewBox="0 0 24 24" width={14} height={14} style={{ color: "#fff" }}>
            <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 15, color: checked ? "#999" : "#222",
        textDecoration: checked ? "line-through" : "none",
        transition: "all 0.15s", userSelect: "none",
      }}>{label}</span>
      <SparkleComponent key={trigger} trigger={trigger > 0 && checked} />
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

const animations = [
  { name: "Star Burst", desc: "8 golden dots burst outward in a circle", Component: StarBurst },
  { name: "Sparkle Ring", desc: "4-point star shapes radiate outward", Component: SparkleRing },
  { name: "Confetti Pop", desc: "Colorful confetti pieces scatter in all directions", Component: ConfettiPop },
  { name: "Glow Pulse", desc: "Soft golden glow with 4 directional rays", Component: GlowPulse },
  { name: "Rising Stars", desc: "Stars float upward and fade out", Component: RisingStars },
  { name: "Spiral Dust", desc: "Dots spiral outward in a golden trail", Component: SpiralDust },
];

export default function SparkleTestPanel() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: "#111" }}>Sparkle Animations</h2>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>Click each checkbox to preview. Uncheck and recheck to replay.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {animations.map(anim => (
          <div key={anim.name} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, overflow: "hidden" }}>
            <DemoCheckbox label={anim.name} SparkleComponent={anim.Component} />
            <div style={{ padding: "0 16px 10px", fontSize: 12, color: "#999" }}>{anim.desc}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes starBurst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes sparkleRing {
          0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        @keyframes confettiPop {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
        }
        @keyframes glowPulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes glowRay {
          0% { transform: translate(0, 0) rotate(var(--rot)) scaleY(0.5); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scaleY(1); opacity: 0; }
        }
        @keyframes risingStars {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-28px) scale(0.3); opacity: 0; }
        }
        @keyframes spiralDust {
          0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
