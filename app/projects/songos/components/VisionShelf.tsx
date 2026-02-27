"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vision, createVision } from "../lib/types";

// ─── Vision Card ─────────────────────────────────────────────

function VisionCard({
  vision,
  onUpdate,
  onDelete,
  index,
}: {
  vision: Vision;
  onUpdate: (updated: Vision) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(vision.title);
  const [description, setDescription] = useState(vision.description);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editing]);

  const save = () => {
    onUpdate({
      ...vision,
      title,
      description,
      updatedAt: Date.now(),
    });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(vision.title);
    setDescription(vision.description);
    setEditing(false);
  };

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
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.03 }}
      style={{
        background: "var(--nt-surface)",
        border: "1px solid var(--nt-border)",
        borderRadius: 8,
        padding: 16,
        transition: "border-color 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--nt-text-muted)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--nt-border)";
      }}
    >
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="Vision title"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Describe your vision..."
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={save}
              style={{
                background: "var(--nt-accent)",
                border: "none",
                borderRadius: 4,
                padding: "4px 12px",
                fontSize: 12,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Save
            </button>
            <button
              onClick={cancel}
              style={{
                background: "none",
                border: "1px solid var(--nt-border)",
                borderRadius: 4,
                padding: "4px 12px",
                fontSize: 12,
                color: "var(--nt-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-crimson-pro), serif",
                fontSize: 32,
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.85)",
                margin: 0,
                lineHeight: 1.3,
                cursor: "pointer",
                letterSpacing: 0,
              }}
              onClick={() => setEditing(true)}
            >
              {vision.title || "Untitled Vision"}
            </h3>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--nt-text-muted)",
                  fontSize: 12,
                  padding: "2px 4px",
                  opacity: 0.5,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={() => onDelete(vision.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: 12,
                  padding: "2px 4px",
                  opacity: 0.4,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
          {vision.description && (
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.4)",
                lineHeight: 1.6,
                margin: "6px 0 0",
              }}
            >
              {vision.description}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Vision Shelf (Main) ─────────────────────────────────────

interface VisionShelfProps {
  visions: Vision[];
  onVisionsChange: (visions: Vision[]) => void;
}

export default function VisionShelf({
  visions,
  onVisionsChange,
}: VisionShelfProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [adding]);

  const handleCreate = () => {
    if (!newTitle.trim() && !newDesc.trim()) {
      setAdding(false);
      return;
    }
    const vision = createVision(newTitle.trim(), newDesc.trim());
    onVisionsChange([vision, ...visions]);
    setNewTitle("");
    setNewDesc("");
    setAdding(false);
  };

  const handleUpdate = useCallback(
    (updated: Vision) => {
      onVisionsChange(visions.map((v) => (v.id === updated.id ? updated : v)));
    },
    [visions, onVisionsChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onVisionsChange(visions.filter((v) => v.id !== id));
    },
    [visions, onVisionsChange]
  );

  const sorted = [...visions].sort((a, b) => b.createdAt - a.createdAt);

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
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 420 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
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
          Visions
        </span>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
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
            + Add Vision
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "var(--nt-surface)",
              border: "1px solid var(--nt-border)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                ref={titleInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={inputStyle}
                placeholder="Vision title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                    setNewDesc("");
                  }
                }}
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Describe your vision..."
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                    setNewDesc("");
                  }
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleCreate}
                  style={{
                    background: "var(--nt-accent)",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontSize: 12,
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setNewTitle("");
                    setNewDesc("");
                  }}
                  style={{
                    background: "none",
                    border: "1px solid var(--nt-border)",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontSize: 12,
                    color: "var(--nt-text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vision grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
        }}
      >
        <AnimatePresence>
          {sorted.length === 0 && !adding ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: 13,
                color: "var(--nt-text-muted)",
                padding: "20px 0",
                gridColumn: "1 / -1",
                textAlign: "center",
              }}
            >
              No visions yet.
              <br />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Click "+ Add Vision" to create one.
              </span>
            </motion.p>
          ) : (
            sorted.map((vision, i) => (
              <VisionCard
                key={vision.id}
                vision={vision}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                index={i}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
