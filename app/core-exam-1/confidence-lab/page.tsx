import { notFound } from "next/navigation";
import { ConfidenceLab } from "../ConfidenceLab";
import "./lab.css";

// Temporary tuning sandbox for the confidence slider. Dev-only: hidden in
// production so it never ships as a real route.
export const metadata = { title: "Confidence slider — sandbox" };

export default function ConfidenceLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="ce-app">
      <ConfidenceLab />
    </div>
  );
}
