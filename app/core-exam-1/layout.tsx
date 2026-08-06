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
      {/* Apply the theme before the Core Exam content paints, so it never
          flashes the wrong mode on load. Dark is the default — it applies
          unless the user has explicitly chosen light (stored 'ce-theme'). */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('ce-theme')!=='light')document.documentElement.setAttribute('data-theme','dark');}catch(e){}",
        }}
      />
      {children}
    </>
  );
}
