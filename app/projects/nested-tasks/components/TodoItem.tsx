"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTodoContext } from "./NestedTodoApp";
import type { ColumnEntry } from "../lib/types";

// ─── Animation ────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: "auto" as const,
    marginBottom: 2,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.1, ease: "easeIn" as const },
  },
};

// ─── Checkbox SVG ─────────────────────────────────────────────

function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      tabIndex={-1}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: checked
          ? "1.5px solid var(--nt-checkbox-checked)"
          : "1.5px solid var(--nt-checkbox-border)",
        background: checked ? "var(--nt-checkbox-checked)" : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
        padding: 0,
      }}
      aria-label={checked ? "Uncheck item" : "Check item"}
    >
      {checked && (
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.path
            d="M2 5 L4.5 7.5 L8 3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
          />
        </motion.svg>
      )}
    </button>
  );
}

// ─── Expand Arrow ─────────────────────────────────────────────

function ExpandArrow({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      tabIndex={-1}
      style={{
        width: 18,
        height: 18,
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
        color: "var(--nt-text-muted)",
        transition: "color 0.15s, transform 0.15s",
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        opacity: 0.6,
      }}
      aria-label={expanded ? "Collapse" : "Expand"}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M3 1 L7 5 L3 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ─── Drag Handle ──────────────────────────────────────────────

function DragHandle({
  onDragStart,
}: {
  onDragStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onDragStart}
      style={{
        width: 14,
        height: 18,
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        opacity: 0,
        transition: "opacity 0.15s",
        color: "var(--nt-text-muted)",
      }}
      className="drag-handle"
      aria-label="Drag to reorder"
    >
      <svg width="6" height="14" viewBox="0 0 6 14">
        <circle cx="1.5" cy="2" r="1" fill="currentColor" />
        <circle cx="4.5" cy="2" r="1" fill="currentColor" />
        <circle cx="1.5" cy="7" r="1" fill="currentColor" />
        <circle cx="4.5" cy="7" r="1" fill="currentColor" />
        <circle cx="1.5" cy="12" r="1" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

// ─── Auto-resize helper ──────────────────────────────────────

/** Max visible lines before the textarea stops growing. */
const MAX_LINES = 3;
const LINE_HEIGHT = 20; // 14px font * ~1.4 line-height ≈ 20px
const MAX_HEIGHT = MAX_LINES * LINE_HEIGHT;

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
}

// ─── TodoItem Component ───────────────────────────────────────

interface TodoItemProps {
  entry: ColumnEntry;
  colIndex: number;
  itemIndex: number;
  columnLength: number;
  reducedMotion: boolean;
}

export default function TodoItemComponent({
  entry,
  colIndex,
  itemIndex,
  columnLength,
  reducedMotion,
}: TodoItemProps) {
  const { actions, expandedIds, columns, todos } = useTodoContext();
  const { item, parentId } = entry;
  const isExpanded = expandedIds.has(item.id);
  const canExpand = colIndex < 3;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const itemElRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Register refs
  useEffect(() => {
    actions.registerItemRef(item.id, itemElRef.current);
    actions.registerInputRef(item.id, inputRef.current);
    return () => {
      actions.registerItemRef(item.id, null);
      actions.registerInputRef(item.id, null);
    };
  }, [item.id, actions]);

  // Auto-resize textarea when text changes
  useEffect(() => {
    autoResize(inputRef.current);
  }, [item.text]);

  // ─── Keyboard Handler ───────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const column = columns[colIndex];
      if (!column) return;

      const ta = e.currentTarget;
      const pos = ta.selectionStart ?? 0;
      const val = ta.value;

      // Is cursor on the first visual line? (no newline before cursor)
      const isFirstLine = val.lastIndexOf("\n", pos - 1) === -1;
      // Is cursor on the last visual line? (no newline after cursor)
      const isLastLine = val.indexOf("\n", pos) === -1;

      switch (e.key) {
        case "ArrowUp": {
          if (e.altKey) {
            // Reorder up
            e.preventDefault();
            const siblings = column.filter(
              (c) => c.parentId === parentId
            );
            const sibIdx = siblings.findIndex(
              (s) => s.item.id === item.id
            );
            if (sibIdx > 0) {
              const parent = parentId
                ? (() => {
                    const find = (
                      items: typeof todos
                    ): (typeof todos)[0] | null => {
                      for (const t of items) {
                        if (t.id === parentId) return t;
                        const f = find(t.children);
                        if (f) return f;
                      }
                      return null;
                    };
                    return find(todos);
                  })()
                : null;
              const pool = parent
                ? [...parent.children].sort((a, b) => a.order - b.order)
                : [...todos].sort((a, b) => a.order - b.order);
              const curIdx = pool.findIndex((p) => p.id === item.id);
              if (curIdx > 0) {
                actions.markTouched(item.id);
                actions.reorderInColumn(parentId, curIdx, curIdx - 1);
              }
            }
            return;
          }
          // Only navigate to previous item if cursor is on the first line
          if (!isFirstLine) break;
          e.preventDefault();
          if (itemIndex > 0) {
            actions.focusItem(column[itemIndex - 1].item.id);
          }
          break;
        }
        case "ArrowDown": {
          if (e.altKey) {
            // Reorder down
            e.preventDefault();
            const siblings = column.filter(
              (c) => c.parentId === parentId
            );
            const sibIdx = siblings.findIndex(
              (s) => s.item.id === item.id
            );
            if (sibIdx < siblings.length - 1) {
              const parent = parentId
                ? (() => {
                    const find = (
                      items: typeof todos
                    ): (typeof todos)[0] | null => {
                      for (const t of items) {
                        if (t.id === parentId) return t;
                        const f = find(t.children);
                        if (f) return f;
                      }
                      return null;
                    };
                    return find(todos);
                  })()
                : null;
              const pool = parent
                ? [...parent.children].sort((a, b) => a.order - b.order)
                : [...todos].sort((a, b) => a.order - b.order);
              const curIdx = pool.findIndex((p) => p.id === item.id);
              if (curIdx < pool.length - 1) {
                actions.markTouched(item.id);
                actions.reorderInColumn(parentId, curIdx, curIdx + 1);
              }
            }
            return;
          }
          // Only navigate to next item if cursor is on the last line
          if (!isLastLine) break;
          e.preventDefault();
          if (itemIndex < columnLength - 1) {
            actions.focusItem(column[itemIndex + 1].item.id);
          }
          break;
        }
        case "ArrowRight": {
          if (!canExpand) break;
          if (pos !== val.length) break;
          e.preventDefault();

          if (!isExpanded) {
            actions.toggleExpand(item.id);
            if (item.children.length > 0) {
              const first = [...item.children].sort(
                (a, b) => a.order - b.order
              )[0];
              actions.focusItem(first.id);
            } else {
              actions.createFirstChild(item.id);
            }
          } else if (item.children.length > 0) {
            const first = [...item.children].sort(
              (a, b) => a.order - b.order
            )[0];
            actions.focusItem(first.id);
          } else {
            actions.createFirstChild(item.id);
          }
          break;
        }
        case "ArrowLeft": {
          if (pos !== 0) break;
          if (colIndex > 0 && parentId) {
            e.preventDefault();
            actions.focusItem(parentId);
          }
          break;
        }
        case "Enter": {
          if (e.shiftKey) {
            // Shift+Enter: insert newline (let textarea handle it)
            // Cap at MAX_LINES
            const lineCount = val.split("\n").length;
            if (lineCount >= MAX_LINES) {
              e.preventDefault();
            }
            break;
          }
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            actions.markTouched(item.id);
            actions.toggleCheck(item.id);
          } else {
            actions.createSiblingAfter(item.id);
          }
          break;
        }
        case "Backspace": {
          if (item.text === "" && val === "") {
            e.preventDefault();
            actions.deleteItem(item.id);
          }
          break;
        }
      }
    },
    [
      item,
      colIndex,
      itemIndex,
      columnLength,
      parentId,
      isExpanded,
      canExpand,
      columns,
      todos,
      actions,
    ]
  );

  // ─── Drag Handling (pointer-based) ──────────────────────

  const dragStartY = useRef(0);
  const dragItemOriginalIndex = useRef(0);
  const currentDropIndex = useRef(0);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      actions.markTouched(item.id);
      dragStartY.current = e.clientY;

      const parent = parentId
        ? (() => {
            const find = (
              items: typeof todos
            ): (typeof todos)[0] | null => {
              for (const t of items) {
                if (t.id === parentId) return t;
                const f = find(t.children);
                if (f) return f;
              }
              return null;
            };
            return find(todos);
          })()
        : null;
      const pool = parent
        ? [...parent.children].sort((a, b) => a.order - b.order)
        : [...todos].sort((a, b) => a.order - b.order);
      const idx = pool.findIndex((p) => p.id === item.id);
      dragItemOriginalIndex.current = idx;
      currentDropIndex.current = idx;

      const handleMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;
        const itemHeight = itemElRef.current?.getBoundingClientRect().height ?? 44;
        const indexDelta = Math.round(deltaY / itemHeight);
        const newIndex = Math.max(
          0,
          Math.min(
            pool.length - 1,
            dragItemOriginalIndex.current + indexDelta
          )
        );
        if (newIndex !== currentDropIndex.current) {
          currentDropIndex.current = newIndex;
          actions.markTouched(item.id);
          actions.reorderInColumn(
            parentId,
            dragItemOriginalIndex.current,
            newIndex
          );
          dragItemOriginalIndex.current = newIndex;
        }
      };

      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [item.id, parentId, todos, actions]
  );

  // ─── Render ─────────────────────────────────────────────

  return (
    <motion.div
      ref={itemElRef}
      data-item-id={item.id}
      variants={reducedMotion ? undefined : itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout={reducedMotion ? false : "position"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        padding: "4px 6px",
        borderRadius: 6,
        cursor: "default",
        opacity: isDragging ? 0.5 : 1,
        background: isDragging
          ? "var(--nt-surface)"
          : "transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        const handle = e.currentTarget.querySelector(
          ".drag-handle"
        ) as HTMLElement;
        if (handle) handle.style.opacity = "0.5";
      }}
      onMouseLeave={(e) => {
        const handle = e.currentTarget.querySelector(
          ".drag-handle"
        ) as HTMLElement;
        if (handle) handle.style.opacity = "0";
      }}
    >
      {/* Push checkbox + drag handle down to align with first line of text */}
      <div style={{ paddingTop: 4, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <DragHandle onDragStart={handleDragStart} />
        <Checkbox
          checked={item.checked}
          onToggle={() => {
            actions.markTouched(item.id);
            actions.toggleCheck(item.id);
          }}
        />
      </div>

      <textarea
        ref={inputRef}
        value={item.text}
        onChange={(e) => {
          actions.markTouched(item.id);
          actions.updateText(item.id, e.target.value);
          autoResize(e.target);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type something..."
        spellCheck={false}
        rows={1}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 14,
          color: item.checked
            ? "var(--nt-text-muted)"
            : "var(--nt-text-primary)",
          textDecoration: item.checked ? "line-through" : "none",
          opacity: item.checked ? 0.6 : 1,
          fontFamily: "inherit",
          padding: "4px 2px",
          lineHeight: "20px",
          minWidth: 0,
          resize: "none",
          overflow: "hidden",
          maxHeight: MAX_HEIGHT,
          transition: "color 0.15s, opacity 0.15s",
        }}
      />

      {canExpand && (
        <div style={{ paddingTop: 4, flexShrink: 0 }}>
          <ExpandArrow
            expanded={isExpanded}
            onClick={() => {
              if (!isExpanded && item.children.length === 0) {
                actions.createFirstChild(item.id);
              } else {
                actions.toggleExpand(item.id);
              }
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
