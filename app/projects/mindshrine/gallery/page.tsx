"use client";

import { useState } from "react";
import ShrineButton from "../components/ShrineButton";

// ─────────────────────────────────────────
// Exact styles extracted from MindShrine components
// ─────────────────────────────────────────

// Color tokens used across the app
const COLORS = {
  actionColor: "rgba(255, 170, 68, 0.7)",
  actionGlow: "rgba(255, 170, 68, 0.3)",
  actionBg: "rgba(255, 170, 68, 0.06)",
  actionBorder: "rgba(255, 170, 68, 0.3)",
  actionText: "rgba(255, 190, 100, 0.9)",
  actionAccent: "rgba(255, 170, 68, 0.3)",
  actionBorderSolid: "rgba(255, 170, 68, 0.2)",

  syncColor: "rgba(100, 180, 255, 0.7)",
  syncGlow: "rgba(100, 180, 255, 0.3)",
  syncBg: "rgba(100, 180, 255, 0.06)",
  syncBorder: "rgba(100, 180, 255, 0.3)",
  syncText: "rgba(130, 200, 255, 0.9)",
  syncAccent: "rgba(68, 170, 255, 0.3)",
  syncBorderSolid: "rgba(68, 170, 255, 0.2)",

  purple: "rgba(160, 140, 255, 0.4)",
  purpleLight: "rgba(200, 180, 255, 0.9)",
  purpleBorder: "rgba(160, 140, 255, 0.1)",
  purpleBg: "rgba(160, 140, 255, 0.15)",

  cardBg: "rgba(12, 10, 25, 0.95)",
  inputBg: "rgba(255, 255, 255, 0.04)",
  inputBorder: "rgba(255, 255, 255, 0.06)",
  btnGhostBg: "rgba(255, 255, 255, 0.03)",
  btnGhostBorder: "rgba(255, 255, 255, 0.05)",
};

// ─────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────
function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <h2
        className="text-xs uppercase tracking-[0.2em] mb-6 pb-2"
        style={{ color: "rgba(160, 140, 255, 0.5)", borderBottom: "1px solid rgba(160, 140, 255, 0.08)" }}
      >
        {title}
      </h2>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

