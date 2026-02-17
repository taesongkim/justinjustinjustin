"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTodoContext } from "./NestedTodoApp";
import { MAX_COLUMNS, getSubtreeDepth, hasAnyPutAside } from "../lib/types";
import type { ColumnEntry } from "../lib/types";
import LiquidCheckbox from "./LiquidCheckbox";

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
        border: "none",
        background: checked ? "var(--nt-checkbox-checked)" : "var(--nt-checkbox-border)",
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
  hasChildren,
  onClick,
}: {
  expanded: boolean;
  hasChildren: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--nt-surface)";
        e.currentTarget.style.opacity = hasChildren ? "0.9" : "0.6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.opacity = hasChildren ? "0.6" : "0.2";
      }}
      tabIndex={-1}
      style={{
        width: 20,
        height: 20,
        background: "none",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
        color: "var(--nt-text-muted)",
        transition: "color 0.15s, transform 0.15s, background 0.15s, opacity 0.15s",
        transform: hasChildren
          ? expanded ? "rotate(-90deg)" : "rotate(0deg)"
          : "rotate(0deg)",
        opacity: hasChildren ? 0.6 : 0.2,
      }}
      aria-label={hasChildren ? (expanded ? "Collapse" : "Expand") : "Add child"}
    >
      {hasChildren ? (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M1 3 L5 7 L9 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M5 1 L5 9 M1 5 L9 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

// ─── Expand All Button ───────────────────────────────────────

function ExpandAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--nt-surface)";
        e.currentTarget.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.opacity = "0.6";
      }}
      tabIndex={-1}
      style={{
        width: 20,
        height: 20,
        background: "none",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
        color: "var(--nt-text-muted)",
        transition: "background 0.15s, opacity 0.15s",
        opacity: 0.6,
      }}
      aria-label="Expand all branches"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M0.5 2 L3.5 5 L0.5 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 2 L8.5 5 L5.5 8"
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

