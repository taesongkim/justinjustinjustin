"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { localStorageAdapter } from "../lib/storage";
import type { TodoStorage } from "../lib/storage";
import {
  TodoItem,
  ColumnEntry,
  computeColumns,
  createTodoItem,
  updateItemInTree,
  deleteItemFromTree,
  addSiblingAfterInTree,
  addChildToItem,
  findItemInTree,
  findParentInTree,
  reorderChildren,
  moveItemToParent,
  collectDescendantIds,
  computeGridAssignments,
  GridPosition,
  setPutAsideRecursive,
  hasAnyPutAside,
} from "../lib/types";
import TodoItemComponent from "./TodoItem";
import ConnectingLines from "./ConnectingLines";

// ─── Context ──────────────────────────────────────────────────

/** Describes an active drag operation. */
export interface DragState {
  /** The item being dragged. */
  itemId: string;
  /** Parent of the dragged item (null = root). */
  parentId: string | null;
  /** Original index in the sibling list. */
  fromIndex: number;
  /** Current drop target index (gap between siblings). */
  dropIndex: number;
  /** Grid column (1-based) of the sibling group. */
  gridColumn: number;
  /** Target parent for cross-branch drops (null = root). */
  targetParentId: string | null;
  /** Grid column of the target parent group (1-based). */
  targetGridColumn: number;
  /** Whether the drop is blocked (e.g. would exceed column limit). */
  isBlocked: boolean;
}

interface TodoActions {
  toggleExpand: (id: string) => void;
  expandAllDescendants: (id: string) => void;
  toggleCheck: (id: string) => void;
  updateText: (id: string, text: string) => void;
  createSiblingAfter: (id: string) => void;
  createFirstChild: (parentId: string) => void;
  deleteItem: (id: string) => void;
  focusItem: (id: string) => void;
  reorderInColumn: (
    parentId: string | null,
    fromIndex: number,
    toIndex: number
  ) => void;
  registerItemRef: (id: string, el: HTMLElement | null) => void;
  registerInputRef: (id: string, el: HTMLTextAreaElement | null) => void;
  markTouched: (id: string) => void;
  startDrag: (state: DragState) => void;
  updateDragDrop: (dropIndex: number) => void;
  updateDragTarget: (targetParentId: string | null, targetGridColumn: number, dropIndex: number, isBlocked?: boolean) => void;
  endDrag: (commit: boolean) => void;
  /** Check parent, put aside all unchecked children + subtrees. */
  putAsideUnchecked: (parentId: string) => void;
  /** Uncheck parent, restore all put-aside children + subtrees. */
  restorePutAside: (parentId: string) => void;
  /** Reactivate a single put-aside item (back to unchecked). */
  reactivatePutAside: (itemId: string) => void;
}

export const TodoContext = createContext<{
  actions: TodoActions;
  expandedIds: Set<string>;
  columns: ColumnEntry[][];
  todos: TodoItem[];
  gridAssignments: Map<string, GridPosition>;
  dragState: DragState | null;
  touchedTimestamps: React.RefObject<Map<string, number[]>>;
  glowArrivals: React.RefObject<Map<string, number[]>>;
  glowComplete: React.RefObject<Map<string, number[]>>;
  pendingAutoTouch: React.RefObject<Map<string, () => void>>;
} | null>(null);

export function useTodoContext() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodoContext must be used within TodoContext");
  return ctx;
}

// ─── Animation Variants ───────────────────────────────────────

const toastVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.1 } },
} as const;

// ─── Storage Instance ─────────────────────────────────────────

const storage: TodoStorage = localStorageAdapter;

// ─── Main Component ───────────────────────────────────────────

