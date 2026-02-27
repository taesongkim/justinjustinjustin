"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import notificationsRaw from "./data/notifications.json";

// ─── Types ────────────────────────────────────────────────────

interface Notification {
  id: string;
  category: string;
  message: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────

const notifications: Notification[] = notificationsRaw as Notification[];

const CATEGORY_COLORS: Record<string, string> = {
  update:           "#60a5fa",
  "skill acquired": "#34d399",
  note:             "#888888",
  learned:          "#a78bfa",
  published:        "#fb923c",
};

const PROJECTS = [
  { label: "Nested Tasks",      href: "/projects/nested-tasks" },
  { label: "CE Lineage Visual", href: "/projects/ce-lineage-visual" },
];

// ─── Time Formatting ──────────────────────────────────────────

function formatTime(timestamp: string): string {
  const now  = new Date();
  const date = new Date(timestamp);
  const diffMs   = now.getTime() - date.getTime();
  const diffSec  = Math.floor(diffMs / 1000);
  const diffMin  = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay  = Math.floor(diffHour / 24);

  if (diffSec  < 60) return "just now";
  if (diffMin  < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay  < 7) {
    const day  = date.toLocaleDateString("en-US", { weekday: "short" });
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${day} ${time}`;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ─── Projects Dropdown ────────────────────────────────────────

function ProjectsDropdown() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none",
          border:     "none",
          cursor:     "pointer",
          display:    "flex",
          alignItems: "center",
          gap:        5,
          color:      "#4a4a4a",
          fontSize:   13,
          padding:    "4px 0",
          transition: "color 0.15s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#888888")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#4a4a4a")}
      >
        <span>Projects</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 4px)",
          right:        0,
          background:   "#111111",
          border:       "1px solid #222222",
          borderRadius: 8,
          padding:      4,
          minWidth:     160,
          zIndex:       50,
        }}>
          {PROJECTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              onClick={() => setOpen(false)}
              style={{
                display:        "block",
                padding:        "7px 10px",
                borderRadius:   5,
                fontSize:       13,
                color:          "#555555",
                textDecoration: "none",
                transition:     "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1a1a1a";
                e.currentTarget.style.color      = "#e0e0e0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color      = "#555555";
              }}
            >
              {p.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────

function NotificationCard({ notification, index }: { notification: Notification; index: number }) {
  const color = CATEGORY_COLORS[notification.category] ?? "#888888";
  const [timeStr, setTimeStr] = useState(() => formatTime(notification.timestamp));

  useEffect(() => {
    const id = setInterval(() => setTimeStr(formatTime(notification.timestamp)), 30_000);
    return () => clearInterval(id);
  }, [notification.timestamp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      style={{
        background:           "rgba(255, 255, 255, 0.04)",
        backdropFilter:       "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border:               "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius:         6,
        padding:              "11px 14px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{
            fontSize:      11,
            fontWeight:    500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color,
          }}>
            {notification.category}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#555555", flexShrink: 0, marginLeft: 12 }}>
          {timeStr}
        </span>
      </div>

      {/* Message */}
      <p style={{ fontSize: 13, color: "#999999", lineHeight: 1.6, margin: 0 }}>
        {notification.message}
      </p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function Home() {
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="home-root">
      {/* Overlay video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position:       "fixed",
          inset:          0,
          width:          "100%",
          height:         "100%",
          objectFit:      "cover",
          mixBlendMode:   "screen",
          pointerEvents:  "none",
          zIndex:         10,
          opacity:        0.8,
        }}
      >
        <source src="/overlay.webm" type="video/webm" />
      </video>

      {/* Top bar */}
      <div style={{
        display:        "flex",
        justifyContent: "flex-end",
        padding:        "22px 32px",
        flexShrink:     0,
      }}>
        <ProjectsDropdown />
      </div>

      {/* Main content */}
      <div className="home-content">

        {/* Left: welcome text, vertically centered */}
        <div className="home-welcome">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              fontSize:      28,
              fontWeight:    600,
              letterSpacing: "-0.02em",
              color:         "#e0e0e0",
              lineHeight:    1.2,
            }}
          >
            Hi, welcome to<br />my nerd lab.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            style={{
              fontSize:   16,
              color:      "#888",
              marginTop:  12,
              lineHeight: 1.6,
            }}
          >
            Cooking up some fun stuff,<br />so check back soon.<br /><span style={{ display: "block", textAlign: "right" }}>♡J</span>
          </motion.p>
        </div>

        {/* Right: notification feed */}
        <div className="home-feed">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              fontSize:      11,
              color:         "#2e2e2e",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display:       "block",
              marginBottom:  10,
            }}
          >
            Updates
          </motion.span>

          <div className="home-feed-inner">
            {sorted.length === 0 ? (
              <p style={{ fontSize: 13, color: "#333333", padding: "8px 0" }}>Nothing yet.</p>
            ) : (
              sorted.map((n, i) => (
                <NotificationCard key={n.id} notification={n} index={i} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
