"use client";

import React, { useState } from "react";

export type ButtonVariant = "purple" | "orange" | "blue" | "gray" | "red";

const VARIANTS: Record<
  ButtonVariant,
  {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    color: string;
    colorHover: string;
    shadow?: string;
    shadowHover?: string;
  }
> = {
  purple: {
    bg: "rgba(139, 92, 246, 0.15)",
    bgHover: "rgba(139, 92, 246, 0.25)",
    border: "rgba(139, 92, 246, 0.2)",
    borderHover: "rgba(139, 92, 246, 0.35)",
    color: "rgba(200, 180, 255, 0.9)",
    colorHover: "rgba(220, 200, 255, 1)",
    shadow: "0 0 20px rgba(139, 92, 246, 0.08)",
    shadowHover: "0 0 24px rgba(139, 92, 246, 0.2)",
  },
  orange: {
    bg: "rgba(255, 170, 68, 0.15)",
    bgHover: "rgba(255, 170, 68, 0.25)",
    border: "rgba(255, 170, 68, 0.2)",
    borderHover: "rgba(255, 170, 68, 0.35)",
    color: "rgba(255, 200, 130, 0.9)",
    colorHover: "rgba(255, 215, 150, 1)",
    shadowHover: "0 0 24px rgba(255, 170, 68, 0.15)",
  },
  blue: {
    bg: "rgba(100, 180, 255, 0.15)",
    bgHover: "rgba(100, 180, 255, 0.25)",
    border: "rgba(100, 180, 255, 0.2)",
    borderHover: "rgba(100, 180, 255, 0.35)",
    color: "rgba(160, 210, 255, 0.9)",
    colorHover: "rgba(180, 225, 255, 1)",
    shadowHover: "0 0 24px rgba(100, 180, 255, 0.15)",
  },
  gray: {
    bg: "rgba(255, 255, 255, 0.03)",
    bgHover: "rgba(255, 255, 255, 0.08)",
    border: "rgba(255, 255, 255, 0.05)",
    borderHover: "rgba(255, 255, 255, 0.12)",
    color: "rgba(255, 255, 255, 0.4)",
    colorHover: "rgba(255, 255, 255, 0.7)",
  },
  red: {
    bg: "rgba(255, 60, 60, 0.1)",
    bgHover: "rgba(255, 60, 60, 0.2)",
    border: "rgba(255, 60, 60, 0.15)",
    borderHover: "rgba(255, 60, 60, 0.3)",
    color: "rgba(255, 140, 140, 0.9)",
    colorHover: "rgba(255, 170, 170, 1)",
    shadowHover: "0 0 24px rgba(255, 60, 60, 0.12)",
  },
};

export default function ShrineButton({
  variant,
  className = "",
  style,
  children,
  disabled,
  ...props
}: { variant: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [hovered, setHovered] = useState(false);
  const v = VARIANTS[variant];
  const active = hovered && !disabled;

  return (
    <button
      className={`text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      style={{
        borderRadius: 4,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 12,
        paddingRight: 12,
        background: active ? v.bgHover : v.bg,
        border: `1px solid ${active ? v.borderHover : v.border}`,
        color: active ? v.colorHover : v.color,
        boxShadow: active ? v.shadowHover : v.shadow,
        ...style,
      }}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {children}
    </button>
  );
}
