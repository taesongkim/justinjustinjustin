// ─── SongOS App Types ────────────────────────────────────────

export type AppName = "tasks" | "events" | "visions";

export type EventCategory =
  | "learned"
  | "happened"
  | "note"
  | "milestone"
  | "published"
  | "built";

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  learned: "#a78bfa",
  happened: "#60a5fa",
  note: "#888888",
  milestone: "#34d399",
  published: "#fb923c",
  built: "#f472b6",
};

export const ALL_EVENT_CATEGORIES: EventCategory[] = [
  "learned",
  "happened",
  "note",
  "milestone",
  "published",
  "built",
];

export interface AppEvent {
  id: string;
  category: EventCategory;
  description: string;
  timestamp: number; // ms since epoch
  timezone: string; // IANA timezone, e.g. "America/New_York"
  link?: string;
  notes?: string;
  visionRef?: string; // optional Vision id
}

/** Detect the user's local IANA timezone. */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export interface Vision {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export function createAppEvent(
  category: EventCategory = "note",
  description: string = ""
): AppEvent {
  return {
    id: generateId(),
    category,
    description,
    timestamp: Date.now(),
    timezone: getLocalTimezone(),
  };
}

export function createVision(
  title: string = "",
  description: string = ""
): Vision {
  const now = Date.now();
  return {
    id: generateId(),
    title,
    description,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Constants ────────────────────────────────────────────────

/** Maximum number of columns (nesting depth) allowed. */
export const MAX_COLUMNS = 4;

// ─── Data Model ───────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  children: TodoItem[];
  order: number;
  putAside?: boolean;
  waiting?: boolean;
  caution?: boolean;
  duration?: number; // elapsed stopwatch time in seconds
}

export interface ColumnEntry {
  item: TodoItem;
  parentId: string | null;
  depth: number;
}

// ─── Factories ────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function createTodoItem(text: string = "", order: number = 0): TodoItem {
  return {
    id: generateId(),
    text,
    checked: false,
    children: [],
    order,
  };
}

// ─── Tab Model ───────────────────────────────────────────────

export interface Tab {
  id: string;
  name: string;
  todos: TodoItem[];
  note: string;
  expandedIds: string[]; // serialized Set<string> for JSON storage
}

// ─── Formatting Helpers ──────────────────────────────────────

/** Format seconds into MM:SS or H:MM:SS when ≥ 1 hour. */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Column Computation ───────────────────────────────────────

export function computeColumns(
  todos: TodoItem[],
  expandedIds: Set<string>
): ColumnEntry[][] {
  const columns: ColumnEntry[][] = [];

  // Column 0: root items
  const sorted = [...todos].sort((a, b) => a.order - b.order);
  columns.push(sorted.map((t) => ({ item: t, parentId: null, depth: 0 })));

  // Columns 1..(MAX_COLUMNS-1): children of expanded items in previous column
  for (let col = 0; col < MAX_COLUMNS - 1; col++) {
    const currentColumn = columns[col];
    const nextColumn: ColumnEntry[] = [];

    for (const entry of currentColumn) {
      if (expandedIds.has(entry.item.id)) {
        const children = [...entry.item.children].sort(
          (a, b) => a.order - b.order
        );
        for (const child of children) {
          nextColumn.push({
            item: child,
            parentId: entry.item.id,
            depth: col + 1,
          });
        }
      }
    }

    if (nextColumn.length > 0) {
      columns.push(nextColumn);
    } else {
      break;
    }
  }

  return columns;
}

// ─── Grid Assignment ─────────────────────────────────────────

export interface GridPosition {
  gridRow: number;
  gridColumn: number;
}

/**
 * Compute CSS Grid row/column assignments for every visible item.
 *
 * Rules:
 * - A parent aligns with its first child (flat top).
 * - Children never appear above their parent.
 * - The next sibling starts after the tallest branch of the previous
 *   sibling's subtree clears (across all columns).
 *
 * Returns a Map of itemId → { gridRow, gridColumn }.
 */
export function computeGridAssignments(
  columns: ColumnEntry[][],
  expandedIds: Set<string>
): Map<string, GridPosition> {
  const assignments = new Map<string, GridPosition>();
  if (columns.length === 0 || columns[0].length === 0) return assignments;

  // Build a lookup: parentId → ordered children entries (with their column index)
  const childrenOf = new Map<string, { entry: ColumnEntry; colIndex: number }[]>();
  for (let colIdx = 1; colIdx < columns.length; colIdx++) {
    for (const entry of columns[colIdx]) {
      if (!entry.parentId) continue;
      let list = childrenOf.get(entry.parentId);
      if (!list) {
        list = [];
        childrenOf.set(entry.parentId, list);
      }
      list.push({ entry, colIndex: colIdx + 1 }); // 1-based for CSS Grid
    }
  }

  /**
   * Recursively assign grid positions for an item and its visible subtree.
   * @param itemId   The item to assign
   * @param colIndex Which grid column (1-based)
   * @param startRow The first available row (1-based)
   * @returns The number of rows consumed by this item's subtree
   */
  function assignItem(itemId: string, colIndex: number, startRow: number): number {
    assignments.set(itemId, { gridRow: startRow, gridColumn: colIndex });

    const children = childrenOf.get(itemId);
    if (!children || children.length === 0 || !expandedIds.has(itemId)) {
      return 1; // Leaf or collapsed: occupies exactly 1 row
    }

    // Assign children: first child at same row (flat top), rest consecutive
    let childRow = startRow;
    let totalChildRows = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const rowsUsed = assignItem(child.entry.item.id, child.colIndex, childRow);
      childRow += rowsUsed;
      totalChildRows += rowsUsed;
    }

    // The parent's subtree height is at least the sum of its children's subtree heights
    // (the parent itself shares a row with the first child, so no +1)
    return Math.max(1, totalChildRows);
  }

  // Walk root items (column 0) top to bottom
  let currentRow = 1;
  for (const entry of columns[0]) {
    const rowsUsed = assignItem(entry.item.id, 1, currentRow);
    currentRow += rowsUsed;
    // Add a spacer row after expanded subtrees so connector lines
    // between parent groups have room for the bracket gap
    if (rowsUsed > 1) {
      currentRow += 1;
    }
  }

  return assignments;
}

