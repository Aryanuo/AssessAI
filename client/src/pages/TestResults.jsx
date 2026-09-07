import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getTestResults } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import { LoadingSpinner, EmptyState } from "../components/ui/Alert";
import { TestWorkspaceHeader } from "../components/layout/TestWorkspaceHeader";

function TestResults() {
  const { id } = useParams();

  const [test, setTest] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError("");
        const data = await getTestResults(id);
        setTest(data.test);
        setAnalytics(data.analytics);
        setAttempts(data.attempts || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load test results.");
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [id]);

  const filteredAttempts = useMemo(() => {
    if (!searchQuery.trim()) return attempts;
    const q = searchQuery.toLowerCase();
    return attempts.filter(
      (a) =>
        a.participant?.name?.toLowerCase().includes(q) ||
        a.participant?.email?.toLowerCase().includes(q) ||
        a.team?.team_name?.toLowerCase().includes(q) ||
        a.status?.toLowerCase().includes(q)
    );
  }, [attempts, searchQuery]);

  if (loading) {
    return <LoadingSpinner text="Aggregating assessment analytics & submissions..." />;
  }

  return (
    <div>
      <TestWorkspaceHeader test={test} activeStep="results" />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        {/* Top Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Performance Analytics & Candidate Submissions
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
            Review aggregate scores, passing averages, and inspect individual question responses and proctoring logs.
          </p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError("")} style={{ marginBottom: "1.5rem" }}>
            {error}
          </Alert>
        )}

        {/* ── Summary Analytics Stat Cards ── */}
        {analytics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem"
            }}
          >
            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-500)", textTransform: "uppercase" }}>
                  Total Attempts
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", marginTop: "0.25rem" }}>
                  {analytics.total_attempts}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success-600)", textTransform: "uppercase" }}>
                  Completed
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success-700)", marginTop: "0.25rem" }}>
                  {analytics.completed_attempts}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary-600)", textTransform: "uppercase" }}>
                  Avg. Score
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary-700)", marginTop: "0.25rem" }}>
                  {analytics.average_score} <span style={{ fontSize: "1rem", color: "var(--slate-400)", fontWeight: 500 }}>/ {analytics.max_possible_score}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary-600)", textTransform: "uppercase" }}>
                  Average %
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary-700)", marginTop: "0.25rem" }}>
                  {analytics.average_percentage}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success-600)", textTransform: "uppercase" }}>
                  Highest Score
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success-700)", marginTop: "0.25rem" }}>
                  {analytics.highest_score}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--danger-600)", textTransform: "uppercase" }}>
                  Lowest Score
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--danger-700)", marginTop: "0.25rem" }}>
                  {analytics.lowest_score}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Needs Review Alert */}
        {analytics?.needs_review_attempts > 0 && (
          <Alert variant="warning" style={{ marginBottom: "1.5rem" }}>
            ⚠️ <strong>{analytics.needs_review_attempts} candidate submission{analytics.needs_review_attempts > 1 ? "s" : ""} need review or re-evaluation</strong> due to Gemini AI traffic limits.
            Click <strong>"View Attempt"</strong> on any marked submission to review and re-evaluate pending questions.
          </Alert>
        )}

        {/* ── Attempts Table Card ── */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <CardTitle>Candidate Submissions ({attempts.length})</CardTitle>

              {attempts.length > 0 && (
                <input
                  type="text"
                  placeholder="🔍 Search candidate, email, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "280px", padding: "0.4rem 0.75rem", fontSize: "0.8125rem" }}
                />
              )}
            </div>
          </CardHeader>

          <CardContent style={{ padding: 0 }}>
            {attempts.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No attempts submitted yet"
                description="Once candidates join and submit their assessments, their scores, AI grading feedback, and proctoring metrics will appear here."
              />
            ) : filteredAttempts.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No matching attempts found"
                description={`No submissions match "${searchQuery}".`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                }
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>#</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Candidate</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Team</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Status</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Score</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Percentage</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)" }}>Submitted At</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-700)", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((att, idx) => {
                      const statusVariant =
                        att.status === "EVALUATED"
                          ? "success"
                          : att.status === "NEEDS_REVIEW"
                          ? "warning"
                          : att.status === "SUBMITTED"
                          ? "primary"
                          : att.status === "IN_PROGRESS"
                          ? "warning"
                          : "default";

                      return (
                        <tr
                          key={att.id}
                          style={{
                            borderBottom: "1px solid var(--slate-100)",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "var(--slate-50)"
                          }}
                        >
                          <td style={{ padding: "0.75rem 1rem", color: "var(--slate-400)", fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--slate-900)" }}>
                              {att.participant?.name || "Anonymous Candidate"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                              {att.participant?.email || "—"}
                            </div>
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            {att.team?.team_name ? (
                              <Badge variant="outline">{att.team.team_name}</Badge>
                            ) : (
                              <span style={{ color: "var(--slate-400)" }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            <Badge variant={statusVariant}>
                              {att.status === "NEEDS_REVIEW" ? "NEEDS REVIEW" : att.status}
                            </Badge>
                          </td>

                          <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--slate-900)" }}>
                            {att.score !== null && att.score !== undefined
                              ? `${att.score} / ${att.max_score}`
                              : "—"}
                            {att.status === "NEEDS_REVIEW" && (
                              <div style={{ fontSize: "0.6875rem", color: "var(--warning-700)", fontWeight: 600 }}>
                                (Partial)
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "0.75rem 1rem" }}>
                            {att.percentage !== null && att.percentage !== undefined ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div
                                  style={{
                                    width: "60px",
                                    height: "6px",
                                    backgroundColor: "var(--slate-200)",
                                    borderRadius: "var(--radius-full)",
                                    overflow: "hidden"
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.min(100, Math.max(0, att.percentage))}%`,
                                      height: "100%",
                                      backgroundColor:
                                        att.percentage >= 70
                                          ? "var(--success-500)"
                                          : att.percentage >= 40
                                          ? "var(--warning-500)"
                                          : "var(--danger-500)"
                                    }}
                                  />
                                </div>
                                <span style={{ fontWeight: 600 }}>{Number(att.percentage).toFixed(1)}%</span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--slate-400)" }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: "0.75rem 1rem", fontSize: "0.8125rem", color: "var(--slate-500)" }}>
                            {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : "In Progress"}
                          </td>

                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            {(att.status === "EVALUATED" || att.status === "SUBMITTED") && (
                              <Link to={`/tests/${id}/results/${att.id}`}>
                                <Button variant="outline" size="sm">
                                  Inspect →
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TestResults;
