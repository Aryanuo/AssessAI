import React from "react";

export function Badge({
  children,
  variant = "default", // "default" | "success" | "warning" | "danger" | "info" | "primary" | "outline"
  size = "md", // "sm" | "md"
  className = "",
  style = {},
  ...props
}) {
  const variantStyles = {
    default: {
      backgroundColor: "var(--slate-100)",
      color: "var(--slate-700)",
      border: "1px solid var(--slate-200)"
    },
    primary: {
      backgroundColor: "var(--primary-50)",
      color: "var(--primary-700)",
      border: "1px solid var(--primary-200)"
    },
    success: {
      backgroundColor: "var(--success-50)",
      color: "var(--success-700)",
      border: "1px solid var(--success-100)"
    },
    warning: {
      backgroundColor: "var(--warning-50)",
      color: "var(--warning-700)",
      border: "1px solid var(--warning-100)"
    },
    danger: {
      backgroundColor: "var(--danger-50)",
      color: "var(--danger-700)",
      border: "1px solid var(--danger-100)"
    },
    info: {
      backgroundColor: "var(--info-50)",
      color: "var(--info-700)",
      border: "1px solid var(--info-100)"
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--slate-600)",
      border: "1px solid var(--slate-300)"
    }
  };

  const sizeStyles = {
    sm: {
      fontSize: "0.6875rem",
      padding: "0.125rem 0.5rem",
      borderRadius: "var(--radius-full)",
      fontWeight: 600
    },
    md: {
      fontSize: "0.75rem",
      padding: "0.25rem 0.625rem",
      borderRadius: "var(--radius-full)",
      fontWeight: 600
    }
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        lineHeight: 1.2,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </span>
  );
}