// ─── Tree Operations (immutable) ──────────────────────────────

export function findItemInTree(
  todos: TodoItem[],
  id: string
): TodoItem | null {
  for (const todo of todos) {
    if (todo.id === id) return todo;
    const found = findItemInTree(todo.children, id);
    if (found) return found;
  }
  return null;
}

export function findParentInTree(
  todos: TodoItem[],
  id: string
): TodoItem | null {
  for (const todo of todos) {
    if (todo.children.some((c) => c.id === id)) return todo;
    const found = findParentInTree(todo.children, id);
    if (found) return found;
  }
  return null;
}

export function getItemDepth(todos: TodoItem[], id: string, depth = 0): number {
  for (const todo of todos) {
    if (todo.id === id) return depth;
    const found = getItemDepth(todo.children, id, depth + 1);
    if (found !== -1) return found;
  }
  return -1;
}

export function updateItemInTree(
  todos: TodoItem[],
  id: string,
  updater: (item: TodoItem) => TodoItem
): TodoItem[] {
  return todos.map((todo) => {
    if (todo.id === id) return updater(todo);
    return {
      ...todo,
      children: updateItemInTree(todo.children, id, updater),
    };
  });
}

export function deleteItemFromTree(
  todos: TodoItem[],
  id: string
): TodoItem[] {
  return todos
    .filter((todo) => todo.id !== id)
    .map((todo) => ({
      ...todo,
      children: deleteItemFromTree(todo.children, id),
    }));
}

export function addSiblingAfterInTree(
  todos: TodoItem[],
  afterId: string,
  newItem: TodoItem
): TodoItem[] {
  // Check if afterId is a direct child at this level
  const index = todos.findIndex((t) => t.id === afterId);
  if (index !== -1) {
    const result = [...todos];
    result.splice(index + 1, 0, newItem);
    // Recompute order
    return result.map((item, i) => ({ ...item, order: i }));
  }

  // Recurse into children
  return todos.map((todo) => ({
    ...todo,
    children: addSiblingAfterInTree(todo.children, afterId, newItem),
  }));
}