export default function NestedTodoApp() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const staggerDelay = 20;
  const [mounted, setMounted] = useState(false);
  const [deletedItem, setDeletedItem] = useState<{
    item: TodoItem;
    parentId: string | null;
    index: number;
  } | null>(null);

  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  /** Item ID → list of performance.now() timestamps for overlapping glows. */
  const touchedTimestamps = useRef<Map<string, number[]>>(new Map());
  /** Parent ID → list of timestamps when glow reached parent (for liquid fill sync). */
  const glowArrivals = useRef<Map<string, number[]>>(new Map());
  /** Parent ID → list of timestamps when border trace completed (for chained auto-check). */
  const glowComplete = useRef<Map<string, number[]>>(new Map());
  /** Item IDs that should be auto-touched when their border trace completes. */
  const pendingAutoTouch = useRef<Map<string, () => void>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  // ─── Load ─────────────────────────────────────────────────

  useEffect(() => {
    const loaded = storage.loadTodos();
    setTodos(loaded.length > 0 ? loaded : [createTodoItem("", 0)]);
    setNote(storage.loadNote());

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDark);
    setMounted(true);
  }, []);

  // ─── Debounced Save ───────────────────────────────────────

  const scheduleSave = useCallback((newTodos: TodoItem[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      storage.saveTodos(newTodos);
    }, 500);
  }, []);

  const scheduleNoteSave = useCallback((newNote: string) => {
    if (saveNoteTimeoutRef.current) clearTimeout(saveNoteTimeoutRef.current);
    saveNoteTimeoutRef.current = setTimeout(() => {
      storage.saveNote(newNote);
    }, 500);
  }, []);

  // ─── Computed ─────────────────────────────────────────────

  const columns = useMemo(
    () => computeColumns(todos, expandedIds),
    [todos, expandedIds]
  );

  // ─── Actions ──────────────────────────────────────────────

  const focusItem = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const input = inputRefs.current.get(id);
      if (input) {
        input.focus();
        // Place cursor at end
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
  }, []);

  const toggleExpandWithCleanup = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          // Also collapse descendants
          const item = findItemInTree(todos, id);
          if (item) {
            const descIds = collectDescendantIds(item);
            for (const did of descIds) {
              next.delete(did);
            }
          }
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [todos]
  );

  const expandAllDescendants = useCallback(
    (id: string) => {
      const item = findItemInTree(todos, id);
      if (!item) return;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        // Expand every descendant that has children
        const expandRecursive = (node: TodoItem) => {
          for (const child of node.children) {
            if (child.children.length > 0) {
              next.add(child.id);
              expandRecursive(child);
            }
          }
        };
        expandRecursive(item);
        return next;
      });
    },
    [todos]
  );

  const toggleCheck = useCallback(
    (id: string) => {
      setTodos((prev) => {
        // Find the item to determine if we're unchecking
        const target = findItemInTree(prev, id);
        const wasChecked = target?.checked ?? false;

        let updated = updateItemInTree(prev, id, (item) => ({
          ...item,
          checked: !item.checked,
        }));

        // If unchecking a child, uncheck any checked ancestors up the chain
        if (wasChecked) {
          let currentId: string | null = id;
          while (currentId) {
            const parent = findParentInTree(updated, currentId);
            if (parent && parent.checked) {
              updated = updateItemInTree(updated, parent.id, (item) => ({
                ...item,
                checked: false,
              }));
              currentId = parent.id;
            } else {
              break;
            }
          }
        }

        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, id, (item) => ({
          ...item,
          text,
        }));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const createSiblingAfter = useCallback(
    (afterId: string) => {
      const newItem = createTodoItem("", 0);
      setTodos((prev) => {
        const updated = addSiblingAfterInTree(prev, afterId, newItem);
        scheduleSave(updated);
        return updated;
      });
      focusItem(newItem.id);
    },
    [scheduleSave, focusItem]
  );

  const createFirstChild = useCallback(
    (parentId: string) => {
      const newItem = createTodoItem("", 0);
      setTodos((prev) => {
        const updated = addChildToItem(prev, parentId, newItem);
        scheduleSave(updated);
        return updated;
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
      focusItem(newItem.id);
    },
    [scheduleSave, focusItem]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setTodos((prev) => {
        const item = findItemInTree(prev, id);
        if (!item) return prev;

        const parent = findParentInTree(prev, id);
        const parentId = parent?.id || null;
        const siblings = parent
          ? [...parent.children].sort((a, b) => a.order - b.order)
          : [...prev].sort((a, b) => a.order - b.order);
        const index = siblings.findIndex((s) => s.id === id);

        // Store for undo
        setDeletedItem({ item, parentId, index });
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = setTimeout(
          () => setDeletedItem(null),
          5000
        );

        const updated = deleteItemFromTree(prev, id);
        scheduleSave(updated);

        // Focus previous sibling or parent
        if (index > 0) {
          focusItem(siblings[index - 1].id);
        } else if (parentId) {
          focusItem(parentId);
        }

        return updated;
      });

      // Remove from expanded
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [scheduleSave, focusItem]
  );

  const undoDelete = useCallback(() => {
    if (!deletedItem) return;
    const { item, parentId, index } = deletedItem;

    setTodos((prev) => {
      let updated: TodoItem[];
      if (parentId) {
        updated = updateItemInTree(prev, parentId, (parent) => {
          const children = [...parent.children];
          children.splice(Math.min(index, children.length), 0, item);
          return {
            ...parent,
            children: children.map((c, i) => ({ ...c, order: i })),
          };
        });
      } else {
        updated = [...prev];
        updated.splice(Math.min(index, updated.length), 0, item);
        updated = updated.map((t, i) => ({ ...t, order: i }));
      }
      scheduleSave(updated);
      return updated;
    });

    setDeletedItem(null);
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
  }, [deletedItem, scheduleSave]);

  const reorderInColumn = useCallback(
    (parentId: string | null, fromIndex: number, toIndex: number) => {
      setTodos((prev) => {
        const updated = reorderChildren(prev, parentId, fromIndex, toIndex);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const registerItemRef = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) {
        itemRefs.current.set(id, el);
      } else {
        itemRefs.current.delete(id);
      }
    },
    []
  );

  const registerInputRef = useCallback(
    (id: string, el: HTMLTextAreaElement | null) => {
      if (el) {
        inputRefs.current.set(id, el);
      } else {
        inputRefs.current.delete(id);
      }
    },
    []
  );

  const markTouched = useCallback((id: string) => {
    const existing = touchedTimestamps.current.get(id);
    const arr = Array.isArray(existing) ? existing : [];
    arr.push(performance.now());
    touchedTimestamps.current.set(id, arr);
  }, []);

  // ─── Drag Actions ───────────────────────────────────────────

  const startDrag = useCallback((state: DragState) => {
    dragStateRef.current = state;
    setDragState(state);
  }, []);

  const updateDragDrop = useCallback((dropIndex: number) => {
    setDragState((prev) => {
      if (!prev) return null;
      const next = { ...prev, dropIndex };
      dragStateRef.current = next;
      return next;
    });
  }, []);

  const updateDragTarget = useCallback(
    (targetParentId: string | null, targetGridColumn: number, dropIndex: number, isBlocked = false) => {
      setDragState((prev) => {
        if (!prev) return null;
        const next = { ...prev, targetParentId, targetGridColumn, dropIndex, isBlocked };
        dragStateRef.current = next;
        return next;
      });
    },
    []
  );

  const endDrag = useCallback(
    (commit: boolean) => {
      const ds = dragStateRef.current;
      if (commit && ds && !ds.isBlocked) {
        const isCrossBranch = ds.targetParentId !== ds.parentId;

        if (isCrossBranch) {
          // Cross-branch move: use moveItemToParent
          setTodos((prev) => {
            const result = moveItemToParent(
              prev,
              ds.itemId,
              ds.targetParentId,
              ds.dropIndex
            );
            if (!result) return prev; // invalid move (e.g. circular)
            scheduleSave(result);
            return result;
          });
          // If moving to a new parent, make sure that parent is expanded
          if (ds.targetParentId) {
            setExpandedIds((prev) => {
              const next = new Set(prev);
              next.add(ds.targetParentId!);
              return next;
            });
          }
          markTouched(ds.itemId);
        } else {
          // Same-parent reorder
          const { fromIndex, dropIndex } = ds;
          const toIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
          if (fromIndex !== toIndex) {
            reorderInColumn(ds.parentId, fromIndex, toIndex);
            markTouched(ds.itemId);
          }
        }
      }
      dragStateRef.current = null;
      setDragState(null);
    },
    [reorderInColumn, markTouched, scheduleSave]
  );

  // ─── Put-Aside Actions ──────────────────────────────────────

  const putAsideUnchecked = useCallback(
    (parentId: string) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, parentId, (parent) => ({
          ...parent,
          checked: true,
          children: parent.children.map((child) =>
            child.checked ? child : setPutAsideRecursive(child, true)
          ),
        }));
        scheduleSave(updated);
        return updated;
      });
      markTouched(parentId);
    },
    [scheduleSave, markTouched]
  );

  const restorePutAside = useCallback(
    (parentId: string) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, parentId, (parent) => ({
          ...parent,
          checked: false,
          children: parent.children.map((child) =>
            child.putAside ? setPutAsideRecursive(child, false) : child
          ),
        }));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const reactivatePutAside = useCallback(
    (itemId: string) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, itemId, (item) =>
          setPutAsideRecursive(item, false)
        );
        // Also uncheck the parent that put this item aside
        const parent = findParentInTree(updated, itemId);
        if (parent && parent.checked) {
          const result = updateItemInTree(updated, parent.id, (p) => ({
            ...p,
            checked: false,
          }));
          scheduleSave(result);
          return result;
        }
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  // ─── Context Value ────────────────────────────────────────

  const actions: TodoActions = useMemo(
    () => ({
      toggleExpand: toggleExpandWithCleanup,
      expandAllDescendants,
      toggleCheck,
      updateText,
      createSiblingAfter,
      createFirstChild,
      deleteItem,
      focusItem,
      reorderInColumn,
      registerItemRef,
      registerInputRef,
      markTouched,
      startDrag,
      updateDragDrop,
      updateDragTarget,
      endDrag,
      putAsideUnchecked,
      restorePutAside,
      reactivatePutAside,
    }),
    [
      toggleExpandWithCleanup,
      expandAllDescendants,
      toggleCheck,
      updateText,
      createSiblingAfter,
      createFirstChild,
      deleteItem,
      focusItem,
      reorderInColumn,
      registerItemRef,
      registerInputRef,
      markTouched,
      startDrag,
      updateDragDrop,
      updateDragTarget,
      endDrag,
      putAsideUnchecked,
      restorePutAside,
      reactivatePutAside,
    ]
  );

  const gridAssignments = useMemo(
    () => computeGridAssignments(columns, expandedIds),
    [columns, expandedIds]
  );

  const contextValue = useMemo(
    () => ({ actions, expandedIds, columns, todos, gridAssignments, dragState, touchedTimestamps, glowArrivals, glowComplete, pendingAutoTouch }),
    [actions, expandedIds, columns, todos, gridAssignments, dragState]
  );

  // ─── Note ─────────────────────────────────────────────────

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNote(val);
      scheduleNoteSave(val);
    },
    [scheduleNoteSave]
  );

  // ─── Render ───────────────────────────────────────────────

  if (!mounted) return null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <TodoContext.Provider value={contextValue}>
      <div
        className={`nt ${darkMode ? "nt-dark" : "nt-light"}`}
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--nt-bg)",
          color: "var(--nt-text-primary)",
          fontFamily:
            'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          transition: "background-color 0.2s, color 0.2s",
        }}
      >
        {/* ─── Header ──────────────────────────────────────── */}
        <header
          style={{
            padding: "24px 32px 16px",
            borderBottom: "1px solid var(--nt-border)",
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "var(--nt-text-primary)",
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {today}
              </h1>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => setDarkMode((d) => !d)}
                style={{
                  background: "none",
                  border: "1px solid var(--nt-border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: "var(--nt-text-secondary)",
                  fontSize: 12,
                  transition: "all 0.15s",
                }}
                aria-label="Toggle dark mode"
              >
                {darkMode ? "Light" : "Dark"}
              </button>
            </div>
          </div>
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="What's on your mind today..."
            rows={3}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: 14,
              color: "var(--nt-text-secondary)",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </header>

        {/* ─── Columns (CSS Grid) ────────────────────────── */}
        {(() => {
          let maxRow = 0;
          for (const pos of gridAssignments.values()) {
            if (pos.gridRow > maxRow) maxRow = pos.gridRow;
          }
          const lastRow = maxRow;

          // Find spacer rows (empty rows between expanded subtrees)
          const spacerRows: number[] = [];
          const rootItems = columns[0] || [];
          for (const entry of rootItems) {
            const pos = gridAssignments.get(entry.item.id);
            if (!pos) continue;
            // A root with subtree > 1 row has a spacer after it
            if (expandedIds.has(entry.item.id) && entry.item.children.length > 0) {
              // The spacer row is the row after the last row of this subtree
              // Find the max row used by this root's descendants
              let subtreeMaxRow = pos.gridRow;
              const checkDescendants = (item: typeof entry.item) => {
                for (const child of item.children) {
                  const childPos = gridAssignments.get(child.id);
                  if (childPos && childPos.gridRow > subtreeMaxRow) {
                    subtreeMaxRow = childPos.gridRow;
                  }
                  if (expandedIds.has(child.id)) {
                    checkDescendants(child);
                  }
                }
              };
              checkDescendants(entry.item);
              spacerRows.push(subtreeMaxRow + 1);
            }
          }

          return (
            <div
              ref={containerRef}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns.length}, minmax(340px, 440px))`,
                gridAutoRows: "min-content",
                position: "relative",
                overflowX: "auto",
                padding: "24px 0",
                minHeight: "calc(100vh - 120px)",
              }}
            >
              <ConnectingLines
                containerRef={containerRef}
                itemRefs={itemRefs}
                columns={columns}
                expandedIds={expandedIds}
                staggerDelay={staggerDelay}
                touchedTimestamps={touchedTimestamps}
                glowArrivals={glowArrivals}
                glowComplete={glowComplete}
                pendingAutoTouch={pendingAutoTouch}
              />

              <AnimatePresence mode="sync">
                {columns.flatMap((column, colIndex) =>
                  column.map((entry, itemIndex) => {
                    const pos = gridAssignments.get(entry.item.id);
                    if (!pos) return null;
                    return (
                      <div
                        key={entry.item.id}
                        style={{
                          gridRow: pos.gridRow,
                          gridColumn: pos.gridColumn,
                          padding: "0 16px",
                        }}
                      >
                        <TodoItemComponent
                          entry={entry}
                          colIndex={colIndex}
                          itemIndex={itemIndex}
                          columnLength={column.length}
                          reducedMotion={reducedMotion}
                        />
                      </div>
                    );
                  })
                )}
              </AnimatePresence>

              {/* Spacer rows between expanded subtrees */}
              {spacerRows.map((row) => (
                <div
                  key={`spacer-${row}`}
                  style={{
                    gridColumn: 1,
                    gridRow: row,
                    height: 12,
                  }}
                />
              ))}

              {/* Drop indicator line */}
              {dragState && (() => {
                const { fromIndex, dropIndex, parentId: srcParent, targetParentId, targetGridColumn, isBlocked } = dragState;
                const isCrossBranch = targetParentId !== srcParent;

                // Don't show indicator when drop would be a no-op (same parent, same position)
                if (!isCrossBranch && !isBlocked && (dropIndex === fromIndex || dropIndex === fromIndex + 1)) {
                  return null;
                }

                // Find siblings in the TARGET parent group
                const targetCol = columns.find((col) =>
                  col.some((e) => e.parentId === targetParentId)
                );
                // For root targets, use column 0; for others find matching column
                const siblings = targetParentId === null
                  ? (columns[0] || [])
                  : (targetCol ? targetCol.filter((e) => e.parentId === targetParentId) : []);

                // Determine which grid row to place the indicator at
                let indicatorRow: number;
                if (siblings.length === 0) {
                  const parentPos = targetParentId ? gridAssignments.get(targetParentId) : null;
                  indicatorRow = parentPos ? parentPos.gridRow : 1;
                } else if (dropIndex <= 0) {
                  const first = siblings[0];
                  const pos = first ? gridAssignments.get(first.item.id) : null;
                  indicatorRow = pos ? pos.gridRow : 1;
                } else {
                  const prev = siblings[Math.min(dropIndex - 1, siblings.length - 1)];
                  const pos = prev ? gridAssignments.get(prev.item.id) : null;
                  indicatorRow = pos ? pos.gridRow + 1 : 1;
                }

                const lineColor = isBlocked ? "var(--nt-text-muted)" : "var(--nt-accent)";

                return (
                  <div
                    key="drop-indicator"
                    style={{
                      gridColumn: targetGridColumn,
                      gridRow: indicatorRow,
                      padding: "0 16px",
                      height: 2,
                      alignSelf: "start",
                      marginTop: -1,
                      pointerEvents: "none",
                      zIndex: 10,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: 2,
                        borderRadius: 1,
                        background: lineColor,
                        boxShadow: isBlocked ? "none" : `0 0 ${isCrossBranch ? 8 : 6}px var(--nt-accent)`,
                        opacity: isBlocked ? 0.5 : 1,
                      }}
                    />
                    {isBlocked && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: 11,
                          color: "var(--nt-text-muted)",
                          background: "var(--nt-bg)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Exceeds nesting limit
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Add item button */}
              <button
                onClick={() => {
                  if (columns[0] && columns[0].length > 0) {
                    createSiblingAfter(
                      columns[0][columns[0].length - 1].item.id
                    );
                  } else {
                    const newItem = createTodoItem("", 0);
                    setTodos((prev) => {
                      const updated = [...prev, newItem].map((t, i) => ({
                        ...t,
                        order: i,
                      }));
                      scheduleSave(updated);
                      return updated;
                    });
                    focusItem(newItem.id);
                  }
                }}
                style={{
                  gridColumn: 1,
                  gridRow: lastRow + 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--nt-text-muted)",
                  fontSize: 13,
                  padding: "8px 12px",
                  opacity: 0.5,
                  transition: "opacity 0.15s",
                  width: "100%",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.opacity = "0.8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = "0.5")
                }
              >
                + Add item
              </button>
            </div>
          );
        })()}

        {/* ─── Undo Toast ──────────────────────────────────── */}
        <AnimatePresence>
          {deletedItem && (
            <motion.div
              variants={reducedMotion ? undefined : toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--nt-surface)",
                border: "1px solid var(--nt-border)",
                borderRadius: 8,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
                color: "var(--nt-text-secondary)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 100,
              }}
            >
              <span>
                Deleted &ldquo;{deletedItem.item.text || "empty item"}
                &rdquo;
              </span>
              <button
                onClick={undoDelete}
                style={{
                  background: "none",
                  border: "1px solid var(--nt-accent)",
                  borderRadius: 4,
                  padding: "3px 10px",
                  cursor: "pointer",
                  color: "var(--nt-accent)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Keyboard Shortcuts Help ─────────────────────── */}
        <div
          style={{
            position: "fixed",
            bottom: 12,
            right: 16,
            fontSize: 11,
            color: "var(--nt-text-muted)",
            opacity: 0.4,
          }}
        >
          Arrow keys to navigate &middot; Enter for new item &middot;{" "}
          {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to
          check &middot; Alt+&uarr;&darr; to reorder
        </div>
      </div>
    </TodoContext.Provider>
  );
}
