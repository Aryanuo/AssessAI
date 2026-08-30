import React from "react";

export function Input({
  label,
  error,
  helperText,
  required = false,
  className = "",
  containerStyle = {},
  style = {},
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--slate-700)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}
        >
          {label}
          {required && <span style={{ color: "var(--danger-500)" }}>*</span>}
        </label>
      )}

      <input
        id={inputId}
        style={{
          width: "100%",
          borderColor: error ? "var(--danger-500)" : undefined,
          ...style
        }}
        className={className}
        {...props}
      />

      {error && (
        <span style={{ fontSize: "0.75rem", color: "var(--danger-600)", fontWeight: 500 }}>
          {error}
        </span>
      )}

      {helperText && !error && (
        <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  required = false,
  className = "",
  containerStyle = {},
  style = {},
  id,
  rows = 4,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--slate-700)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}
        >
          {label}
          {required && <span style={{ color: "var(--danger-500)" }}>*</span>}
        </label>
      )}

      <textarea
        id={inputId}
        rows={rows}
        style={{
          width: "100%",
          resize: "vertical",
          borderColor: error ? "var(--danger-500)" : undefined,
          ...style
        }}
        className={className}
        {...props}
      />

      {error && (
        <span style={{ fontSize: "0.75rem", color: "var(--danger-600)", fontWeight: 500 }}>
          {error}
        </span>
      )}

      {helperText && !error && (
        <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  helperText,
  required = false,
  children,
  className = "",
  containerStyle = {},
  style = {},
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--slate-700)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}
        >
          {label}
          {required && <span style={{ color: "var(--danger-500)" }}>*</span>}
        </label>
      )}

      <select
        id={inputId}
        style={{
          width: "100%",
          borderColor: error ? "var(--danger-500)" : undefined,
          ...style
        }}
        className={className}
        {...props}
      >
        {children}
      </select>

      {error && (
        <span style={{ fontSize: "0.75rem", color: "var(--danger-600)", fontWeight: 500 }}>
          {error}
        </span>
      )}

      {helperText && !error && (
        <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
          {helperText}
        </span>
      )}
    </div>
  );
}
