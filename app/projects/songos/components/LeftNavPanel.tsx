"use client";

import { motion } from "framer-motion";
import { AppName } from "../lib/types";

interface LeftNavPanelProps {
  expanded: boolean;
  activeApp: AppName;
  onToggleExpanded: () => void;
  onAppChange: (app: AppName) => void;
}

const NAV_ITEMS: { app: AppName; label: string; icon: React.ReactNode }[] = [
  {
    app: "tasks",
    label: "Tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="12" height="12" rx="2" />
        <path d="M6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    app: "events",
    label: "Events",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6" />
        <path d="M9 6v3l2 2" />
      </svg>
    ),
  },
  {
    app: "visions",
    label: "Visions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3C5 3 2 9 2 9s3 6 7 6 7-6 7-6-3-6-7-6Z" />
        <circle cx="9" cy="9" r="2.5" />
      </svg>
    ),
  },
];

export default function LeftNavPanel({
  expanded,
  activeApp,
  onToggleExpanded,
  onAppChange,
}: LeftNavPanelProps) {
  return (
    <nav
      style={{
        width: expanded ? 180 : 48,
        minWidth: expanded ? 180 : 48,
        height: "100vh",
        background: "#050505",
        borderRight: "1px solid var(--nt-border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        outline: "2px dashed #9370db", // DEBUG: left nav panel (purple)
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleExpanded}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "14px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--nt-text-muted)",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nt-text-secondary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nt-text-muted)")}
        title={expanded ? "Collapse" : "Expand"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path d="M4 2l6 6-6 6" />
        </svg>
      </button>

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 6px" }}>
        {NAV_ITEMS.map(({ app, label, icon }) => {
          const isActive = activeApp === app;
          return (
            <button
              key={app}
              onClick={() => onAppChange(app)}
              style={{
                background: isActive ? "var(--nt-bg)" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                color: isActive ? "var(--nt-accent)" : "var(--nt-text-muted)",
                transition: "background 0.15s, color 0.15s",
                width: "100%",
                textAlign: "left",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--nt-bg)";
                  e.currentTarget.style.color = "var(--nt-text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--nt-text-muted)";
                }
              }}
            >
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                {icon}
              </span>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                >
                  {label}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
