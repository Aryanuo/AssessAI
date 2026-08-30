import React from "react";

export function EmptyState({
  icon = "📋",
  title,
  description,
  action
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3.5rem 1.5rem",
        backgroundColor: "#ffffff",
        border: "1px dashed var(--slate-300)",
        borderRadius: "var(--radius-xl)"
      }}
    >
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{icon}</div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.375rem" }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", maxWidth: "380px", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
