import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAttemptDetail, getAttemptViolations } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import { LoadingSpinner } from "../components/ui/Alert";

function AttemptDetail() {
  const { id: testId, attemptId } = useParams();

  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError("");

        const [detailData, violationsData] = await Promise.all([
          getAttemptDetail(testId, attemptId),
          getAttemptViolations(attemptId).catch(() => ({ violations: [] }))
        ]);

        setTest(detailData.test);
        setAttempt(detailData.attempt);
        setQuestions(detailData.questions || []);
        setViolations(violationsData.violations || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load attempt details.");
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [testId, attemptId]);

  if (loading) {
    return <LoadingSpinner text="Loading candidate attempt breakdown & grading rubrics..." />;
  }

  if (error) {
    return (
      <div style={{ maxWidth: "700px", margin: "4rem auto", padding: "1.5rem" }}>
        <Alert variant="error" title="Error Loading Attempt">{error}</Alert>
        <div style={{ marginTop: "1rem" }}>
          <Link to={`/tests/${testId}/results`}>
            <Button variant="outline">← Back to Results</Button>
          </Link>
        </div>
      </div>
    );
  }

  const participant = attempt?.participant;
  const team = attempt?.team;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          to={`/tests/${testId}/results`}
          style={{
            fontSize: "0.875rem",
            color: "var(--slate-500)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontWeight: 500
          }}
        >
          ← Back to Results List
        </Link>

        <span style={{ fontSize: "0.8125rem", color: "var(--slate-400)" }}>
          Attempt ID: <code style={{ fontFamily: "var(--font-mono)" }}>{attemptId.slice(0, 8)}</code>
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--slate-900)" }}>
          Submission Breakdown: {participant?.name || "Candidate"}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
          Assessment: <strong>{test?.title}</strong>
        </p>
      </div>

      {/* Candidate Overview Card */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <CardContent style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-400)", textTransform: "uppercase" }}>
                Candidate Info
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--slate-900)", marginTop: "0.25rem" }}>
                {participant?.name || "Anonymous Candidate"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginTop: "0.125rem" }}>
                {participant?.email || "No email registered"}
              </div>
              {team && (
                <div style={{ marginTop: "0.5rem" }}>
                  <Badge variant="primary">Team: {team.team_name} ({team.team_code})</Badge>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-400)", textTransform: "uppercase" }}>
                Score & Status
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", marginTop: "0.25rem" }}>
                {attempt?.score !== null ? `${attempt.score} / ${attempt.max_score}` : "—"}
                {attempt?.percentage !== null && (
                  <span style={{ fontSize: "1rem", color: "var(--slate-500)", fontWeight: 600, marginLeft: "0.5rem" }}>
                    ({Number(attempt.percentage).toFixed(1)}%)
                  </span>
                )}
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                <Badge variant={attempt?.status === "EVALUATED" ? "success" : "primary"}>
                  {attempt?.status}
                </Badge>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-400)", textTransform: "uppercase" }}>
                Assessment Timing
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--slate-700)", marginTop: "0.375rem" }}>
                <strong>Started:</strong> {attempt?.started_at ? new Date(attempt.started_at).toLocaleTimeString() : "—"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--slate-700)", marginTop: "0.25rem" }}>
                <strong>Submitted:</strong> {attempt?.submitted_at ? new Date(attempt.submitted_at).toLocaleTimeString() : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Cheat Proctoring Log Card */}
      {violations.length > 0 ? (
        <Alert
          variant="warning"
          title={`⚠️ Anti-Cheat Violations Log (${violations.length} Events)`}
          style={{ marginBottom: "2rem" }}
        >
          <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
            The following candidate actions were recorded during assessment execution:
          </p>
          <ul style={{ margin: "0 0 0 1.25rem", padding: 0, fontSize: "0.8125rem" }}>
            {violations.map((v, i) => (
              <li key={v.id || i} style={{ marginBottom: "0.25rem" }}>
                <strong>{v.type.replace(/_/g, " ")}</strong> — recorded at{" "}
                {new Date(v.recorded_at).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert variant="success" style={{ marginBottom: "2rem" }}>
          ✓ Proctoring Clean: No browser infractions (tab switching, window blur, or fullscreen exits) detected during this attempt.
        </Alert>
      )}

      {/* Questions Breakdown List */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "1rem" }}>
        Question-by-Question Grading ({questions.length} Items)
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {questions.map((q, idx) => {
          const isFull = Number(q.awarded_score) === Number(q.max_score) && Number(q.max_score) > 0;
          const isZero = Number(q.awarded_score) <= 0;

          return (
            <Card key={q.question_id || idx}>
              {/* Question Header */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  backgroundColor: "var(--slate-50)",
                  borderBottom: "1px solid var(--slate-200)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--slate-900)" }}>
                    #{q.question_order || idx + 1}
                  </span>
                  <Badge variant="primary">{q.type}</Badge>
                  {q.difficulty && <Badge variant="outline">{q.difficulty}</Badge>}
                  {q.topic && <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>• {q.topic}</span>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {q.time_spent_seconds > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--slate-400)" }}>
                      ⏱ {q.time_spent_seconds}s
                    </span>
                  )}

                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "1rem",
                      color: isFull ? "var(--success-700)" : isZero ? "var(--danger-700)" : "var(--warning-700)"
                    }}
                  >
                    Score: {q.awarded_score} / {q.max_score}
                  </span>
                </div>
              </div>

              <CardContent style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Question Prompt */}
                <p style={{ fontSize: "0.9375rem", color: "var(--slate-800)", lineHeight: 1.5, fontWeight: 500 }}>
                  {q.question_text}
                </p>

                {/* MCQ / True-False Options */}
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {q.options.map((opt, oIdx) => {
                      const optLabel = opt.label || String.fromCharCode(65 + oIdx);
                      const isSelected = String(q.student_answer).toUpperCase() === optLabel.toUpperCase();
                      const isCorrect = String(q.correct_answer).toUpperCase() === optLabel.toUpperCase();

                      let optBg = "#ffffff";
                      let optBorder = "var(--slate-200)";
                      let badgeText = null;

                      if (isSelected && isCorrect) {
                        optBg = "var(--success-50)";
                        optBorder = "var(--success-500)";
                        badgeText = "✓ Candidate Selection (Correct)";
                      } else if (isSelected && !isCorrect) {
                        optBg = "var(--danger-50)";
                        optBorder = "var(--danger-500)";
                        badgeText = "✗ Candidate Selection (Incorrect)";
                      } else if (isCorrect) {
                        optBg = "var(--success-50)";
                        optBorder = "var(--success-200)";
                        badgeText = "✓ Correct Key";
                      }

                      return (
                        <div
                          key={oIdx}
                          style={{
                            padding: "0.625rem 1rem",
                            borderRadius: "var(--radius-md)",
                            border: `1px solid ${optBorder}`,
                            backgroundColor: optBg,
                            fontSize: "0.875rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <strong style={{ marginRight: "0.375rem" }}>{optLabel}.</strong>
                            <span>{opt.text || opt}</span>
                          </div>

                          {badgeText && (
                            <Badge variant={isSelected && isCorrect ? "success" : isSelected ? "danger" : "success"} size="sm">
                              {badgeText}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subjective Responses (Short / Long Answer) */}
                {q.type !== "MCQ" && q.type !== "TRUE_FALSE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div
                      style={{
                        backgroundColor: "var(--slate-50)",
                        border: "1px solid var(--slate-200)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.875rem 1rem"
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-600)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                        Candidate Answer
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--slate-900)", whiteSpace: "pre-wrap" }}>
                        {q.student_answer || "(No response submitted)"}
                      </p>
                    </div>

                    {q.expected_answer && (
                      <div
                        style={{
                          backgroundColor: "var(--success-50)",
                          border: "1px solid var(--success-100)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.875rem 1rem"
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--success-700)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                          Reference Model Answer
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--success-900)", whiteSpace: "pre-wrap" }}>
                          {q.expected_answer}
                        </p>
                      </div>
                    )}

                    {q.rubric && (
                      <div
                        style={{
                          backgroundColor: "var(--info-50)",
                          border: "1px solid var(--info-100)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.75rem 1rem"
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--info-700)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                          Grading Rubric
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--info-900)" }}>{q.rubric}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Gemini AI Feedback */}
                {q.feedback && (
                  <div
                    style={{
                      padding: "0.875rem 1rem",
                      backgroundColor: "var(--primary-50)",
                      borderLeft: "3px solid var(--primary-600)",
                      borderRadius: "0 var(--radius-md) var(--radius-md) 0"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.8125rem", color: "var(--primary-900)" }}>
                        ⚡ AI Evaluation Feedback
                      </strong>
                      {q.ai_confidence && (
                        <span style={{ fontSize: "0.75rem", color: "var(--primary-600)" }}>
                          Confidence: {q.ai_confidence}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--primary-800)", margin: 0 }}>
                      {q.feedback}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default AttemptDetail;
