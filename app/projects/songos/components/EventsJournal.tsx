"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AppEvent,
  Vision,
  EventCategory,
  EVENT_CATEGORY_COLORS,
  ALL_EVENT_CATEGORIES,
  createAppEvent,
  getLocalTimezone,
  generateId,
} from "../lib/types";

// ─── Time Formatting ─────────────────────────────────────────

function tzAbbrev(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

function formatEventTime(timestamp: number, timezone?: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const tz = timezone || getLocalTimezone();
  const abbr = tzAbbrev(tz);
  const localTz = getLocalTimezone();
  const showTz = tz !== localTz;
  const suffix = showTz ? ` ${abbr}` : "";

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) {
    const day = date.toLocaleDateString("en-US", { weekday: "short", timeZone: tz });
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
    return `${day} ${time}${suffix}`;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: tz,
      ...(sameYear ? {} : { year: "numeric" }),
    }) + suffix
  );
}

function toDatetimeLocal(ts: number, timezone?: string): string {
  const tz = timezone || getLocalTimezone();
  const d = new Date(ts);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function fromDatetimeLocal(val: string, timezone?: string): number {
  const tz = timezone || getLocalTimezone();
  const [datePart, timePart] = val.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const utcStr = probe.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = probe.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offsetMs = utcDate.getTime() - tzDate.getTime();

  return new Date(year, month - 1, day, hour, minute).getTime() + offsetMs;
}

// ─── Shared Styles ───────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--nt-bg)",
  border: "1px solid var(--nt-border)",
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: 13,
  color: "var(--nt-text-primary)",
  width: "100%",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--nt-text-muted)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
};

// ─── Event Card ──────────────────────────────────────────────

