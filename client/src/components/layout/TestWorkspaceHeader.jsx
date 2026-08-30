import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "../ui/Badge";

export function TestWorkspaceHeader({ test, activeStep = "overview" }) {
  if (!test) return null;

  const testId = test.id;
  const status = test.status || "DRAFT";

  const steps = [
    {
      id: "overview",
      label: "1. Overview & Docs",
      path: `/tests/${testId}`,
      active: activeStep === "overview"
    },
    {
      id: "questions",
      label: "2. Review Questions",
      path: `/tests/${testId}/questions`,
      active: activeStep === "questions"
    },
    {
      id: "configure",
      label: "3. Configure",
      path: `/tests/${testId}/configure`,
      active: activeStep === "configure"
    },
    {
      id: "results",
      label: "4. Results & Analytics",
      path: `/tests/${testId}/results`,
      active: activeStep === "results"
    }
  ];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid var(--slate-200)",
        padding: "1.25rem 0 0",
        marginBottom: "2rem"
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
        {/* Top Breadcrumb & Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              to="/dashboard"
              style={{
                fontSize: "0.8125rem",
                color: "var(--slate-500)",
                textDecoration: "none",
                fontWeight: 500
              }}
            >
              ← Dashboard
            </Link>
            <span style={{ color: "var(--slate-300)" }}>/</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--slate-700)", fontWeight: 600 }}>
              {test.title || "Assessment Workspace"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Badge variant={status === "PUBLISHED" ? "success" : "default"}>
              {status === "PUBLISHED" ? "● PUBLISHED & LIVE" : "○ DRAFT"}
            </Badge>

            {test.test_code && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "var(--slate-100)",
                  color: "var(--slate-700)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--slate-200)"
                }}
              >
                Code: {test.test_code}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "1.5rem", color: "var(--slate-900)", marginBottom: "1.25rem" }}>
          {test.title || "Untitled Assessment"}
        </h1>

        {/* 4-Step Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            borderBottom: "1px solid transparent",
            overflowX: "auto"
          }}
        >
          {steps.map((step) => (
            <Link
              key={step.id}
              to={step.path}
              style={{
                padding: "0.625rem 0",
                fontSize: "0.875rem",
                fontWeight: step.active ? 700 : 500,
                color: step.active ? "var(--primary-600)" : "var(--slate-500)",
                borderBottom: step.active ? "2px solid var(--primary-600)" : "2px solid transparent",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
            >
              {step.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
