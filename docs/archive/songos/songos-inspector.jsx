import { useState, useRef, useCallback } from "react";

// ─── Inspector Overlay Logic ────────────────────────────────────

function useInspector() {
  const [hovered, setHovered] = useState(null);
  const containerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    let el = e.target;
    while (el && el !== containerRef.current) {
      const name = el.getAttribute("data-inspect");
      if (name) {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setHovered({
          name,
          rect: {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height,
          },
        });
        return;
      }
      el = el.parentElement;
    }
    setHovered(null);
  }, []);

  return { hovered, containerRef, handleMouseMove };
}

// ─── Category Colors ────────────────────────────────────────────

const CATEGORY_COLORS = {
  learned: "#a78bfa",
  happened: "#60a5fa",
  note: "#888888",
  milestone: "#34d399",
  published: "#fb923c",
  built: "#f472b6",
};

// ─── Accent Colors ──────────────────────────────────────────────

const ACCENT_COLORS = [
  { name: "Blue", color: "#60a5fa" },
  { name: "Violet", color: "#a78bfa" },
  { name: "Emerald", color: "#34d399" },
  { name: "Orange", color: "#fb923c" },
];

// ─── Sample Data ────────────────────────────────────────────────

const SAMPLE_EVENTS = [
  { id: "e1", category: "milestone", description: "Launched SongOS v0.1 with three core apps", time: "2h ago", hasLink: true },
  { id: "e2", category: "learned", description: "Framer Motion Reorder API supports drag handles via useDragControls", time: "Yesterday", hasLink: false },
  { id: "e3", category: "built", description: "Glassmorphism card system with blur(18px) saturate(160%)", time: "Today", hasLink: false },
  { id: "e4", category: "published", description: "STYLE.md — living design system documentation", time: "Wed", hasLink: true },
  { id: "e5", category: "note", description: "Need to explore Figma MCP integration for design sync", time: "Mar 1", hasLink: false },
  { id: "e6", category: "happened", description: "Standardized 32px horizontal padding across all views", time: "Mon", hasLink: false },
];

const SAMPLE_VISIONS = [
  { id: "v1", title: "Personal Knowledge OS", description: "A unified system for capturing, connecting, and resurfacing everything I learn, build, and experience." },
  { id: "v2", title: "Ambient Interface Design", description: "Interfaces that feel like they barely exist — glass, glow, and opacity as the primary visual language." },
  { id: "v3", title: "Creative Velocity", description: "Remove all friction between having an idea and making it real. Speed is a feature." },
];

const SAMPLE_TASKS = [
  {
    id: "t1", text: "Design glassmorphism component library", checked: false, duration: 2340, caution: false, waiting: false,
    children: [
      { id: "t1a", text: "Define blur & saturate tokens", checked: true, children: [], duration: 600 },
      { id: "t1b", text: "Build card primitive", checked: true, children: [], duration: 900 },
      { id: "t1c", text: "Add hover glow patterns", checked: false, children: [
        { id: "t1c1", text: "Accent glow (box-shadow)", checked: true, children: [] },
        { id: "t1c2", text: "Category-colored glow", checked: false, children: [] },
      ]},
    ],
  },
  {
    id: "t2", text: "Implement event journal filtering", checked: false, caution: true, waiting: false,
    children: [
      { id: "t2a", text: "Category pill toggles", checked: true, children: [] },
      { id: "t2b", text: "Vision reference pills", checked: true, children: [] },
      { id: "t2c", text: "AND/OR filter logic", checked: false, children: [] },
    ],
  },
  { id: "t3", text: "Write STYLE.md documentation", checked: true, children: [] },
  {
    id: "t4", text: "Vision shelf drag-to-reorder", checked: false, waiting: true,
    children: [
      { id: "t4a", text: "Add order field to Vision type", checked: true, children: [] },
      { id: "t4b", text: "Framer Motion Reorder integration", checked: false, children: [] },
    ],
  },
  { id: "t5", text: "Standardize padding across all views", checked: true, children: [], duration: 420 },
  { id: "t6", text: "Explore timezone edge cases for date-only events", checked: false, children: [] },
];

