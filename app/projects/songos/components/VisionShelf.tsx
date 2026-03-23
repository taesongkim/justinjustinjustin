"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Vision, createVision } from "../lib/types";

// ─── Drag Handle ──────────────────────────────────────────────

function DragHandle({ dragControls }: { dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        dragControls.start(e);
      }}
      style={{
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "4px 2px",
        opacity: 0.15,
        transition: "opacity 0.15s",
        flexShrink: 0,
        touchAction: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.15")}
    >
      {/* Six-dot grip icon */}
      <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" style={{ color: "var(--nt-text-muted)" }}>
        <circle cx="2" cy="2" r="1.2" />
        <circle cx="6" cy="2" r="1.2" />
        <circle cx="2" cy="7" r="1.2" />
        <circle cx="6" cy="7" r="1.2" />
        <circle cx="2" cy="12" r="1.2" />
        <circle cx="6" cy="12" r="1.2" />
      </svg>
    </div>
  );
}

// ─── Vision Card ─────────────────────────────────────────────

function VisionCard({
  vision,
  onUpdate,
  onDelete,
}: {
  vision: Vision;
  onUpdate: (updated: Vision) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(vision.title);
  const [description, setDescription] = useState(vision.description);
  const titleRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

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
    <Reorder.Item
      value={vision}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileDrag={{
        boxShadow: "0 0 12px rgba(255, 255, 255, 0.08)",
        cursor: "grabbing",
      }}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: 8,
        padding: 16,
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
        listStyle: "none",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLLIElement>) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLLIElement>) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.07)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
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
        <div style={{ display: "flex", gap: 8 }}>
          <DragHandle dragControls={dragControls} />
          <div style={{ flex: 1, minWidth: 0 }}>
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
          </div>
        </div>
      )}
    </Reorder.Item>
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
    const vision = createVision(newTitle.trim(), newDesc.trim(), 0);
    // Push existing orders down by 1 to insert new at top
    const reordered = visions.map((v) => ({ ...v, order: v.order + 1 }));
    onVisionsChange([vision, ...reordered]);
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

  // Sort by order field
  const sorted = [...visions].sort((a, b) => a.order - b.order);

  const handleReorder = useCallback(
    (reordered: Vision[]) => {
      // Reorder fires with the new array order — stamp sequential order values
      const updated = reordered.map((v, i) => ({
        ...v,
        order: i,
      }));
      onVisionsChange(updated);
    },
    [onVisionsChange]
  );

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
    <div style={{ padding: "24px 32px", maxWidth: 420,  }}>
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

      {/* Vision list */}
      {sorted.length === 0 && !adding ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--nt-text-muted)",
            padding: "20px 0",
            textAlign: "center",
          }}
        >
          No visions yet.
          <br />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Click &quot;+ Add Vision&quot; to create one.
          </span>
        </p>
      ) : (
        <Reorder.Group
          axis="y"
          values={sorted}
          onReorder={handleReorder}
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            }}
        >
          <AnimatePresence>
            {sorted.map((vision) => (
              <VisionCard
                key={vision.id}
                vision={vision}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  );
}
