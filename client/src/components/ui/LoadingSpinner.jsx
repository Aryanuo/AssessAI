import React from "react";

export function LoadingSpinner({ text = "Loading...", size = "md" }) {
  const sizeMap = {
    sm: "16px",
    md: "28px",
    lg: "40px"
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2.5rem",
        color: "var(--slate-500)"
      }}
    >
      <div
        style={{
          width: sizeMap[size] || sizeMap.md,
          height: sizeMap[size] || sizeMap.md,
          border: "3px solid var(--slate-200)",
          borderTopColor: "var(--primary-600)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }}
      />
      {text && <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
