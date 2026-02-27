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
  Tab,
  ColumnEntry,
  computeColumns,
  createTodoItem,
  generateId,
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
  MAX_COLUMNS,
} from "../lib/types";
import TodoItemComponent from "./TodoItem";
import ConnectingLines from "./ConnectingLines";
import FocusModal from "./FocusModal";

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
  /** Toggle waiting status on an unchecked item. */
  toggleWaiting: (itemId: string) => void;
  /** Toggle caution status on an item. */
  toggleCaution: (itemId: string) => void;
  /** Update stopwatch duration for an item (in seconds). */
  updateDuration: (itemId: string, seconds: number) => void;
  /** Open focus modal for an item. */
  openFocusModal: (itemId: string) => void;
  /** Close focus modal. */
  closeFocusModal: () => void;
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
  accentColor: string;
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
  const [accentColor, setAccentColor] = useState("#60a5fa");
  const staggerDelay = 20;
  const [mounted, setMounted] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const tabsRef = useRef<Tab[]>([]);

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
  // Track whether items are collapsing (fewer visible) or expanding (more visible)
  const prevItemCountRef = useRef(0);
  const isCollapsingRef = useRef(false);

  // ─── Load ─────────────────────────────────────────────────

  useEffect(() => {
    let loadedTabs = storage.loadTabs();
    if (loadedTabs.length === 0) {
      // Fresh start: create one default tab
      const defaultTab: Tab = {
        id: generateId(),
        name: "Tasks",
        todos: [createTodoItem("", 0)],
        note: "",
        expandedIds: [],
      };
      loadedTabs = [defaultTab];
    }

    setTabs(loadedTabs);
    tabsRef.current = loadedTabs;

    // Restore active tab or default to first
    const savedActiveId = storage.loadActiveTabId();
    const activeTab = loadedTabs.find((t) => t.id === savedActiveId) || loadedTabs[0];
    setActiveTabId(activeTab.id);
    setTodos(activeTab.todos.length > 0 ? activeTab.todos : [createTodoItem("", 0)]);
    setNote(activeTab.note);
    setExpandedIds(new Set(activeTab.expandedIds));

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDark);
    setMounted(true);
  }, []);

  // ─── Debounced Save ───────────────────────────────────────

  // Helper to persist current state into the tabs array and save
  const saveTabsWithCurrentState = useCallback(
    (overrideTodos?: TodoItem[], overrideNote?: string) => {
      setTabs((prev) => {
        const updated = prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                todos: overrideTodos ?? todos,
                note: overrideNote ?? note,
                expandedIds: Array.from(expandedIds),
              }
            : t
        );
        tabsRef.current = updated;
        storage.saveTabs(updated);
        return updated;
      });
    },
    [activeTabId, todos, note, expandedIds]
  );

  const scheduleSave = useCallback((newTodos: TodoItem[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTabsWithCurrentState(newTodos, undefined);
    }, 500);
  }, [saveTabsWithCurrentState]);

  const scheduleNoteSave = useCallback((newNote: string) => {
    if (saveNoteTimeoutRef.current) clearTimeout(saveNoteTimeoutRef.current);
    saveNoteTimeoutRef.current = setTimeout(() => {
      saveTabsWithCurrentState(undefined, newNote);
    }, 500);
  }, [saveTabsWithCurrentState]);

  // Save expanded state changes (debounced, so expand/collapse persists on refresh)
  const expandSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (expandSaveRef.current) clearTimeout(expandSaveRef.current);
    expandSaveRef.current = setTimeout(() => {
      saveTabsWithCurrentState();
    }, 500);
    return () => {
      if (expandSaveRef.current) clearTimeout(expandSaveRef.current);
    };
  }, [expandedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed ─────────────────────────────────────────────

  const columns = useMemo(
    () => computeColumns(todos, expandedIds),
    [todos, expandedIds]
  );

  // Track expand/collapse direction for layout animation timing
  const totalVisibleItems = columns.reduce((sum, col) => sum + col.length, 0);
  if (totalVisibleItems !== prevItemCountRef.current) {
    isCollapsingRef.current = totalVisibleItems < prevItemCountRef.current;
    prevItemCountRef.current = totalVisibleItems;
  }

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
          waiting: false,
          caution: false,
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
          waiting: false,
          caution: false,
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

  const toggleWaiting = useCallback(
    (itemId: string) => {
      setTodos((prev) => {
        const target = findItemInTree(prev, itemId);
        if (!target || target.checked) return prev;
        const updated = updateItemInTree(prev, itemId, (item) => ({
          ...item,
          waiting: !item.waiting,
        }));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const toggleCaution = useCallback(
    (itemId: string) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, itemId, (item) => ({
          ...item,
          caution: !item.caution,
        }));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const updateDuration = useCallback(
    (itemId: string, seconds: number) => {
      setTodos((prev) => {
        const updated = updateItemInTree(prev, itemId, (item) => ({
          ...item,
          duration: seconds,
        }));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave]
  );

  const [focusModalItemId, setFocusModalItemId] = useState<string | null>(null);

  const openFocusModal = useCallback((itemId: string) => {
    setFocusModalItemId(itemId);
  }, []);

  const closeFocusModal = useCallback(() => {
    setFocusModalItemId(null);
  }, []);

  // ─── Tab Management ─────────────────────────────────────

  const clearTransientState = useCallback(() => {
    touchedTimestamps.current.clear();
    glowArrivals.current.clear();
    glowComplete.current.clear();
    pendingAutoTouch.current.clear();
    setDragState(null);
    dragStateRef.current = null;
    setFocusModalItemId(null);
    setDeletedItem(null);
  }, []);

  const switchTab = useCallback(
    (targetTabId: string) => {
      if (targetTabId === activeTabId) return;

      // Snapshot current tab state into tabs array
      const snapshotTabs = tabsRef.current.map((t) =>
        t.id === activeTabId
          ? { ...t, todos, note, expandedIds: Array.from(expandedIds) }
          : t
      );
      tabsRef.current = snapshotTabs;
      setTabs(snapshotTabs);
      storage.saveTabs(snapshotTabs);

      // Load target tab
      const target = snapshotTabs.find((t) => t.id === targetTabId);
      if (!target) return;

      setActiveTabId(targetTabId);
      storage.saveActiveTabId(targetTabId);
      setTodos(target.todos.length > 0 ? target.todos : [createTodoItem("", 0)]);
      setNote(target.note);
      setExpandedIds(new Set(target.expandedIds));
      clearTransientState();
    },
    [activeTabId, todos, note, expandedIds, clearTransientState]
  );

  const createTab = useCallback(() => {
    // Snapshot current tab first
    const snapshotTabs = tabsRef.current.map((t) =>
      t.id === activeTabId
        ? { ...t, todos, note, expandedIds: Array.from(expandedIds) }
        : t
    );

    const newTab: Tab = {
      id: generateId(),
      name: "New Tab",
      todos: [createTodoItem("", 0)],
      note: "",
      expandedIds: [],
    };

    const updatedTabs = [...snapshotTabs, newTab];
    tabsRef.current = updatedTabs;
    setTabs(updatedTabs);
    storage.saveTabs(updatedTabs);

    // Switch to the new tab
    setActiveTabId(newTab.id);
    storage.saveActiveTabId(newTab.id);
    setTodos(newTab.todos);
    setNote(newTab.note);
    setExpandedIds(new Set());
    clearTransientState();

    // Auto-start renaming
    setRenamingTabId(newTab.id);
  }, [activeTabId, todos, note, expandedIds, clearTransientState]);

  const renameTab = useCallback(
    (tabId: string, newName: string) => {
      const trimmed = newName.trim() || "Untitled";
      const updatedTabs = tabsRef.current.map((t) =>
        t.id === tabId ? { ...t, name: trimmed } : t
      );
      tabsRef.current = updatedTabs;
      setTabs(updatedTabs);
      storage.saveTabs(updatedTabs);
      setRenamingTabId(null);
    },
    []
  );

  const deleteTab = useCallback(
    (tabId: string) => {
      if (tabsRef.current.length <= 1) return; // Can't delete last tab

      const idx = tabsRef.current.findIndex((t) => t.id === tabId);
      const updatedTabs = tabsRef.current.filter((t) => t.id !== tabId);
      tabsRef.current = updatedTabs;
      setTabs(updatedTabs);
      storage.saveTabs(updatedTabs);

      // If we deleted the active tab, switch to an adjacent one
      if (tabId === activeTabId) {
        const newActive = updatedTabs[Math.min(idx, updatedTabs.length - 1)];
        setActiveTabId(newActive.id);
        storage.saveActiveTabId(newActive.id);
        setTodos(newActive.todos.length > 0 ? newActive.todos : [createTodoItem("", 0)]);
        setNote(newActive.note);
        setExpandedIds(new Set(newActive.expandedIds));
        clearTransientState();
      }
    },
    [activeTabId, clearTransientState]
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
      toggleWaiting,
      toggleCaution,
      updateDuration,
      openFocusModal,
      closeFocusModal,
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
      toggleWaiting,
      toggleCaution,
      updateDuration,
      openFocusModal,
      closeFocusModal,
    ]
  );

  const gridAssignments = useMemo(
    () => computeGridAssignments(columns, expandedIds),
    [columns, expandedIds]
  );

  const contextValue = useMemo(
    () => ({ actions, expandedIds, columns, todos, gridAssignments, dragState, touchedTimestamps, glowArrivals, glowComplete, pendingAutoTouch, accentColor }),
    [actions, expandedIds, columns, todos, gridAssignments, dragState, accentColor]
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
              {/* ─── Accent Color Picker ─── */}
              {[
                { color: "#60a5fa", label: "Blue" },
                { color: "#a78bfa", label: "Violet" },
                { color: "#34d399", label: "Emerald" },
                { color: "#fb923c", label: "Orange" },
              ].map((opt) => (
                <button
                  key={opt.color}
                  onClick={() => {
                    const root = document.querySelector(".nt") as HTMLElement;
                    if (root) {
                      root.style.setProperty("--nt-accent", opt.color);
                    }
                    setAccentColor(opt.color);
                  }}
                  title={opt.label}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid var(--nt-border)",
                    background: opt.color,
                    cursor: "pointer",
                    padding: 0,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    boxShadow: `0 0 0 0px ${opt.color}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.transform = "scale(1.2)";
                    (e.target as HTMLElement).style.boxShadow = `0 0 8px ${opt.color}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = "scale(1)";
                    (e.target as HTMLElement).style.boxShadow = `0 0 0 0px ${opt.color}`;
                  }}
                  aria-label={`Set accent color to ${opt.label}`}
                />
              ))}
              {/* Theme toggle — hidden until light mode styling is complete */}
              {/* <div style={{ width: 1, height: 16, background: "var(--nt-border)", margin: "0 2px" }} />
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
              </button> */}
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

          {/* ─── Tab Bar ──────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginTop: 12,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isRenaming = tab.id === renamingTabId;

              return (
                <div
                  key={tab.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const x = e.currentTarget.querySelector("[data-tab-close]") as HTMLElement | null;
                    if (x && tabs.length > 1) x.style.opacity = "0.5";
                  }}
                  onMouseLeave={(e) => {
                    const x = e.currentTarget.querySelector("[data-tab-close]") as HTMLElement | null;
                    if (x) x.style.opacity = "0";
                  }}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      defaultValue={tab.name}
                      onBlur={(e) => renameTab(tab.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameTab(tab.id, (e.target as HTMLInputElement).value);
                        }
                        if (e.key === "Escape") {
                          setRenamingTabId(null);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid var(--nt-accent)`,
                        outline: "none",
                        fontSize: 13,
                        fontFamily: "inherit",
                        color: "var(--nt-text-primary)",
                        padding: "4px 8px",
                        minWidth: 40,
                        maxWidth: 160,
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => switchTab(tab.id)}
                      onDoubleClick={() => setRenamingTabId(tab.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: isActive
                          ? `2px solid var(--nt-accent)`
                          : "2px solid transparent",
                        padding: "4px 8px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        color: isActive
                          ? "var(--nt-text-primary)"
                          : "var(--nt-text-muted)",
                        cursor: "pointer",
                        transition: "color 0.15s, border-color 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = "var(--nt-text-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = "var(--nt-text-muted)";
                      }}
                    >
                      {tab.name}
                    </button>
                  )}

                  {/* Delete × button (visible on hover, hidden for last tab) */}
                  <button
                    data-tab-close
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTab(tab.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0 2px",
                      fontSize: 12,
                      color: "var(--nt-text-muted)",
                      cursor: "pointer",
                      opacity: 0,
                      transition: "opacity 0.15s",
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.5";
                    }}
                    aria-label={`Delete tab "${tab.name}"`}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* New tab button */}
            <button
              onClick={createTab}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                fontSize: 16,
                color: "var(--nt-text-muted)",
                cursor: "pointer",
                transition: "color 0.15s",
                flexShrink: 0,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--nt-text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--nt-text-muted)";
              }}
              aria-label="Create new tab"
            >
              +
            </button>
          </div>
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
                gridTemplateColumns: `repeat(${MAX_COLUMNS}, minmax(340px, 440px))`,
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
                themeKey={darkMode ? "dark" : "light"}
              />

              <AnimatePresence mode="sync">
                {columns.flatMap((column, colIndex) =>
                  column.map((entry, itemIndex) => {
                    const pos = gridAssignments.get(entry.item.id);
                    if (!pos) return null;
                    return (
                      <motion.div
                        key={entry.item.id}
                        layout={reducedMotion ? false : "position"}
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reducedMotion ? undefined : { opacity: 0 }}
                        transition={{
                          opacity: {
                            duration: 0.08,
                            ease: "easeOut",
                            delay: reducedMotion ? 0 : itemIndex * 0.03,
                          },
                          layout: {
                            duration: 0.12,
                            ease: "easeOut",
                            delay: isCollapsingRef.current ? 0.08 : 0,
                          },
                        }}
                        {...(!reducedMotion && {
                          exit: {
                            opacity: 0,
                            transition: {
                              duration: 0.06,
                              ease: "easeIn",
                              delay: (column.length - 1 - itemIndex) * 0.03,
                            },
                          },
                        })}
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
                      </motion.div>
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

                // Find the max grid row used by an item and all its visible descendants
                const getSubtreeMaxRow = (item: TodoItem): number => {
                  const pos = gridAssignments.get(item.id);
                  let maxRow = pos ? pos.gridRow : 0;
                  if (expandedIds.has(item.id)) {
                    for (const child of item.children) {
                      const childMax = getSubtreeMaxRow(child);
                      if (childMax > maxRow) maxRow = childMax;
                    }
                  }
                  return maxRow;
                };

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
                  // Use the max row of the previous item's full subtree + 1
                  const subtreeMax = getSubtreeMaxRow(prev.item);
                  indicatorRow = subtreeMax > 0 ? subtreeMax + 1 : 1;
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

      {/* Focus Modal (disabled — styling preserved in FocusModal.tsx for later) */}
      {/* <AnimatePresence>
        {focusModalItemId != null && findItemInTree(todos, focusModalItemId) && (
          <FocusModal
            item={findItemInTree(todos, focusModalItemId)!}
            onToggleCaution={() => actions.toggleCaution(focusModalItemId)}
            onUpdateDuration={(seconds) => actions.updateDuration(focusModalItemId!, seconds)}
            onComplete={() => {
              actions.markTouched(focusModalItemId!);
              actions.toggleCheck(focusModalItemId!);
              closeFocusModal();
            }}
            onClose={closeFocusModal}
          />
        )}
      </AnimatePresence> */}
    </TodoContext.Provider>
  );
}
