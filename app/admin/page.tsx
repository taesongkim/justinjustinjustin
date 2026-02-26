"use client";

import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  "update",
  "skill acquired",
  "learned",
  "note",
  "published",
] as const;

type Notification = {
  id: string;
  category: string;
  message: string;
  timestamp: string;
};

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── Styles ────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0a",
  display: "flex",
  justifyContent: "center",
  padding: "60px 24px",
  fontFamily: "inherit",
};

const layout: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  display: "flex",
  flexDirection: "column",
  gap: 40,
};

const sectionHeading: React.CSSProperties = {
  color: "#555",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  marginBottom: 12,
};

const fieldLabel: React.CSSProperties = {
  color: "#555",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: 4,
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const input: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 6,
  color: "#e5e5e5",
  padding: "9px 12px",
  fontSize: 14,
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 6,
  color: "#e5e5e5",
  padding: "9px 16px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const errorText: React.CSSProperties = { color: "#f87171", fontSize: 13 };
const successText: React.CSSProperties = { color: "#34d399", fontSize: 13 };

const CATEGORY_COLORS: Record<string, string> = {
  update: "#60a5fa",
  "skill acquired": "#34d399",
  note: "#888888",
  learned: "#a78bfa",
  published: "#fb923c",
};

// ─── Login gate ─────────────────────────────────────────────────────────────

function LoginGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, verify: true }),
      });
      if (res.ok) {
        onAuth(password);
      } else {
        const data = await res.json();
        setError(data.error || "Incorrect password.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <form onSubmit={handleSubmit} style={{ width: 400, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={sectionHeading}>admin</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoFocus
          style={input}
        />
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" style={btn} disabled={loading}>
          {loading ? "checking..." : "enter"}
        </button>
      </form>
    </div>
  );
}

// ─── Admin panel ─────────────────────────────────────────────────────────────

function AdminPanel({ password }: { password: string }) {
  const [category, setCategory] = useState<string>("update");
  const [message, setMessage] = useState("");
  const [timestamp, setTimestamp] = useState(toDatetimeLocal(new Date()));
  const [postStatus, setPostStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [postMsg, setPostMsg] = useState("");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {
      // silent
    }
  }, [password]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPostStatus("loading");
    setPostMsg("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, category, message, timestamp }),
      });
      const data = await res.json();
      if (res.ok) {
        setPostStatus("success");
        setPostMsg(`Posted — id ${data.entry.id}`);
        setMessage("");
        setTimestamp(toDatetimeLocal(new Date()));
        fetchNotifications();
      } else {
        setPostStatus("error");
        setPostMsg(data.error || "Something went wrong.");
      }
    } catch {
      setPostStatus("error");
      setPostMsg("Network error.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={page}>
      <div style={layout}>

        {/* ── Post form ── */}
        <div>
          <p style={sectionHeading}>new update</p>
          <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={fieldWrap}>
              <label style={fieldLabel}>category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="What happened?"
                required
                style={{ ...input, resize: "vertical" }}
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>timestamp</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                  style={{ ...input, flex: 1 }}
                />
                <button
                  type="button"
                  style={{ ...btn, padding: "9px 13px", fontSize: 12, color: "#888", whiteSpace: "nowrap" }}
                  onClick={() => setTimestamp(toDatetimeLocal(new Date()))}
                >
                  now
                </button>
              </div>
            </div>

            <button type="submit" style={{ ...btn, marginTop: 4 }} disabled={postStatus === "loading"}>
              {postStatus === "loading" ? "posting..." : "post"}
            </button>
            {postStatus === "success" && <p style={successText}>{postMsg}</p>}
            {postStatus === "error" && <p style={errorText}>{postMsg}</p>}
          </form>
        </div>

        {/* ── Existing notifications ── */}
        <div>
          <p style={sectionHeading}>existing — {notifications.length}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                }}
              >
                {/* dot */}
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: CATEGORY_COLORS[n.category] ?? "#888",
                }} />

                {/* text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: CATEGORY_COLORS[n.category] ?? "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {n.category}
                    </span>
                    <span style={{ fontSize: 11, color: "#444" }}>{formatTimestamp(n.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#aaa", margin: 0, lineHeight: 1.45 }}>{n.message}</p>
                </div>

                {/* delete */}
                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={deletingId === n.id}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#444",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "2px 4px",
                    flexShrink: 0,
                    fontFamily: "inherit",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
                  title="Delete"
                >
                  {deletingId === n.id ? "…" : "×"}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  if (!password) return <LoginGate onAuth={setPassword} />;
  return <AdminPanel password={password} />;
}
