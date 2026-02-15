"use client";

import HabitTracker from "./components/HabitTracker";
import ThemeToggle from "./components/ThemeToggle";

export default function HabitTrackerPage() {
  return (
    <div className="ht-root">
      <HabitTracker />
      <ThemeToggle />
    </div>
  );
}
