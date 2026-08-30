import React from "react";

export function Button({
  children,
  variant = "primary", // "primary" | "secondary" | "outline" | "danger" | "ghost" | "success"
  size = "md", // "sm" | "md" | "lg"
  loading = false,
  disabled = false,
  className = "",
  style = {},
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles = {
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    borderRadius: "var(--radius-md)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    border: "1px solid transparent",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.65 : 1,
    transition: "all 0.15s ease",
    textDecoration: "none",
    boxSizing: "border-box",
    whiteSpace: "nowrap"
  };

  const sizeStyles = {
    sm: {
      fontSize: "0.8125rem",
      padding: "0.375rem 0.75rem",
      height: "32px"
    },
    md: {
      fontSize: "0.875rem",
      padding: "0.5rem 1rem",
      height: "38px"
    },
    lg: {
      fontSize: "1rem",
      padding: "0.625rem 1.25rem",
      height: "46px"
    }
  };

  const variantStyles = {
    primary: {
      backgroundColor: "var(--primary-600)",
      color: "#ffffff",
      boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
      borderColor: "var(--primary-600)"
    },
    secondary: {
      backgroundColor: "var(--slate-100)",
      color: "var(--slate-700)",
      borderColor: "var(--slate-200)"
    },
    outline: {
      backgroundColor: "#ffffff",
      color: "var(--slate-700)",
      borderColor: "var(--slate-300)"
    },
    danger: {
      backgroundColor: "var(--danger-600)",
      color: "#ffffff",
      borderColor: "var(--danger-600)"
    },
    success: {
      backgroundColor: "var(--success-600)",
      color: "#ffffff",
      borderColor: "var(--success-600)"
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--slate-600)",
      borderColor: "transparent"
    }
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      style={combinedStyles}
      onClick={onClick}
      className={className}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
            display: "inline-block"
          }}
        />
      )}
      {children}
    </button>
  );
}
