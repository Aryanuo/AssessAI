import React from "react";

export function Alert({
  variant = "info", // "info" | "success" | "warning" | "error"
  title,
  children,
  onClose,
  className = "",
  style = {}
}) {
  const styles = {
    info: {
      bg: "var(--info-50)",
      border: "var(--info-100)",
      text: "var(--info-700)",
      icon: "ℹ️"
    },
    success: {
      bg: "var(--success-50)",
      border: "var(--success-100)",
      text: "var(--success-700)",
      icon: "✓"
    },
    warning: {
      bg: "var(--warning-50)",
      border: "var(--warning-100)",
      text: "var(--warning-700)",
      icon: "⚠️"
    },
    error: {
      bg: "var(--danger-50)",
      border: "var(--danger-100)",
      text: "var(--danger-700)",
      icon: "✕"
    }
  };

  const current = styles[variant] || styles.info;

  return (
    <div
      style={{
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: "var(--radius-md)",
        padding: "0.875rem 1.125rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        color: current.text,
        fontSize: "0.875rem",
        ...style
      }}
      className={className}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1 }}>{current.icon}</span>
      <div style={{ flexGrow: 1 }}>
        {title && <strong style={{ display: "block", marginBottom: "0.25rem" }}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "currentColor",
            opacity: 0.7,
            cursor: "pointer",
            padding: 0,
            fontSize: "1rem"
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

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
          width: sizeMap[size],
          height: sizeMap[size],
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
