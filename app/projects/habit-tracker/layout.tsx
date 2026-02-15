import type { Metadata } from "next";
import "./habit-tracker.css";

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Shared daily habit tracker",
};

export default function HabitTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