/** Check if all expandable descendants of an item are already expanded. */
function allBranchesExpanded(item: { id: string; children: { id: string; children: any[] }[] }, expandedIds: Set<string>): boolean {
  for (const child of item.children) {
    if (child.children.length > 0) {
      if (!expandedIds.has(child.id)) return false;
      if (!allBranchesExpanded(child, expandedIds)) return false;
    }
  }
  return true;
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
  const { actions, expandedIds, columns, todos, gridAssignments, dragState, touchedTimestamps, glowArrivals } = useTodoContext();
  const { item, parentId } = entry;
  const isExpanded = expandedIds.has(item.id);
  const canExpand = colIndex < MAX_COLUMNS - 1;
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

  // ─── Auto-check/uncheck parent based on children state ────
  useEffect(() => {
    if (item.children.length === 0) return;
    const allChecked = item.children.every((c) => c.checked);
    const hasPutAside = item.children.some((c) => c.putAside);

    if (!item.checked && allChecked && !hasPutAside) {
      // All children naturally checked → auto-check parent with glow
      actions.markTouched(item.id);
      actions.toggleCheck(item.id);
    } else if (item.checked && !allChecked && !hasPutAside) {
      // Parent is checked but not all children are checked → auto-uncheck
      actions.toggleCheck(item.id);
    }
  }, [item.checked, item.children, item.id, actions]);

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

  // ─── Drag Handling (pointer-based, preview mode) ────────

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      actions.markTouched(item.id);

      // Find siblings in the same parent group
      const siblingCol = columns.find((col) =>
        col.some((ce) => ce.item.id === item.id)
      );
      const siblings = siblingCol
        ? siblingCol.filter((ce) => ce.parentId === parentId)
        : [];
      const idx = siblings.findIndex((ce) => ce.item.id === item.id);
      const pos = gridAssignments.get(item.id);
      const origGridCol = pos?.gridColumn ?? 1;

      // Compute subtree depth of the dragged item for column-limit checks
      const itemSubtreeDepth = getSubtreeDepth(item);

      actions.startDrag({
        itemId: item.id,
        parentId,
        fromIndex: idx,
        dropIndex: idx,
        gridColumn: origGridCol,
        targetParentId: parentId,
        targetGridColumn: origGridCol,
        isBlocked: false,
      });

      // ─── Helpers for midpoint detection ───────────────────

      /** Get Y midpoints for a list of entries (by querying DOM). */
      const getMidpoints = (entries: ColumnEntry[]): number[] => {
        return entries.map((ce) => {
          const el = document.querySelector(
            `[data-item-id="${ce.item.id}"]`
          ) as HTMLElement | null;
          if (!el) return 0;
          const rect = el.getBoundingClientRect();
          return rect.top + rect.height / 2;
        });
      };

      /** Compute drop index from cursor Y and midpoints. */
      const computeDropIndex = (cursorY: number, midpoints: number[], count: number): number => {
        let dropIdx = 0;
        for (let i = 0; i < midpoints.length; i++) {
          if (cursorY > midpoints[i]) dropIdx = i + 1;
        }
        return Math.max(0, Math.min(count, dropIdx));
      };

      /** Detect which grid column the cursor is over. */
      const getColumnAtX = (cursorX: number): number => {
        // Query the grid container's column cells to find boundaries
        const container = document.querySelector("[data-item-id]")?.closest("[style*='display: grid']") as HTMLElement | null;
        if (!container) return origGridCol;

        const containerRect = container.getBoundingClientRect();
        const relX = cursorX - containerRect.left + container.scrollLeft;

        // Get actual column widths from the grid's computed columns
        const colWidths = window.getComputedStyle(container).gridTemplateColumns.split(" ").map(parseFloat);
        let cumulative = 0;
        for (let i = 0; i < colWidths.length; i++) {
          cumulative += colWidths[i];
          if (relX < cumulative) return i + 1; // 1-based
        }
        return colWidths.length; // past the last column
      };

      /** Find parent groups in a given grid column (1-based). */
      const getParentGroupsInColumn = (gridCol: number): { parentId: string | null; entries: ColumnEntry[] }[] => {
        const colIdx = gridCol - 1; // 0-based array index
        const col = columns[colIdx];
        if (!col) return [];

        // Group entries by parentId
        const groups = new Map<string | null, ColumnEntry[]>();
        for (const entry of col) {
          const pid = entry.parentId;
          let list = groups.get(pid);
          if (!list) { list = []; groups.set(pid, list); }
          list.push(entry);
        }
        return Array.from(groups.entries()).map(([pid, entries]) => ({
          parentId: pid,
          entries,
        }));
      };

      /** Find which parent group is closest to cursorY in a column. */
      const findClosestGroup = (
        cursorY: number,
        groups: { parentId: string | null; entries: ColumnEntry[] }[]
      ): { parentId: string | null; entries: ColumnEntry[] } | null => {
        if (groups.length === 0) return null;
        if (groups.length === 1) return groups[0];

        let best = groups[0];
        let bestDist = Infinity;

        for (const group of groups) {
          // Get bounding box of this group
          let minY = Infinity, maxY = -Infinity;
          for (const ce of group.entries) {
            const el = document.querySelector(`[data-item-id="${ce.item.id}"]`) as HTMLElement | null;
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top < minY) minY = rect.top;
            if (rect.bottom > maxY) maxY = rect.bottom;
          }
          // Distance: 0 if cursor is within, else distance to nearest edge
          const dist = cursorY < minY ? minY - cursorY : cursorY > maxY ? cursorY - maxY : 0;
          if (dist < bestDist) {
            bestDist = dist;
            best = group;
          }
        }
        return best;
      };

      // ─── Pointer move handler ─────────────────────────────

      const handleMove = (moveEvent: PointerEvent) => {
        const cursorX = moveEvent.clientX;
        const cursorY = moveEvent.clientY;

        // Detect which grid column cursor is over
        const hoverCol = getColumnAtX(cursorX);

        // Check if dropping in this column would exceed the nesting limit.
        // The item's deepest descendant would land at column:
        //   hoverCol (1-based) + itemSubtreeDepth
        // which must be <= MAX_COLUMNS
        const wouldExceedLimit = hoverCol + itemSubtreeDepth > MAX_COLUMNS;

        if (hoverCol === origGridCol) {
          // Same column as original — check if cursor is near own parent group
          const groups = getParentGroupsInColumn(hoverCol);
          const closest = findClosestGroup(cursorY, groups);

          if (closest && closest.parentId === parentId) {
            // Within original parent group — same-parent reorder (never blocked)
            const midpoints = getMidpoints(siblings);
            const dropIndex = computeDropIndex(cursorY, midpoints, siblings.length);
            actions.updateDragTarget(parentId, origGridCol, dropIndex, false);
          } else if (closest) {
            // Different parent group in same column — cross-branch
            const targetEntries = closest.entries.filter(
              (ce) => ce.item.id !== item.id
            );
            const midpoints = getMidpoints(targetEntries);
            const dropIndex = computeDropIndex(cursorY, midpoints, targetEntries.length);
            actions.updateDragTarget(closest.parentId, hoverCol, dropIndex, wouldExceedLimit);
          }
        } else {
          // Different column — cross-branch
          const groups = getParentGroupsInColumn(hoverCol);
          const closest = findClosestGroup(cursorY, groups);

          if (closest) {
            const targetEntries = closest.entries.filter(
              (ce) => ce.item.id !== item.id
            );
            const midpoints = getMidpoints(targetEntries);
            const dropIndex = computeDropIndex(cursorY, midpoints, targetEntries.length);
            actions.updateDragTarget(closest.parentId, hoverCol, dropIndex, wouldExceedLimit);
          }
        }
      };

      const handleUp = () => {
        setIsDragging(false);
        actions.endDrag(true);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [item.id, parentId, columns, gridAssignments, actions]
  );

  // ─── Render ─────────────────────────────────────────────

  const isDraggedAway =
    isDragging &&
    dragState != null &&
    (dragState.targetParentId !== dragState.parentId ||
      (dragState.dropIndex !== dragState.fromIndex &&
        dragState.dropIndex !== dragState.fromIndex + 1));

  return (
    <motion.div
      ref={itemElRef}
      data-item-id={item.id}
      variants={reducedMotion ? undefined : itemVariants}
      initial="hidden"
      animate={{
        opacity: isDraggedAway ? 0.35 : 1,
        height: "auto",
        marginBottom: 2,
      }}
      exit="exit"
      layout={reducedMotion ? false : "position"}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        padding: "4px 6px",
        borderRadius: 6,
        cursor: "default",
        background: isDragging
          ? "var(--nt-surface)"
          : "transparent",
        transition: "background 0.25s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!isDragging) {
          // Clear any existing animation timeout so re-hover resets
          const prevTimeout = (el as any).__bgTimeout;
          if (prevTimeout) clearTimeout(prevTimeout);

          el.style.transition = "background 0.25s";
          el.style.background = "rgba(255, 255, 255, 0.015)";
          // Fade back to invisible over 1s after a brief hold
          (el as any).__bgTimeout = setTimeout(() => {
            el.style.transition = "background 1s";
            el.style.background = "transparent";
          }, 300);
        }
        const handle = el.querySelector(
          ".drag-handle"
        ) as HTMLElement;
        if (handle) handle.style.opacity = "0.5";
      }}
      onMouseLeave={(e) => {
        // Let the animation play out — don't clear background on leave
        const handle = e.currentTarget.querySelector(
          ".drag-handle"
        ) as HTMLElement;
        if (handle) handle.style.opacity = "0";
      }}
    >
      {/* Push checkbox + drag handle down to align with first line of text */}
      <div style={{ paddingTop: 5, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <DragHandle onDragStart={handleDragStart} />
        {item.children.length > 0 ? (
          <LiquidCheckbox
            fillLevel={item.children.filter((c) => c.checked).length / item.children.length}
            isChecked={item.checked}
            isPutAside={item.putAside}
            itemId={item.id}
            isLeaf={false}
            glowArrivals={glowArrivals}
            onClick={() => {
              if (item.putAside) {
                // Reactivate put-aside item
                actions.reactivatePutAside(item.id);
                return;
              }
              if (!item.checked) {
                // Partially filled or empty → put aside unchecked children
                const hasUnchecked = item.children.some((c) => !c.checked);
                if (hasUnchecked) {
                  actions.putAsideUnchecked(item.id);
                } else {
                  // All children checked → just check it
                  actions.markTouched(item.id);
                  actions.toggleCheck(item.id);
                }
              } else if (item.children.some((c) => c.putAside)) {
                // Manually checked with put-aside children → restore them
                actions.restorePutAside(item.id);
              } else if (item.children.every((c) => c.checked)) {
                // All children checked → uncheck parent + create new empty child
                actions.markTouched(item.id);
                actions.toggleCheck(item.id);
                actions.createFirstChild(item.id);
              } else {
                // Fallback
                actions.markTouched(item.id);
                actions.toggleCheck(item.id);
              }
            }}
          />
        ) : (
          <LiquidCheckbox
            fillLevel={0}
            isChecked={item.checked}
            isPutAside={item.putAside}
            itemId={item.id}
            isLeaf={true}
            glowArrivals={glowArrivals}
            onClick={() => {
              if (item.putAside) {
                actions.reactivatePutAside(item.id);
                return;
              }
              actions.markTouched(item.id);
              actions.toggleCheck(item.id);
            }}
          />
        )}
      </div>

      {item.putAside ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.reactivatePutAside(item.id);
          }}
          style={{
            flex: 1,
            fontSize: 14,
            color: "var(--nt-text-muted)",
            opacity: 0.35,
            fontFamily: "inherit",
            padding: "4px 2px",
            lineHeight: "20px",
            cursor: "pointer",
            userSelect: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            minWidth: 0,
            transition: "color 0.15s, opacity 0.15s",
          }}
        >
          {item.text || "Type something..."}
        </div>
      ) : (
        <textarea
          ref={inputRef}
          value={item.text}
          onChange={(e) => {
            actions.markTouched(item.id);
            actions.updateText(item.id, e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Auto-remove empty items when they lose focus,
            // but keep at least one root item so the list is never empty
            if (item.text === "" && item.children.length === 0) {
              const isOnlyRoot = parentId === null && columnLength <= 1;
              if (!isOnlyRoot) {
                actions.deleteItem(item.id);
              }
            }
          }}
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
      )}

      {canExpand && (
        <div style={{ paddingTop: 4, flexShrink: 0, display: "flex", alignItems: "center", gap: 2 }}>
          {item.children.some((c) => c.children.length > 0) &&
            !allBranchesExpanded(item, expandedIds) && (
            <ExpandAllButton
              onClick={() => actions.expandAllDescendants(item.id)}
            />
          )}
          <ExpandArrow
            expanded={isExpanded}
            hasChildren={item.children.length > 0}
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