function Specimen({ label, source, children }: { label: string; source: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-medium" style={{ color: "rgba(255, 255, 255, 0.6)" }}>{label}</span>
        <span className="text-[9px]" style={{ color: "rgba(160, 140, 255, 0.3)" }}>{source}</span>
      </div>
      <div className="p-5 rounded-xl" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Gallery page
// ─────────────────────────────────────────
export default function GalleryPage() {
  const [sampleText, setSampleText] = useState("Sample note text");
  const [sampleDate, setSampleDate] = useState("2026-02-20T12:00");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sections = [
    { id: "primary-buttons", label: "ShrineButton" },
    { id: "nav-buttons", label: "Navigation Buttons" },
    { id: "action-sync-buttons", label: "Action / Sync Buttons" },
    { id: "toggle-buttons", label: "Toggle Buttons" },
    { id: "icon-buttons", label: "Icon Buttons" },
    { id: "delete-buttons", label: "Delete Buttons" },
    { id: "inputs", label: "Text Inputs" },
    { id: "textareas", label: "Textareas" },
    { id: "datetime", label: "DateTime Inputs" },
    { id: "labels", label: "Labels & Headings" },
    { id: "modals", label: "Modal Cards" },
    { id: "tags", label: "Tags & Orbs" },
    { id: "badges", label: "Badges" },
  ];

  return (
    <div className="min-h-screen p-8 pb-32" style={{ background: "#000" }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <h1
          className="text-lg font-semibold tracking-widest uppercase mb-2"
          style={{ color: "rgba(255, 255, 255, 0.2)" }}
        >
          MindShrine UI Gallery
        </h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
          Every button, input, form element, and sub-component currently in the app.
        </p>

        {/* TOC */}
        <div className="flex flex-wrap gap-2 mb-12">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 rounded-md text-[10px] tracking-wide uppercase transition-all duration-150 hover:brightness-125"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.35)",
              }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">

        {/* ═══════════════════════════════════════ */}
        {/* PRIMARY BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="ShrineButton Component" id="primary-buttons">
          <Specimen label="ShrineButton — 5 color variants with color-matched hover glow" source="components/ShrineButton.tsx">
            <div className="flex flex-wrap gap-3 items-center">
              <ShrineButton variant="purple">Create Vision</ShrineButton>
              <ShrineButton variant="purple">Send Magic Link</ShrineButton>
              <ShrineButton variant="purple">+ New Vision</ShrineButton>
              <ShrineButton variant="purple">Save</ShrineButton>
              <ShrineButton variant="orange">Log Entry</ShrineButton>
              <ShrineButton variant="orange">Save</ShrineButton>
              <ShrineButton variant="blue">Log Entry</ShrineButton>
              <ShrineButton variant="blue">Save</ShrineButton>
              <ShrineButton variant="gray">Cancel</ShrineButton>
              <ShrineButton variant="gray">Logout</ShrineButton>
              <ShrineButton variant="gray">← Back</ShrineButton>
              <ShrineButton variant="gray">Try a different email</ShrineButton>
              <ShrineButton variant="red">Delete</ShrineButton>
              <ShrineButton variant="red">Confirm Delete</ShrineButton>
            </div>
          </Specimen>

          <Specimen label="Disabled state" source="components/ShrineButton.tsx">
            <div className="flex flex-wrap gap-3 items-center">
              <ShrineButton variant="purple" disabled>Disabled Purple</ShrineButton>
              <ShrineButton variant="orange" disabled>Disabled Orange</ShrineButton>
              <ShrineButton variant="blue" disabled>Disabled Blue</ShrineButton>
              <ShrineButton variant="gray" disabled>Disabled Gray</ShrineButton>
              <ShrineButton variant="red" disabled>Disabled Red</ShrineButton>
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* NAV BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Navigation Buttons" id="nav-buttons">
          <Specimen label="Arrow (Vision carousel)" source="ShrineScreen.tsx">
            <div className="flex gap-4 items-center">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </Specimen>

          <Specimen label="Carousel dots" source="ShrineScreen.tsx">
            <div className="flex gap-2 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: 6,
                    height: 6,
                    background: i === 0 ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.1)",
                  }}
                />
              ))}
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* ACTION / SYNC BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Action / Synchronicity Popup Buttons" id="action-sync-buttons">
          <Specimen label="Thread popup — now uses ShrineButton" source="ShrineScreen.tsx → ThreadPopup">
            <div className="flex gap-2">
              <ShrineButton variant="orange">Action</ShrineButton>
              <ShrineButton variant="blue">Synchronicity</ShrineButton>
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* TOGGLE BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Toggle Buttons" id="toggle-buttons">
          <Specimen label="Tag mode toggle" source="ShrineScreen.tsx">
            <div className="flex gap-1">
              {(["classic", "ticket", "orb"] as const).map((mode, i) => (
                <button
                  key={mode}
                  className="px-3 py-1.5 rounded-md text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200"
                  style={{
                    background: i === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                    color: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </Specimen>

          <Specimen label="Particle mode toggle" source="ShrineScreen.tsx → ParticlePanel">
            <div className="flex flex-wrap gap-1">
              {["Off", "Stardust", "Embers", "Fireflies", "Aurora", "Snow"].map((m, i) => (
                <button
                  key={m}
                  className="px-2 py-1 rounded-md text-[10px] cursor-pointer transition-all duration-150"
                  style={{
                    background: i === 1 ? "rgba(160, 140, 255, 0.15)" : "transparent",
                    color: i === 1 ? "rgba(200, 180, 255, 0.9)" : "rgba(255, 255, 255, 0.3)",
                    border: i === 1 ? "1px solid rgba(160, 140, 255, 0.2)" : "1px solid transparent",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </Specimen>

          <Specimen label="Thread width steps" source="ShrineScreen.tsx → ThreadWidthPanel">
            <div className="flex gap-1">
              {[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5].map((v) => (
                <button
                  key={v}
                  className="flex-1 py-0.5 rounded text-[8px] tabular-nums cursor-pointer transition-all duration-150"
                  style={{
                    background: v === 0.5 ? "rgba(160, 140, 255, 0.2)" : "transparent",
                    color: v === 0.5 ? "rgba(200, 180, 255, 0.9)" : "rgba(255, 255, 255, 0.25)",
                    border: v === 0.5 ? "1px solid rgba(160, 140, 255, 0.25)" : "1px solid transparent",
                    minWidth: 32,
                    textAlign: "center",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* ICON BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Icon Buttons" id="icon-buttons">
          <Specimen label="Add entry (+)" source="ShrineScreen.tsx">
            <button
              className="relative flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-all duration-200 hover:scale-110"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 0 12px rgba(255,255,255,0.04)",
              }}
            >
              <span className="text-sm font-light leading-none" style={{ color: "rgba(255,255,255,0.35)" }}>+</span>
            </button>
          </Specimen>

          <Specimen label="Edit vision (pencil)" source="ShrineScreen.tsx">
            <button
              className="shrink-0 cursor-pointer"
              style={{ background: "none", border: "none", padding: 4, opacity: 0.5 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(200, 180, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
              </svg>
            </button>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* DELETE BUTTONS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Delete Buttons" id="delete-buttons">
          <Specimen label="Delete (two-step) — now uses ShrineButton red variant" source="ShrineScreen.tsx → EntryDetailModal">
            <div className="flex gap-3">
              {!confirmDelete ? (
                <ShrineButton variant="red" onClick={() => setConfirmDelete(true)}>
                  Delete
                </ShrineButton>
              ) : (
                <ShrineButton variant="red" onClick={() => setConfirmDelete(false)}>
                  Confirm Delete
                </ShrineButton>
              )}
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* TEXT INPUTS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Text Inputs" id="inputs">
          <Specimen label="Email input (Login)" source="LoginScreen.tsx">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full text-sm outline-none focus:ring-1 focus:ring-purple-500/40 transition-all duration-200"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: 360,
              }}
            />
          </Specimen>

          <Specimen label="Title input (NewVisionModal)" source="NewVisionModal.tsx">
            <input
              type="text"
              placeholder="What's your vision?"
              className="w-full text-sm outline-none focus:ring-1 focus:ring-purple-500/40 transition-all duration-200"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: 360,
              }}
            />
          </Specimen>

          <Specimen label="Edit title input (Vision Edit Overlay)" source="ShrineScreen.tsx">
            <input
              type="text"
              defaultValue="My Vision Title"
              className="w-full text-center text-xl bg-transparent outline-none"
              style={{
                fontFamily: "var(--font-crimson-pro), serif",
                fontWeight: 200,
                padding: "8px 12px",
                borderRadius: 4,
                color: "rgba(255, 255, 255, 0.85)",
                borderBottom: "1px solid rgba(160, 140, 255, 0.2)",
                caretColor: "rgba(160, 140, 255, 0.6)",
                maxWidth: 400,
              }}
            />
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* TEXTAREAS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Textareas" id="textareas">
          <Specimen label="Note textarea (LogEntryModal / EntryDetailModal)" source="ShrineScreen.tsx">
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="w-full text-sm outline-none resize-none"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: 360,
              }}
            />
          </Specimen>

          <Specimen label="Description textarea (NewVisionModal)" source="NewVisionModal.tsx">
            <textarea
              placeholder="Describe this vision..."
              rows={3}
              className="w-full text-sm outline-none resize-none focus:ring-1 focus:ring-purple-500/40 transition-all duration-200"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: 360,
              }}
            />
          </Specimen>

          <Specimen label="Edit description (Vision Edit Overlay)" source="ShrineScreen.tsx">
            <textarea
              defaultValue="A clear intention for growth..."
              rows={2}
              className="w-full text-center text-sm bg-transparent outline-none resize-none"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                color: "rgba(255, 255, 255, 0.5)",
                borderBottom: "1px solid rgba(160, 140, 255, 0.1)",
                caretColor: "rgba(160, 140, 255, 0.6)",
                lineHeight: 1.6,
                maxWidth: 400,
              }}
            />
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* DATETIME */}
        {/* ═══════════════════════════════════════ */}
        <Section title="DateTime Inputs" id="datetime">
          <Specimen label="datetime-local (LogEntryModal / EntryDetailModal)" source="ShrineScreen.tsx">
            <input
              type="datetime-local"
              value={sampleDate}
              onChange={(e) => setSampleDate(e.target.value)}
              className="text-sm outline-none"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                color: "rgba(255, 255, 255, 0.8)",
                colorScheme: "dark",
                maxWidth: 360,
              }}
            />
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* LABELS & HEADINGS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Labels & Headings" id="labels">
          <Specimen label="App title" source="ShrineScreen.tsx">
            <h1 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "rgba(255, 255, 255, 0.2)" }}>
              MindShrine
            </h1>
          </Specimen>

          <Specimen label="Login title (gradient)" source="LoginScreen.tsx">
            <h1
              className="text-2xl font-semibold tracking-wider"
              style={{
                background: "linear-gradient(135deg, #c4b5fd, #818cf8, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MindShrine
            </h1>
          </Specimen>

          <Specimen label="Modal title (gradient)" source="NewVisionModal.tsx">
            <h2
              className="text-lg font-semibold"
              style={{
                background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              New Vision
            </h2>
          </Specimen>

          <Specimen label="Modal title — Action variant" source="ShrineScreen.tsx">
            <h3 className="text-base font-semibold" style={{ color: COLORS.actionText }}>Log Action</h3>
          </Specimen>

          <Specimen label="Modal title — Sync variant" source="ShrineScreen.tsx">
            <h3 className="text-base font-semibold" style={{ color: COLORS.syncText }}>Log Synchronicity</h3>
          </Specimen>

          <Specimen label="Vision title (serif)" source="ShrineScreen.tsx">
            <h2
              className="text-2xl select-none leading-tight"
              style={{
                fontFamily: "var(--font-crimson-pro), serif",
                fontWeight: 200,
                color: "rgba(255, 255, 255, 0.85)",
                textShadow: "0 0 20px hsla(270, 50%, 50%, 0.2)",
              }}
            >
              My Manifested Vision
            </h2>
          </Specimen>

          <Specimen label="Field label" source="NewVisionModal / LogEntryModal">
            <label className="text-xs tracking-wide" style={{ color: "rgba(255, 255, 255, 0.4)" }}>Title</label>
          </Specimen>

          <Specimen label="When label" source="LogEntryModal">
            <label className="text-xs" style={{ color: "rgba(255, 255, 255, 0.3)" }}>When</label>
          </Specimen>

          <Specimen label="Panel heading" source="ShrineScreen.tsx → ParticlePanel">
            <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(160, 140, 255, 0.4)" }}>Particles</span>
          </Specimen>

          <Specimen label="Today label (thread)" source="ShrineScreen.tsx → TodayDisc">
            <span className="text-[11px]" style={{ color: "rgba(160, 140, 255, 0.5)", letterSpacing: "0.05em" }}>Today</span>
          </Specimen>

          <Specimen label="Notch label — month" source="ShrineScreen.tsx → ThreadNotches">
            <span className="text-[14px] select-none" style={{ color: "rgba(160, 140, 255, 0.35)" }}>Feb 2026</span>
          </Specimen>

          <Specimen label="Notch label — day" source="ShrineScreen.tsx → ThreadNotches">
            <span className="text-[11px] select-none" style={{ color: "rgba(160, 140, 255, 0.35)" }}>15</span>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* MODAL CARDS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Modal Cards" id="modals">
          <Specimen label="Purple accent card (NewVisionModal)" source="NewVisionModal.tsx">
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: "rgba(12, 10, 25, 0.95)",
                border: "1px solid rgba(120, 80, 255, 0.15)",
                boxShadow: "0 0 80px rgba(100, 60, 255, 0.1)",
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Modal content goes here</p>
            </div>
          </Specimen>

          <Specimen label="Action accent card (LogEntryModal)" source="ShrineScreen.tsx">
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: "rgba(12, 10, 25, 0.95)",
                border: `1px solid ${COLORS.actionBorderSolid}`,
                boxShadow: `0 0 60px ${COLORS.actionAccent}`,
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Action modal content</p>
            </div>
          </Specimen>

          <Specimen label="Sync accent card (LogEntryModal)" source="ShrineScreen.tsx">
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: "rgba(12, 10, 25, 0.95)",
                border: `1px solid ${COLORS.syncBorderSolid}`,
                boxShadow: `0 0 60px ${COLORS.syncAccent}`,
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Sync modal content</p>
            </div>
          </Specimen>

          <Specimen label="Login card" source="LoginScreen.tsx">
            <div
              className="w-full max-w-md rounded-2xl p-8"
              style={{
                background: "rgba(10, 10, 20, 0.8)",
                border: "1px solid rgba(120, 80, 255, 0.15)",
                boxShadow: "0 0 60px rgba(100, 60, 255, 0.08), inset 0 0 60px rgba(100, 60, 255, 0.03)",
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Login card content</p>
            </div>
          </Specimen>

          <Specimen label="Control panel" source="ShrineScreen.tsx → ParticlePanel">
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(12, 10, 25, 0.9)",
                border: "1px solid rgba(160, 140, 255, 0.1)",
                backdropFilter: "blur(12px)",
                width: 200,
              }}
            >
              <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(160, 140, 255, 0.4)" }}>Panel Content</span>
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* TAGS & ORBS */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Tags & Orbs" id="tags">
          <Specimen label="Classic tag — Action" source="ShrineScreen.tsx → ClassicTag">
            <div
              style={{
                width: 220,
                padding: "8px 11px",
                borderRadius: 4,
                backdropFilter: "blur(1px)",
                background: COLORS.actionBg,
                border: `0.5px solid ${COLORS.actionBorder}`,
                boxShadow: `0 0 6px ${COLORS.actionGlow}`,
              }}
            >
              <p className="text-xs leading-snug text-right" style={{ color: COLORS.actionText }}>
                Wrote my intentions for the week
              </p>
            </div>
          </Specimen>

          <Specimen label="Classic tag — Sync" source="ShrineScreen.tsx → ClassicTag">
            <div
              style={{
                width: 220,
                padding: "8px 11px",
                borderRadius: 4,
                backdropFilter: "blur(1px)",
                background: COLORS.syncBg,
                border: `0.5px solid ${COLORS.syncBorder}`,
                boxShadow: `0 0 6px ${COLORS.syncGlow}`,
              }}
            >
              <p className="text-xs leading-snug" style={{ color: COLORS.syncText }}>
                Ran into an old friend at the exact right moment
              </p>
            </div>
          </Specimen>

          <Specimen label="Ticket tag — Action" source="ShrineScreen.tsx → TicketTag">
            <div className="flex gap-6 items-start">
              <div
                style={{
                  width: 16,
                  height: 36,
                  borderRadius: 1,
                  backdropFilter: "blur(1px)",
                  background: COLORS.actionBg,
                  border: `0.5px solid ${COLORS.actionBorder}`,
                  boxShadow: `0 0 6px ${COLORS.actionGlow}`,
                }}
              />
              <div
                style={{
                  width: 16,
                  height: 36,
                  borderRadius: 1,
                  backdropFilter: "blur(1px)",
                  background: COLORS.syncBg,
                  border: `0.5px solid ${COLORS.syncBorder}`,
                  boxShadow: `0 0 6px ${COLORS.syncGlow}`,
                }}
              />
            </div>
          </Specimen>

          <Specimen label="Segment orb" source="ShrineScreen.tsx → SegmentOrb">
            <div className="flex gap-6 items-center">
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: `radial-gradient(circle at center, rgba(255,255,255,1) 0%, ${COLORS.actionColor} 40%, ${COLORS.actionColor} 100%)`,
                  boxShadow: `0 0 6px ${COLORS.actionColor}, 0 0 14px ${COLORS.actionGlow}, 0 0 24px ${COLORS.actionGlow}`,
                }}
              />
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: `radial-gradient(circle at center, rgba(255,255,255,1) 0%, ${COLORS.syncColor} 40%, ${COLORS.syncColor} 100%)`,
                  boxShadow: `0 0 6px ${COLORS.syncColor}, 0 0 14px ${COLORS.syncGlow}, 0 0 24px ${COLORS.syncGlow}`,
                }}
              />
            </div>
          </Specimen>

          <Specimen label="Orbiting orb" source="ShrineScreen.tsx → OrbTag">
            <div className="flex gap-6 items-center">
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, ${COLORS.actionColor} 40%, ${COLORS.actionGlow} 100%)`,
                  boxShadow: `0 0 8px ${COLORS.actionColor}, 0 0 16px ${COLORS.actionGlow}, 0 0 28px ${COLORS.actionGlow}`,
                }}
              />
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, ${COLORS.syncColor} 40%, ${COLORS.syncGlow} 100%)`,
                  boxShadow: `0 0 8px ${COLORS.syncColor}, 0 0 16px ${COLORS.syncGlow}, 0 0 28px ${COLORS.syncGlow}`,
                }}
              />
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* BADGES */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Badges" id="badges">
          <Specimen label="Fulfilled badge" source="ShrineScreen.tsx">
            <span
              className="px-3 py-2 rounded-full text-xs font-medium"
              style={{
                background: "hsla(270, 60%, 30%, 0.3)",
                color: "hsla(270, 70%, 70%, 0.8)",
                border: "1px solid hsla(270, 60%, 40%, 0.2)",
              }}
            >
              Fulfilled
            </span>
          </Specimen>

          <Specimen label="Error message" source="LoginScreen.tsx / NewVisionModal.tsx">
            <p className="text-xs text-center" style={{ color: "rgba(220, 38, 38, 0.8)" }}>
              Something went wrong. Please try again.
            </p>
          </Specimen>

          <Specimen label="Success icon" source="LoginScreen.tsx">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 48, height: 48,
                  background: "rgba(139, 92, 246, 0.15)",
                  boxShadow: "0 0 30px rgba(139, 92, 246, 0.15)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(167, 139, 250, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Check your inbox</p>
            </div>
          </Specimen>
        </Section>

        {/* ═══════════════════════════════════════ */}
        {/* RANGE SLIDER */}
        {/* ═══════════════════════════════════════ */}
        <Section title="Range Sliders" id="sliders">
          <Specimen label="Config slider (ParticlePanel)" source="ShrineScreen.tsx">
            <div className="flex flex-col gap-1" style={{ maxWidth: 200 }}>
              <div className="flex justify-between items-center">
                <span className="text-[9px]" style={{ color: "rgba(160, 140, 255, 0.5)" }}>Size</span>
                <span className="text-[9px] tabular-nums" style={{ color: "rgba(200, 180, 255, 0.7)" }}>0.50</span>
              </div>
              <input
                type="range" min="0.1" max="2" step="0.1" defaultValue="0.5"
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: "linear-gradient(to right, rgba(160, 140, 255, 0.4) 25%, rgba(255, 255, 255, 0.06) 25%)",
                  accentColor: "rgba(160, 140, 255, 0.8)",
                }}
              />
            </div>
          </Specimen>
        </Section>

      </div>
    </div>
  );
}
