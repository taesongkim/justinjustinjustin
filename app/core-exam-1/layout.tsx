import type { Metadata } from "next";
import "./core-exam.css";

export const metadata: Metadata = {
  title: "Core Exam 1",
  description: "Private collaborative Core Exam study space",
};

export default function CoreExamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
