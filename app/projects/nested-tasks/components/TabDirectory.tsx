"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "../lib/types";
import { countAllItems, countCheckedItems } from "../lib/types";

interface TabDirectoryProps {
  tabs: Tab[];
  activeTabId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TabSummary {
  tab: Tab;
  totalItems: number;
  checkedItems: number;
  rootTasks: number;
}

export default function TabDirectory({
  tabs,
  activeTabId,
  isOpen,
  onClose,
  onSelectTab,
}: TabDirectoryProps) {
  const summaries: TabSummary[] = useMemo(
    () =>
      tabs.map((tab) => ({
        tab,
        totalItems: countAllItems(tab.todos),
        checkedItems: countCheckedItems(tab.todos),
        rootTasks: tab.todos.length,
      })),
    [tabs]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--nt-surface)",
              border: "1px solid var(--nt-border)",
              borderRadius: 12,
              padding: "20px 0",
              zIndex: 1001,
              width: "min(440px, 90vw)",
              maxHeight: "70vh",
              overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 20px 12px",
                borderBottom: "1px solid var(--nt-border)",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--nt-text-primary)",
                  letterSpacing: "0.02em",
                }}
              >
                All Task Trees
              </span>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--nt-text-muted)",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "2px 6px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* List */}
            <div style={{ padding: "0 8px" }}>
              {summaries.map(({ tab, totalItems, checkedItems, rootTasks }) => {
                const isActive = tab.id === activeTabId;
                // Filter out empty placeholder items from counts
                const meaningfulItems = totalItems - tab.todos.filter(t => t.text === "" && t.children.length === 0).length;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onSelectTab(tab.id);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      width: "100%",
                      padding: "10px 12px",
                      background: isActive
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                      border: "none",
                      borderLeft: isActive
                        ? "2px solid var(--nt-accent)"
                        : "2px solid transparent",
                      borderRadius: 6,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Title row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: isActive
                            ? "var(--nt-text-primary)"
                            : "var(--nt-text-secondary)",
                        }}
                      >
                        {tab.name}
                        {isActive && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--nt-accent)",
                              marginLeft: 8,
                              fontWeight: 400,
                            }}
                          >
                            active
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        fontSize: 11,
                        color: "var(--nt-text-muted)",
                      }}
                    >
                      <span>{formatDate(tab.createdAt)}</span>
                      {meaningfulItems > 0 && (
                        <>
                          <span>
                            {checkedItems}/{meaningfulItems} done
                          </span>
                          <span>
                            {rootTasks} root{rootTasks !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
