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
  return (
    <>
      {/* Apply the saved theme before the Core Exam content paints, so a dark
          preference doesn't flash light on load. Default (no key) stays light. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('ce-theme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}",
        }}
      />
      {children}
    </>
  );
}