const SAMPLE_TABS = [
  { id: "tab1", name: "Sprint 1", active: true },
  { id: "tab2", name: "Backlog", active: false },
  { id: "tab3", name: "Ideas", active: false },
];

// ─── Inspector Highlight Overlay ────────────────────────────────

function InspectorOverlay({ hovered }) {
  if (!hovered) return null;
  const { name, rect } = hovered;
  return (
    <>
      <div style={{
        position: "absolute", top: rect.top, left: rect.left, width: rect.width, height: rect.height,
        border: "1.5px solid #60a5fa", borderRadius: 4, background: "rgba(96, 165, 250, 0.06)",
        pointerEvents: "none", zIndex: 9999, transition: "all 0.1s ease-out",
      }} />
      <div style={{
        position: "absolute", top: Math.max(0, rect.top - 26), left: rect.left,
        background: "#60a5fa", color: "#000", fontSize: 11, fontWeight: 600,
        fontFamily: "'SF Mono', 'Fira Code', monospace", padding: "3px 8px", borderRadius: 3,
        pointerEvents: "none", zIndex: 10000, whiteSpace: "nowrap", letterSpacing: "0.02em",
        transition: "all 0.1s ease-out",
      }}>{name}</div>
      <div style={{
        position: "absolute", top: rect.top + rect.height + 4, left: rect.left,
        fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', monospace", color: "rgba(96, 165, 250, 0.7)",
        pointerEvents: "none", zIndex: 10000, whiteSpace: "nowrap", transition: "all 0.1s ease-out",
      }}>{Math.round(rect.width)} × {Math.round(rect.height)}</div>
    </>
  );
}

// ─── Left Nav Panel ─────────────────────────────────────────────