export function addChildToItem(
  todos: TodoItem[],
  parentId: string,
  newItem: TodoItem
): TodoItem[] {
  return todos.map((todo) => {
    if (todo.id === parentId) {
      const children = [...todo.children, newItem].map((c, i) => ({
        ...c,
        order: i,
      }));
      return { ...todo, children };
    }
    return {
      ...todo,
      children: addChildToItem(todo.children, parentId, newItem),
    };
  });
}

export function reorderChildren(
  todos: TodoItem[],
  parentId: string | null,
  fromIndex: number,
  toIndex: number
): TodoItem[] {
  if (parentId === null) {
    // Reorder at root level
    const sorted = [...todos].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    return sorted.map((item, i) => ({ ...item, order: i }));
  }

  return todos.map((todo) => {
    if (todo.id === parentId) {
      const sorted = [...todo.children].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return {
        ...todo,
        children: sorted.map((child, i) => ({ ...child, order: i })),
      };
    }
    return {
      ...todo,
      children: reorderChildren(todo.children, parentId, fromIndex, toIndex),
    };
  });
}

/**
 * Move an item (and its subtree) from its current parent to a new parent
 * at the given insert index. Works for:
 *  - same parent reorder (though reorderChildren is simpler for that)
 *  - cross-parent moves within any depth
 *  - moves to/from root (parentId = null)
 *
 * Returns null if the move is invalid (e.g. dropping onto own descendant).
 */
export function moveItemToParent(
  todos: TodoItem[],
  itemId: string,
  targetParentId: string | null,
  insertIndex: number
): TodoItem[] | null {
  // 1. Find the item to move
  const movingItem = findItemInTree(todos, itemId);
  if (!movingItem) return null;

  // 2. Prevent circular: can't drop onto own descendant
  if (targetParentId) {
    const descIds = collectDescendantIds(movingItem);
    if (descIds.includes(targetParentId) || itemId === targetParentId) {
      return null;
    }
  }

  // 3. Remove item from its current location
  let updated = deleteItemFromTree(todos, itemId);

  // 4. Re-number siblings at the old parent location
  const oldParent = findParentInTree(todos, itemId);
  if (oldParent) {
    updated = updateItemInTree(updated, oldParent.id, (p) => ({
      ...p,
      children: p.children.map((c, i) => ({ ...c, order: i })),
    }));
  } else {
    // Was at root
    updated = updated.map((t, i) => ({ ...t, order: i }));
  }

  // 5. Insert at target location
  if (targetParentId === null) {
    // Insert at root level
    const sorted = [...updated].sort((a, b) => a.order - b.order);
    const idx = Math.min(insertIndex, sorted.length);
    sorted.splice(idx, 0, movingItem);
    updated = sorted.map((t, i) => ({ ...t, order: i }));
  } else {
    // Insert as child of target parent
    updated = updateItemInTree(updated, targetParentId, (parent) => {
      const children = [...parent.children].sort((a, b) => a.order - b.order);
      const idx = Math.min(insertIndex, children.length);
      children.splice(idx, 0, movingItem);
      return {
        ...parent,
        children: children.map((c, i) => ({ ...c, order: i })),
      };
    });
  }

  return updated;
}

// Collect all descendant IDs (for cleaning up expanded state on delete)
export function collectDescendantIds(item: TodoItem): string[] {
  const ids: string[] = [];
  for (const child of item.children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

// ─── Put-Aside Helpers ───────────────────────────────────────

/** Recursively set putAside on an item and all its descendants. */
export function setPutAsideRecursive(item: TodoItem, value: boolean): TodoItem {
  return {
    ...item,
    putAside: value,
    waiting: value ? false : item.waiting,
    caution: value ? false : item.caution,
    children: item.children.map((c) => setPutAsideRecursive(c, value)),
  };
}

/** Returns true if item or any descendant has putAside === true. */
export function hasAnyPutAside(item: TodoItem): boolean {
  if (item.putAside) return true;
  return item.children.some(hasAnyPutAside);
}

// ─── Subtree Helpers ─────────────────────────────────────────

/**
 * Get the maximum nesting depth of an item's subtree.
 * A leaf returns 0, an item with children returns 1 + max child depth.
 */
export function getSubtreeDepth(item: TodoItem): number {
  if (item.children.length === 0) return 0;
  let max = 0;
  for (const child of item.children) {
    const d = getSubtreeDepth(child);
    if (d > max) max = d;
  }
  return 1 + max;
}
