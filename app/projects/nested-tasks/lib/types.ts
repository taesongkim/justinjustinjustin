// ─── Data Model ───────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  children: TodoItem[];
  order: number;
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

// ─── Column Computation ───────────────────────────────────────

export function computeColumns(
  todos: TodoItem[],
  expandedIds: Set<string>
): ColumnEntry[][] {
  const columns: ColumnEntry[][] = [];

  // Column 0: root items
  const sorted = [...todos].sort((a, b) => a.order - b.order);
  columns.push(sorted.map((t) => ({ item: t, parentId: null, depth: 0 })));

  // Columns 1–3: children of expanded items in previous column
  for (let col = 0; col < 3; col++) {
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

// Collect all descendant IDs (for cleaning up expanded state on delete)
export function collectDescendantIds(item: TodoItem): string[] {
  const ids: string[] = [];
  for (const child of item.children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}
