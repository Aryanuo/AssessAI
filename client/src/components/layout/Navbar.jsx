import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <nav
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid var(--slate-200)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            to="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--slate-900)",
              fontWeight: 800,
              fontSize: "1.125rem",
              letterSpacing: "-0.02em"
            }}
          >
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--primary-600), var(--primary-800))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "1rem"
              }}
            >
              ⚡
            </span>
            AssessAI
          </Link>

          {/* Navigation Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              to="/dashboard"
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: location.pathname === "/dashboard" ? "var(--primary-600)" : "var(--slate-600)",
                backgroundColor: location.pathname === "/dashboard" ? "var(--primary-50)" : "transparent",
                textDecoration: "none"
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/tests/create">
            <Button variant="primary" size="sm">
              + Create Assessment
            </Button>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              paddingLeft: "0.75rem",
              borderLeft: "1px solid var(--slate-200)"
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--slate-800)" }}>
                {user?.user_metadata?.name || user?.email?.split("@")[0]}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--slate-400)" }}>
                {user?.email}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={logout} style={{ color: "var(--slate-500)" }}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