function EventCard({
  event,
  isSelected,
  onClick,
  index,
}: {
  event: AppEvent;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const color = EVENT_CATEGORY_COLORS[event.category];
  const tz = event.timezone || getLocalTimezone();
  const [timeStr, setTimeStr] = useState(() => formatEventTime(event.timestamp, tz));

  useEffect(() => {
    setTimeStr(formatEventTime(event.timestamp, tz));
    const id = setInterval(
      () => setTimeStr(formatEventTime(event.timestamp, tz)),
      30_000
    );
    return () => clearInterval(id);
  }, [event.timestamp, tz]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.03 }}
      onClick={onClick}
      style={{
        background: isSelected
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: isSelected
          ? `1px solid ${color}33`
          : "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: 6,
        padding: "11px 14px",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color,
            }}
          >
            {event.category}
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--nt-text-muted)",
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {timeStr}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: "var(--nt-text-secondary)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {event.description || "Untitled event"}
      </p>

      {/* Link */}
      {event.link && (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 11,
            color: "var(--nt-accent)",
            textDecoration: "none",
            marginTop: 4,
            display: "inline-block",
            opacity: 0.8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
        >
          {event.link.replace(/^https?:\/\//, "").slice(0, 40)}
          {event.link.replace(/^https?:\/\//, "").length > 40 ? "…" : ""}
        </a>
      )}
    </motion.div>
  );
}

// ─── Edit/Create Modal ───────────────────────────────────────

function EventEditModal({
  event,
  isNew,
  visions,
  onSave,
  onDelete,
  onCancel,
}: {
  event: AppEvent;
  isNew: boolean;
  visions: Vision[];
  onSave: (updated: AppEvent) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState(event.description);
  const [category, setCategory] = useState(event.category);
  const eventTz = event.timezone || getLocalTimezone();
  const [timezone] = useState(eventTz);
  const [timestamp, setTimestamp] = useState(
    toDatetimeLocal(event.timestamp, eventTz)
  );
  const [link, setLink] = useState(event.link || "");
  const [visionRef, setVisionRef] = useState(event.visionRef || "");
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.focus();
      if (isNew) descRef.current.select();
    }
  }, []);

  const handleSave = () => {
    onSave({
      ...event,
      description: desc,
      category,
      timezone,
      timestamp: fromDatetimeLocal(timestamp, timezone),
      link: link || undefined,
      visionRef: visionRef || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--nt-surface)",
          border: "1px solid var(--nt-border)",
          borderRadius: 10,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Title */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--nt-text-primary)",
          }}
        >
          {isNew ? "New Event" : "Edit Event"}
        </span>

        {/* Category */}
        <div>
          <span style={labelStyle}>Category</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ALL_EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  background:
                    category === cat
                      ? `${EVENT_CATEGORY_COLORS[cat]}22`
                      : "var(--nt-bg)",
                  border: `1px solid ${
                    category === cat
                      ? EVENT_CATEGORY_COLORS[cat]
                      : "var(--nt-border)"
                  }`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontSize: 11,
                  color:
                    category === cat
                      ? EVENT_CATEGORY_COLORS[cat]
                      : "var(--nt-text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: EVENT_CATEGORY_COLORS[cat],
                  }}
                />
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <span style={labelStyle}>Description</span>
          <textarea
            ref={descRef}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="What happened?"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>

        {/* Timestamp + Timezone */}
        <div>
          <span style={labelStyle}>When</span>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <span
              style={{
                fontSize: 11,
                color: "var(--nt-text-muted)",
                padding: "8px 0",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              title={timezone}
            >
              {tzAbbrev(timezone)}
            </span>
          </div>
        </div>

        {/* Link */}
        <div>
          <span style={labelStyle}>Link (optional)</span>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            style={inputStyle}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>

        {/* Vision reference */}
        {visions.length > 0 && (
          <div>
            <span style={labelStyle}>Vision (optional)</span>
            <select
              value={visionRef}
              onChange={(e) => setVisionRef(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">None</option>
              {visions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title || "Untitled vision"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <div>
            {!isNew && onDelete && (
              <button
                onClick={() => onDelete(event.id)}
                style={{
                  background: "none",
                  border: "1px solid #ef444433",
                  borderRadius: 4,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: "#ef4444",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ef444411")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                background: "none",
                border: "1px solid var(--nt-border)",
                borderRadius: 4,
                padding: "5px 14px",
                fontSize: 12,
                color: "var(--nt-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                background: "var(--nt-accent)",
                border: "none",
                borderRadius: 4,
                padding: "5px 14px",
                fontSize: 12,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              {isNew ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Notes Panel (right side) ────────────────────────────────

function NotesPanel({
  event,
  visions,
  onUpdate,
  onEditRequest,
}: {
  event: AppEvent;
  visions: Vision[];
  onUpdate: (updated: AppEvent) => void;
  onEditRequest: () => void;
}) {
  const [notes, setNotes] = useState(event.notes || "");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNotes(event.notes || "");
  }, [event.id, event.notes]);

  const autoSaveNotes = useCallback(
    (val: string) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onUpdate({ ...event, notes: val || undefined });
      }, 400);
    },
    [event, onUpdate]
  );

  const color = EVENT_CATEGORY_COLORS[event.category];
  const tz = event.timezone || getLocalTimezone();
  const linkedVision = event.visionRef
    ? visions.find((v) => v.id === event.visionRef)
    : null;

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Event summary header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color,
              }}
            >
              {event.category}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--nt-text-muted)",
                marginLeft: 6,
              }}
            >
              {formatEventTime(event.timestamp, tz)}
            </span>
          </div>
          <button
            onClick={onEditRequest}
            style={{
              background: "none",
              border: "1px solid var(--nt-border)",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              color: "var(--nt-text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--nt-accent)";
              e.currentTarget.style.color = "var(--nt-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--nt-border)";
              e.currentTarget.style.color = "var(--nt-text-muted)";
            }}
          >
            Edit
          </button>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "var(--nt-text-primary)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {event.description || "Untitled event"}
        </p>

        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: "var(--nt-accent)",
              textDecoration: "none",
              marginTop: 4,
              display: "inline-block",
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
          >
            {event.link.replace(/^https?:\/\//, "").slice(0, 60)}
            {event.link.replace(/^https?:\/\//, "").length > 60 ? "…" : ""}
          </a>
        )}

        {linkedVision && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--nt-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3C5 3 2 9 2 9s3 6 7 6 7-6 7-6-3-6-7-6Z" />
              <circle cx="9" cy="9" r="2.5" />
            </svg>
            {linkedVision.title}
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--nt-border)",
          marginBottom: 16,
          flexShrink: 0,
        }}
      />

      {/* Notes label */}
      <span
        style={{
          ...labelStyle,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        Notes
      </span>

      {/* Notes textarea */}
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          autoSaveNotes(e.target.value);
        }}
        style={{
          ...inputStyle,
          flex: 1,
          resize: "none",
          minHeight: 0,
          lineHeight: 1.7,
          padding: "10px 12px",
        }}
        placeholder="Write notes about this event..."
      />
    </motion.div>
  );
}

// ─── Events Journal (Main) ───────────────────────────────────

interface EventsJournalProps {
  events: AppEvent[];
  visions: Vision[];
  onEventsChange: (events: AppEvent[]) => void;
}

export default function EventsJournal({
  events,
  visions,
  onEventsChange,
}: EventsJournalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategories, setFilterCategories] = useState<Set<EventCategory>>(new Set());
  const [filterVisions, setFilterVisions] = useState<Set<string>>(new Set());
  // Modal state: { event, isNew } or null
  const [modal, setModal] = useState<{
    event: AppEvent;
    isNew: boolean;
  } | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedId) || null;

  // Determine which categories & visions are actually present in events
  const usedCategories = Array.from(
    new Set(events.map((e) => e.category))
  ).sort() as EventCategory[];
  const usedVisionIds = Array.from(
    new Set(events.map((e) => e.visionRef).filter(Boolean) as string[])
  );
  const usedVisions = visions.filter((v) => usedVisionIds.includes(v.id));

  // Apply filters
  const filtered = events.filter((e) => {
    if (filterCategories.size > 0 && !filterCategories.has(e.category)) return false;
    if (filterVisions.size > 0) {
      if (!e.visionRef || !filterVisions.has(e.visionRef)) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleVision = useCallback((id: string) => {
    setFilterVisions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasActiveFilters = filterCategories.size > 0 || filterVisions.size > 0;
  const clearFilters = useCallback(() => {
    setFilterCategories(new Set());
    setFilterVisions(new Set());
  }, []);

  const handleNewClick = useCallback(() => {
    const newEvent = createAppEvent("note", "");
    setModal({ event: newEvent, isNew: true });
  }, []);

  const handleModalSave = useCallback(
    (saved: AppEvent) => {
      if (modal?.isNew) {
        onEventsChange([saved, ...events]);
        setSelectedId(saved.id);
      } else {
        onEventsChange(events.map((e) => (e.id === saved.id ? saved : e)));
      }
      setModal(null);
    },
    [modal, events, onEventsChange]
  );

  const handleModalDelete = useCallback(
    (id: string) => {
      onEventsChange(events.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
      setModal(null);
    },
    [events, onEventsChange, selectedId]
  );

  const handleUpdate = useCallback(
    (updated: AppEvent) => {
      onEventsChange(events.map((e) => (e.id === updated.id ? updated : e)));
    },
    [events, onEventsChange]
  );

  const handleEditRequest = useCallback(() => {
    if (selectedEvent) {
      setModal({ event: selectedEvent, isNew: false });
    }
  }, [selectedEvent]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Filter bar */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--nt-border)",
            padding: "10px 32px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            overflowX: "auto",
          }}
        >
          {/* Category pills */}
          {usedCategories.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--nt-text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginRight: 2,
                  flexShrink: 0,
                }}
              >
                Category
              </span>
              {usedCategories.map((cat) => {
                const active = filterCategories.has(cat);
                const color = EVENT_CATEGORY_COLORS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      background: active ? `${color}22` : "transparent",
                      border: `1px solid ${active ? color : "var(--nt-border)"}`,
                      borderRadius: 12,
                      padding: "2px 10px",
                      fontSize: 11,
                      color: active ? color : "var(--nt-text-muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: color,
                        opacity: active ? 1 : 0.5,
                      }}
                    />
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider between groups */}
          {usedCategories.length > 0 && usedVisions.length > 0 && (
            <div
              style={{
                width: 1,
                height: 16,
                background: "var(--nt-border)",
                flexShrink: 0,
              }}
            />
          )}

          {/* Vision pills */}
          {usedVisions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--nt-text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginRight: 2,
                  flexShrink: 0,
                }}
              >
                Vision
              </span>
              {usedVisions.map((v) => {
                const active = filterVisions.has(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVision(v.id)}
                    style={{
                      background: active
                        ? "var(--nt-accent)11"
                        : "transparent",
                      border: `1px solid ${
                        active ? "var(--nt-accent)" : "var(--nt-border)"
                      }`,
                      borderRadius: 12,
                      padding: "2px 10px",
                      fontSize: 11,
                      color: active
                        ? "var(--nt-accent)"
                        : "var(--nt-text-muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: active ? 1 : 0.5 }}
                    >
                      <path d="M9 3C5 3 2 9 2 9s3 6 7 6 7-6 7-6-3-6-7-6Z" />
                      <circle cx="9" cy="9" r="2.5" />
                    </svg>
                    {v.title || "Untitled"}
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--nt-text-muted)",
                padding: "2px 6px",
                marginLeft: "auto",
                flexShrink: 0,
                opacity: 0.7,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            >
              Clear
            </button>
          )}
        </div>

        {/* Main content row */}
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
          }}
        >
        {/* Left: card stack */}
        <div
          style={{
            width: 360,
            minWidth: 360,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--nt-border)",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px 32px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--nt-border)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--nt-text-muted)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Events
            </span>
            <button
              onClick={handleNewClick}
              style={{
                background: "none",
                border: "1px solid var(--nt-border)",
                borderRadius: 4,
                padding: "3px 10px",
                fontSize: 12,
                color: "var(--nt-text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--nt-accent)";
                e.currentTarget.style.color = "var(--nt-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--nt-border)";
                e.currentTarget.style.color = "var(--nt-text-secondary)";
              }}
            >
              + New
            </button>
          </div>

          {/* Card list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {sorted.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--nt-text-muted)",
                  padding: "20px 8px",
                  textAlign: "center",
                }}
              >
                No events yet.
                <br />
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  Click "+ New" to log one.
                </span>
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {sorted.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={selectedId === event.id}
                    onClick={() =>
                      setSelectedId(
                        selectedId === event.id ? null : event.id
                      )
                    }
                    index={i}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right: notes panel */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <NotesPanel
                key={selectedEvent.id}
                event={selectedEvent}
                visions={visions}
                onUpdate={handleUpdate}
                onEditRequest={handleEditRequest}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--nt-text-muted)",
                  fontSize: 13,
                }}
              >
                Select an event to view notes
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>{/* end main content row */}
      </div>{/* end outer column */}

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {modal && (
          <EventEditModal
            key={modal.event.id}
            event={modal.event}
            isNew={modal.isNew}
            visions={visions}
            onSave={handleModalSave}
            onDelete={modal.isNew ? undefined : handleModalDelete}
            onCancel={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