function LeftNav({ activeApp, onAppChange }) {
  const navItems = [
    { id: "tasks", icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="12" height="12" rx="2" /><path d="M6.5 9.5l2 2 3.5-4" /></svg> },
    { id: "events", icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6.5" /><path d="M9 5.5V9l2.5 1.5" /></svg> },
    { id: "visions", icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3C5 3 2 9 2 9s3 6 7 6 7-6 7-6-3-6-7-6Z" /><circle cx="9" cy="9" r="2.5" /></svg> },
  ];
  return (
    <div data-inspect="LeftNavPanel" style={{ width: 48, minWidth: 48, height: "100%", background: "#050505", borderRight: "1px solid #222", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4 }}>
      {navItems.map((item) => (
        <button key={item.id} data-inspect={`NavItem.${item.id}`} onClick={() => onAppChange(item.id)}
          style={{ width: 34, height: 34, borderRadius: 6, border: "none", background: activeApp === item.id ? "rgba(96,165,250,0.12)" : "transparent", color: activeApp === item.id ? "#60a5fa" : "#4a4a4a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          {item.icon}
        </button>
      ))}
    </div>
  );
}

// ─── LiquidCheckbox ─────────────────────────────────────────────

function LiquidCheckbox({ checked, fillLevel, waiting }) {
  if (waiting) {
    return (
      <div data-inspect="LiquidCheckbox.waiting" style={{ width: 16, height: 16, borderRadius: 3, border: "1px solid #60a5fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#60a5fa" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2 1" /></svg>
      </div>
    );
  }
  return (
    <div data-inspect="LiquidCheckbox" style={{
      width: 16, height: 16, borderRadius: 3, border: `1px solid ${checked ? "#60a5fa" : "#3a3a3a"}`,
      background: checked ? "#60a5fa" : fillLevel ? `linear-gradient(to top, rgba(96,165,250,0.3) ${fillLevel}%, transparent ${fillLevel}%)` : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer",
    }}>
      {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5L5 9l4.5-5.5" /></svg>}
    </div>
  );
}

// ─── TodoItem ───────────────────────────────────────────────────

function TodoItemRow({ task, depth = 0, expanded, hasChildren }) {
  const isChecked = task.checked;
  const fillLevel = hasChildren ? Math.round((task.children?.filter(c => c.checked).length / Math.max(task.children?.length, 1)) * 100) : 0;

  return (
    <div data-inspect="TodoItem" style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 16px", opacity: isChecked ? 0.45 : 1 }}>
      {/* Drag handle */}
      <div data-inspect="DragHandle" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 5, opacity: 0.08, flexShrink: 0 }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="#4a4a4a">
          <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
          <circle cx="2" cy="7" r="1" /><circle cx="6" cy="7" r="1" />
          <circle cx="2" cy="12" r="1" /><circle cx="6" cy="12" r="1" />
        </svg>
      </div>

      {/* Checkbox */}
      <div style={{ paddingTop: 4 }}>
        <LiquidCheckbox checked={isChecked} fillLevel={fillLevel} waiting={task.waiting} />
      </div>

      {/* Text */}
      <div data-inspect="TodoItem.Text" style={{
        flex: 1, fontSize: 14, color: isChecked ? "#4a4a4a" : "#e0e0e0", lineHeight: 1.5,
        paddingTop: 3, textDecoration: isChecked ? "line-through" : "none",
        textDecorationColor: isChecked ? "#333" : "transparent",
      }}>
        {task.text}
      </div>

      {/* Duration */}
      {task.duration && (
        <span data-inspect="DurationBadge" style={{ fontSize: 11, fontFamily: "'SF Mono', monospace", color: "#4a4a4a", paddingTop: 5, flexShrink: 0 }}>
          {task.duration >= 3600 ? `${Math.floor(task.duration / 3600)}h ${Math.floor((task.duration % 3600) / 60)}m` : `${Math.floor(task.duration / 60)}m`}
        </span>
      )}

      {/* Right buttons */}
      <div style={{ display: "flex", gap: 2, paddingTop: 4, flexShrink: 0 }}>
        {task.caution && (
          <div data-inspect="CautionIndicator" style={{
            width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "inset 0 0 0 0.5px rgba(251,146,60,0.9), 0 0 8px rgba(251,146,60,0.3)",
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fb923c" strokeWidth="1.4"><path d="M8 2L1.5 13h13L8 2Z" /><path d="M8 6.5v3" /><circle cx="8" cy="11.5" r="0.5" fill="#fb923c" /></svg>
          </div>
        )}
        {task.waiting && (
          <div data-inspect="WaitingIndicator" style={{ width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2 1" /></svg>
          </div>
        )}
        {hasChildren && (
          <div data-inspect="ExpandArrow" style={{
            width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#4a4a4a", opacity: 0.6, cursor: "pointer", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s",
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4.5 2.5l4 3.5-4 3.5" /></svg>
          </div>
        )}
        {!hasChildren && (
          <div data-inspect="AddSubTaskButton" style={{ width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4a4a", opacity: 0.2, cursor: "pointer" }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Connecting Line (SVG) ──────────────────────────────────────

function ConnectingLine({ x, y1, y2 }) {
  return (
    <line data-inspect="ConnectingLine" x1={x} y1={y1} x2={x} y2={y2} stroke="#60a5fa" strokeWidth="1" opacity="0.25" />
  );
}

// ─── Tasks View ─────────────────────────────────────────────────

function TasksView() {
  return (
    <div data-inspect="NestedTodoApp" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header data-inspect="Header" style={{ padding: "24px 32px", borderBottom: "1px solid #222" }}>
        {/* Title row */}
        <div data-inspect="TitleBar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 data-inspect="DateHeading" style={{ fontSize: 14, fontWeight: 400, color: "#888", margin: 0 }}>
            Sunday, March 2, 2026
          </h1>
          <div data-inspect="AccentColorPicker" style={{ display: "flex", gap: 6 }}>
            {ACCENT_COLORS.map((c) => (
              <div key={c.name} data-inspect={`AccentSwatch.${c.name}`} style={{
                width: 14, height: 14, borderRadius: "50%", background: c.color, cursor: "pointer",
                border: c.name === "Blue" ? "2px solid rgba(255,255,255,0.3)" : "2px solid transparent",
                transition: "transform 0.15s, box-shadow 0.15s",
              }} />
            ))}
          </div>
        </div>

        {/* Note textarea */}
        <div data-inspect="NoteTextarea" style={{
          background: "#0a0a0a", border: "1px solid #222", borderRadius: 4,
          padding: "8px 12px", fontSize: 13, color: "#888", lineHeight: 1.6,
          maxWidth: 480, marginBottom: 16,
        }}>
          Ship the inspector page and finish drag-to-reorder for visions...
        </div>

        {/* Tab bar */}
        <div data-inspect="TabBar" style={{ display: "flex", gap: 2, borderBottom: "1px solid #222", paddingBottom: 0 }}>
          {SAMPLE_TABS.map((tab) => (
            <div key={tab.id} data-inspect={`Tab.${tab.name}`} style={{
              position: "relative", display: "flex", alignItems: "center",
            }}>
              <button data-inspect={tab.active ? "Tab.active" : "Tab.inactive"} style={{
                background: "transparent", border: "none",
                borderBottom: tab.active ? "2px solid #60a5fa" : "2px solid transparent",
                padding: "8px 14px", fontSize: 13,
                color: tab.active ? "#e0e0e0" : "#4a4a4a",
                cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s",
              }}>
                {tab.name}
              </button>
              {!tab.active && (
                <span data-inspect="TabCloseButton" style={{ fontSize: 12, color: "#4a4a4a", opacity: 0, padding: "0 4px", cursor: "pointer", position: "absolute", right: -2, top: 6 }}>×</span>
              )}
            </div>
          ))}
          <button data-inspect="NewTabButton" style={{ background: "transparent", border: "none", fontSize: 16, color: "#4a4a4a", cursor: "pointer", padding: "4px 10px", opacity: 0.5 }}>+</button>
        </div>
      </header>

      {/* Grid area */}
      <div data-inspect="GridContainer" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, minmax(340px, 440px))", gridAutoRows: "min-content", padding: "24px 0", position: "relative", overflowX: "auto" }}>

        {/* Connecting lines SVG */}
        <svg data-inspect="ConnectingLines" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <ConnectingLine x={370} y1={50} y2={130} />
          <ConnectingLine x={370} y1={130} y2={165} />
          <ConnectingLine x={370} y1={165} y2={200} />
          <ConnectingLine x={370} y1={280} y2={320} />
          <ConnectingLine x={370} y1={320} y2={355} />
          <ConnectingLine x={370} y1={355} y2={390} />
          {/* Cross-column lines for deeper nesting */}
          <line x1={740} y1={195} x2={740} y2={230} stroke="#60a5fa" strokeWidth="1" opacity="0.25" style={{ filter: "drop-shadow(0 0 4px rgba(96,165,250,0.3))" }} />
        </svg>

        {/* Column 1: Root items */}
        <div data-inspect="Column.0" style={{ gridColumn: 1 }}>
          <TodoItemRow task={SAMPLE_TASKS[0]} hasChildren expanded />
          <TodoItemRow task={SAMPLE_TASKS[1]} hasChildren expanded />
          <TodoItemRow task={SAMPLE_TASKS[2]} hasChildren={false} />
          <TodoItemRow task={SAMPLE_TASKS[3]} hasChildren expanded />
          <TodoItemRow task={SAMPLE_TASKS[4]} hasChildren={false} />
          <TodoItemRow task={SAMPLE_TASKS[5]} hasChildren={false} />
          <div data-inspect="AddItemButton" style={{ padding: "12px 16px" }}>
            <button style={{ background: "none", border: "1px solid #222", borderRadius: 4, padding: "4px 12px", fontSize: 12, color: "#4a4a4a", cursor: "pointer", fontFamily: "inherit" }}>+ Add item</button>
          </div>
        </div>

        {/* Column 2: Children of expanded items */}
        <div data-inspect="Column.1" style={{ gridColumn: 2 }}>
          {/* Children of task 1 */}
          <TodoItemRow task={SAMPLE_TASKS[0].children[0]} hasChildren={false} depth={1} />
          <TodoItemRow task={SAMPLE_TASKS[0].children[1]} hasChildren={false} depth={1} />
          <TodoItemRow task={SAMPLE_TASKS[0].children[2]} hasChildren expanded depth={1} />
          {/* Spacer */}
          <div style={{ height: 24 }} />
          {/* Children of task 2 */}
          <TodoItemRow task={SAMPLE_TASKS[1].children[0]} hasChildren={false} depth={1} />
          <TodoItemRow task={SAMPLE_TASKS[1].children[1]} hasChildren={false} depth={1} />
          <TodoItemRow task={SAMPLE_TASKS[1].children[2]} hasChildren={false} depth={1} />
          {/* Spacer */}
          <div style={{ height: 24 }} />
          {/* Children of task 4 */}
          <TodoItemRow task={SAMPLE_TASKS[3].children[0]} hasChildren={false} depth={1} />
          <TodoItemRow task={SAMPLE_TASKS[3].children[1]} hasChildren={false} depth={1} />
        </div>

        {/* Column 3: Grandchildren */}
        <div data-inspect="Column.2" style={{ gridColumn: 3 }}>
          {/* Position these to align with their parent (t1c) */}
          <div style={{ height: 64 }} />
          <TodoItemRow task={SAMPLE_TASKS[0].children[2].children[0]} hasChildren={false} depth={2} />
          <TodoItemRow task={SAMPLE_TASKS[0].children[2].children[1]} hasChildren={false} depth={2} />
        </div>
      </div>

      {/* Undo toast (sample) */}
      <div data-inspect="UndoToast" style={{
        position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)",
        background: "rgba(20,20,20,0.9)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
        padding: "8px 16px", display: "flex", alignItems: "center", gap: 12,
        fontSize: 13, color: "#888",
      }}>
        <span>Deleted &quot;Old task&quot;</span>
        <button data-inspect="UndoButton" style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500 }}>Undo</button>
      </div>

      {/* Keyboard hints */}
      <div data-inspect="KeyboardHints" style={{
        position: "fixed", bottom: 12, right: 16, fontSize: 11, color: "#333",
        fontFamily: "'SF Mono', monospace",
      }}>
        Arrow keys to navigate · Tab to indent · Enter to add
      </div>
    </div>
  );
}

// ─── Event Card ─────────────────────────────────────────────────

function EventCard({ event, isSelected, onClick }) {
  const color = CATEGORY_COLORS[event.category];
  return (
    <div data-inspect="EventCard" onClick={onClick} style={{
      background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
      backdropFilter: "blur(18px) saturate(160%)",
      border: isSelected ? `1px solid ${color}33` : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 6, padding: "11px 14px", cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div data-inspect="CategoryDot" style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
          <span data-inspect="CategoryLabel" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color }}>{event.category}</span>
        </div>
        <span data-inspect="TimeLabel" style={{ fontSize: 11, color: "#4a4a4a" }}>{event.time}</span>
      </div>
      <p data-inspect="EventDescription" style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>{event.description}</p>
      {event.hasLink && <span data-inspect="EventLink" style={{ fontSize: 11, color: "#60a5fa", marginTop: 4, display: "inline-block", opacity: 0.8 }}>example.com/link...</span>}
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────

function FilterBar() {
  const cats = ["milestone", "learned", "built", "published"];
  return (
    <div data-inspect="FilterBar" style={{ borderBottom: "1px solid #222", padding: "10px 32px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 10, color: "#4a4a4a", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 2 }}>Category</span>
        {cats.map((cat) => (
          <button key={cat} data-inspect={`FilterPill.${cat}`} style={{
            background: "transparent", border: "1px solid #222", borderRadius: 12, padding: "2px 10px",
            fontSize: 11, color: "#4a4a4a", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
            letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: CATEGORY_COLORS[cat], opacity: 0.5 }} />{cat}
          </button>
        ))}
      </div>
      <div style={{ width: 1, height: 16, background: "#222" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 10, color: "#4a4a4a", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 2 }}>Vision</span>
        <button data-inspect="FilterPill.vision" style={{
          background: "transparent", border: "1px solid #222", borderRadius: 12, padding: "2px 10px",
          fontSize: 11, color: "#4a4a4a", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="10" height="10" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.5 }}><path d="M9 3C5 3 2 9 2 9s3 6 7 6 7-6 7-6-3-6-7-6Z" /><circle cx="9" cy="9" r="2.5" /></svg>
          Knowledge OS
        </button>
      </div>
    </div>
  );
}

// ─── Notes Panel ────────────────────────────────────────────────

function NotesPanel({ event }) {
  if (!event) return <div data-inspect="NotesPanel.empty" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4a4a4a", fontSize: 13 }}>Select an event to view notes</div>;
  const color = CATEGORY_COLORS[event.category];
  return (
    <div data-inspect="NotesPanel" style={{ padding: "24px 32px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div data-inspect="NotesPanel.Header" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color }}>{event.category}</span>
            <span style={{ fontSize: 11, color: "#4a4a4a", marginLeft: 6 }}>{event.time}</span>
          </div>
          <button data-inspect="EditButton" style={{ background: "none", border: "1px solid #222", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "#4a4a4a", cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
        </div>
        <p style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.5, margin: 0 }}>{event.description}</p>
      </div>
      <div style={{ height: 1, background: "#222", marginBottom: 16 }} />
      <span style={{ fontSize: 11, color: "#4a4a4a", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Notes</span>
      <div data-inspect="NotesTextarea" style={{ flex: 1, background: "#0a0a0a", border: "1px solid #222", borderRadius: 4, padding: "10px 12px", fontSize: 13, color: "#888", lineHeight: 1.7 }}>
        This event marked a major milestone in the project...
      </div>
    </div>
  );
}

// ─── Vision Card ────────────────────────────────────────────────

function VisionCard({ vision }) {
  return (
    <div data-inspect="VisionCard" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(18px) saturate(160%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 16, transition: "border-color 0.15s, background 0.15s" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div data-inspect="DragHandle" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "4px 2px", opacity: 0.15, flexShrink: 0 }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="#4a4a4a"><circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" /><circle cx="2" cy="7" r="1.2" /><circle cx="6" cy="7" r="1.2" /><circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <h3 data-inspect="VisionTitle" style={{ fontFamily: "'Crimson Pro', 'Georgia', serif", fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.3, letterSpacing: 0 }}>{vision.title}</h3>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <span data-inspect="EditIcon" style={{ color: "#4a4a4a", fontSize: 12, padding: "2px 4px", opacity: 0.5, cursor: "pointer" }}>✎</span>
              <span data-inspect="DeleteIcon" style={{ color: "#ef4444", fontSize: 12, padding: "2px 4px", opacity: 0.4, cursor: "pointer" }}>×</span>
            </div>
          </div>
          {vision.description && <p data-inspect="VisionDescription" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "6px 0 0" }}>{vision.description}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Events View ────────────────────────────────────────────────

function EventsView() {
  const [selectedId, setSelectedId] = useState("e1");
  const selected = SAMPLE_EVENTS.find((e) => e.id === selectedId);
  return (
    <div data-inspect="EventsJournal" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <FilterBar />
      <div data-inspect="EventsContentRow" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div data-inspect="EventCardStack" style={{ width: 360, minWidth: 360, display: "flex", flexDirection: "column", borderRight: "1px solid #222", height: "100%", overflow: "hidden" }}>
          <div data-inspect="EventCardStack.Header" style={{ padding: "24px 32px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #222" }}>
            <span style={{ fontSize: 11, color: "#4a4a4a", letterSpacing: "0.07em", textTransform: "uppercase" }}>Events</span>
            <button data-inspect="NewEventButton" style={{ background: "none", border: "1px solid #222", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>+ New</button>
          </div>
          <div data-inspect="EventCardList" style={{ flex: 1, overflowY: "auto", padding: "12px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
            {SAMPLE_EVENTS.map((event) => <EventCard key={event.id} event={event} isSelected={selectedId === event.id} onClick={() => setSelectedId(event.id)} />)}
          </div>
        </div>
        <div data-inspect="NotesPanelContainer" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <NotesPanel event={selected} />
        </div>
      </div>
    </div>
  );
}

// ─── Visions View ───────────────────────────────────────────────

function VisionsView() {
  return (
    <div data-inspect="VisionShelf" style={{ padding: "24px 32px", maxWidth: 420 }}>
      <div data-inspect="VisionShelf.Header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: "#4a4a4a", letterSpacing: "0.07em", textTransform: "uppercase" }}>Visions</span>
        <button data-inspect="AddVisionButton" style={{ background: "none", border: "1px solid #222", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>+ Add Vision</button>
      </div>
      <div data-inspect="VisionList" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SAMPLE_VISIONS.map((v) => <VisionCard key={v.id} vision={v} />)}
      </div>
    </div>
  );
}

// ─── App Selector Tabs ──────────────────────────────────────────

function AppTabs({ activeApp, onAppChange }) {
  const apps = [
    { id: "tasks", label: "Nested Tasks" },
    { id: "events", label: "Events Journal" },
    { id: "visions", label: "Vision Shelf" },
  ];
  return (
    <div style={{
      position: "fixed", top: 12, right: 16, display: "flex", gap: 4, zIndex: 10001,
      background: "rgba(20,20,20,0.9)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 4,
    }}>
      {apps.map((app) => (
        <button key={app.id} onClick={() => onAppChange(app.id)} style={{
          background: activeApp === app.id ? "rgba(96,165,250,0.15)" : "transparent",
          border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12,
          color: activeApp === app.id ? "#60a5fa" : "#4a4a4a",
          cursor: "pointer", fontFamily: "inherit", fontWeight: activeApp === app.id ? 500 : 400, transition: "all 0.15s",
        }}>{app.label}</button>
      ))}
    </div>
  );
}

// ─── Main Inspector ─────────────────────────────────────────────

export default function SongOSInspector() {
  const [activeApp, setActiveApp] = useState("tasks");
  const { hovered, containerRef, handleMouseMove } = useInspector();

  return (
    <div style={{
      background: "#0a0a0a", color: "#e0e0e0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      height: "100vh", width: "100%", overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@200;300;400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>

      <AppTabs activeApp={activeApp} onAppChange={setActiveApp} />

      <div ref={containerRef} onMouseMove={handleMouseMove} style={{ display: "flex", height: "100%", position: "relative", overflow: "hidden" }}>
        <InspectorOverlay hovered={hovered} />
        <LeftNav activeApp={activeApp} onAppChange={setActiveApp} />
        <div data-inspect="MainContent" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {activeApp === "tasks" && <TasksView />}
          {activeApp === "events" && <EventsView />}
          {activeApp === "visions" && <VisionsView />}
        </div>
      </div>

      {/* Bottom info bar */}
      <div style={{
        position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
        background: "rgba(20,20,20,0.9)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
        padding: "8px 16px", zIndex: 10001,
        fontSize: 11, color: "#4a4a4a", fontFamily: "'SF Mono', 'Fira Code', monospace",
      }}>
        {hovered ? (
          <span>
            <span style={{ color: "#60a5fa", fontWeight: 600 }}>{hovered.name}</span>
            <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
            {Math.round(hovered.rect.width)} × {Math.round(hovered.rect.height)}px
          </span>
        ) : (
          <span>Hover over any element to inspect</span>
        )}
      </div>
    </div>
  );
}
