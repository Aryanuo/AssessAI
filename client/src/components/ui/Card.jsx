import React from "react";

export function Card({ children, className = "", style = {}, ...props }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--slate-200)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", style = {}, ...props }) {
  return (
    <div
      style={{
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid var(--slate-100)",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", style = {}, ...props }) {
  return (
    <h3
      style={{
        fontSize: "1.125rem",
        fontWeight: 700,
        color: "var(--slate-900)",
        margin: 0,
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", style = {}, ...props }) {
  return (
    <p
      style={{
        fontSize: "0.875rem",
        color: "var(--slate-500)",
        margin: 0,
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", style = {}, ...props }) {
  return (
    <div
      style={{
        padding: "1.5rem",
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", style = {}, ...props }) {
  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderTop: "1px solid var(--slate-100)",
        backgroundColor: "var(--slate-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
