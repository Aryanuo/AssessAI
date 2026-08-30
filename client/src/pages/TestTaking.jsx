import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAttemptQuestions, saveAnswer, submitAttempt, recordViolation } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import { LoadingSpinner } from "../components/ui/Alert";

function getQuestionTimeLimit(question, timingRules) {
  if (!question || !Array.isArray(timingRules) || timingRules.length === 0) {
    return null;
  }

  const qType = String(question.type || "").toUpperCase();
  const qDiff = String(question.difficulty || "").toUpperCase();

  // 1. Exact match on question type AND difficulty (e.g. MCQ + EASY)
  const exactMatch = timingRules.find(
    (r) =>
      String(r.type || "").toUpperCase() === qType &&
      String(r.difficulty || "").toUpperCase() === qDiff
  );
  if (exactMatch && Number(exactMatch.seconds) > 0) {
    return Number(exactMatch.seconds);
  }

  // 2. Match on question type alone (fallback)
  const typeMatch = timingRules.find(
    (r) => String(r.type || "").toUpperCase() === qType
  );
  if (typeMatch && Number(typeMatch.seconds) > 0) {
    return Number(typeMatch.seconds);
  }

  return null;
}

export default function TestTaking() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [configuration, setConfiguration] = useState({});

  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saved", "Saving...", "Error"
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Overall Test Countdown Timer (seconds)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);

  // Per-Question Persistent Remaining Times: { [questionId]: secondsRemaining }
  const [questionTimes, setQuestionTimes] = useState({});

  // Anti-Cheat & Fullscreen Monitoring States
  const [violationsCount, setViolationsCount] = useState(0);
  const [violationWarning, setViolationWarning] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnteredFullscreenOnce, setHasEnteredFullscreenOnce] = useState(false);

  // Retrieve participant session
  const session = JSON.parse(sessionStorage.getItem("active_assessment_session") || "{}");
  const participantId = session.participant?.id;

  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const hasStartedRef = useRef(false);

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submitting || isSubmitted) return;

    if (!isAuto) {
      const answeredCount = Object.values(answers).filter(
        (a) => a !== null && a !== undefined && a !== ""
      ).length;
      const totalCount = questions.length;
      const unanswered = totalCount - answeredCount;

      const msg = unanswered > 0
        ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit now?`
        : "Are you sure you want to submit your assessment?";

      if (!window.confirm(msg)) return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitAttempt(attemptId, { participantId });
      setIsSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, participantId, submitting, isSubmitted, answers, questions.length]);

  // Handle anti-cheat violation reporting
  const handleViolation = useCallback(async (type, details = {}) => {
    if (isSubmitted || loading || !hasStartedRef.current) return;

    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2000) return;
    lastViolationTimeRef.current = now;

    try {
      const res = await recordViolation(attemptId, { type, details });
      const currentCount = res?.violation_count || violationsCount + 1;
      const maxLimit = res?.violation_limit || configuration.violation_limit || 3;

      setViolationsCount(currentCount);

      if (res?.limit_exceeded || currentCount >= maxLimit) {
        setViolationWarning({
          title: "Violation Limit Exceeded",
          message: `You have exceeded the maximum allowed proctoring violations (${currentCount}/${maxLimit}). Your assessment is being submitted automatically.`,
          isFatal: true
        });
        setTimeout(() => handleSubmit(true), 2500);
      } else {
        setViolationWarning({
          title: `Proctoring Alert: ${type.replace(/_/g, " ")}`,
          message: `Leaving or exiting the assessment window is strictly monitored. Violation ${currentCount} of ${maxLimit}.`,
          isFatal: false
        });
      }
    } catch (err) {
      console.warn("Failed to report violation:", err);
    }
  }, [attemptId, isSubmitted, loading, violationsCount, configuration.violation_limit, handleSubmit]);

  useEffect(() => {
    if (!participantId) {
      setError("No active participant session found. Please join from the assessment link.");
      setLoading(false);
      return;
    }

    async function loadAttemptData() {
      try {
        setLoading(true);
        setError("");

        const data = await getAttemptQuestions(attemptId, participantId);
        setAttempt(data.attempt);
        const qs = data.questions || [];
        setQuestions(qs);
        const cfg = data.configuration || {};
        setConfiguration(cfg);

        // Initialize persistent per-question time limits map
        const initialTimes = {};
        qs.forEach((q) => {
          const limit = getQuestionTimeLimit(q, cfg.timing_rules);
          if (limit !== null) {
            initialTimes[q.id] = limit;
          }
        });
        setQuestionTimes(initialTimes);

        // Check if already in fullscreen or not required
        const inFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );
        setIsFullscreen(inFullscreen);

        if (!cfg.fullscreen_required || inFullscreen) {
          setHasEnteredFullscreenOnce(true);
          hasStartedRef.current = true;
        }

        // Format saved answers
        const loadedAnswers = {};
        Object.entries(data.saved_answers || {}).forEach(([qId, val]) => {
          loadedAnswers[qId] = val.answer;
        });
        setAnswers(loadedAnswers);

        if (data.attempt.status === "SUBMITTED" || data.attempt.status === "EVALUATED") {
          setIsSubmitted(true);
          return;
        }

        // Initialize overall countdown timer
        if (data.attempt.expires_at) {
          const now = new Date(data.attempt.server_time || Date.now()).getTime();
          const expires = new Date(data.attempt.expires_at).getTime();
          const remaining = Math.max(0, Math.floor((expires - now) / 1000));
          setTimeLeftSeconds(remaining);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load test questions");
      } finally {
        setLoading(false);
      }
    }

    loadAttemptData();
  }, [attemptId, participantId]);

  // Anti-cheat event listeners setup
  useEffect(() => {
    if (loading || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && hasStartedRef.current) {
        handleViolation("TAB_SWITCH", { timestamp: new Date().toISOString() });
      }
    };

    const handleWindowBlur = () => {
      if (hasStartedRef.current) {
        handleViolation("WINDOW_BLUR", { timestamp: new Date().toISOString() });
      }
    };

    const handleFullscreenChange = () => {
      const inFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(inFullscreen);

      if (configuration.fullscreen_required && hasStartedRef.current && !inFullscreen) {
        handleViolation("FULLSCREEN_EXIT", { timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [loading, isSubmitted, configuration.fullscreen_required, handleViolation]);

  // Overall Test Countdown timer tick
  useEffect(() => {
    if (timeLeftSeconds === null || isSubmitted || (!hasEnteredFullscreenOnce && configuration.fullscreen_required)) return;

    if (timeLeftSeconds <= 0) {
      handleSubmit(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeftSeconds, isSubmitted, hasEnteredFullscreenOnce, configuration.fullscreen_required, handleSubmit]);

  // ──── Per-Question Persistent Countdown Timer Tick ────
  useEffect(() => {
    if (
      loading ||
      isSubmitted ||
      questions.length === 0 ||
      (!hasEnteredFullscreenOnce && configuration.fullscreen_required)
    ) {
      return;
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const remaining = questionTimes[currentQ.id];

    if (remaining === undefined || remaining <= 0) {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      return;
    }

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setQuestionTimes((prev) => {
        const currentSecs = prev[currentQ.id];
        if (currentSecs === undefined) return prev;

        if (currentSecs <= 1) {
          clearInterval(questionTimerRef.current);

          if (currentIndex < questions.length - 1) {
            setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1));
          } else {
            handleSubmit(true);
          }
          return { ...prev, [currentQ.id]: 0 };
        }

        return { ...prev, [currentQ.id]: currentSecs - 1 };
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [
    currentIndex,
    questions,
    questionTimes,
    hasEnteredFullscreenOnce,
    configuration.fullscreen_required,
    isSubmitted,
    loading,
    handleSubmit
  ]);

  async function handleAnswerSelect(questionId, value) {
    if (isSubmitted) return;

    if (questionTimes[questionId] !== undefined && questionTimes[questionId] <= 0) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaveStatus("Saving...");

    try {
      await saveAnswer(attemptId, {
        questionId,
        answer: value,
        participantId,
        timeSpentSeconds: 0
      });
      setSaveStatus("Saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("Error saving");
    }
  }

  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function requestFullscreenAndStart() {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setHasEnteredFullscreenOnce(true);
      hasStartedRef.current = true;
      setViolationWarning(null);
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      setHasEnteredFullscreenOnce(true);
      hasStartedRef.current = true;
    }
  }

  if (loading) {
    return <LoadingSpinner text="Initializing secure assessment session..." />;
  }

  if (error && !attempt) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "1.5rem" }}>
        <Alert variant="error" title="Session Error">{error}</Alert>
        <div style={{ marginTop: "1rem" }}>
          <Link to="/join">
            <Button variant="outline">Back to Join Screen</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--slate-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <Card style={{ maxWidth: "540px", width: "100%", textAlign: "center", boxShadow: "var(--shadow-xl)" }}>
          <CardContent style={{ padding: "3rem 2rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "var(--success-50)",
                color: "var(--success-600)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                marginBottom: "1.25rem"
              }}
            >
              ✓
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", marginBottom: "0.5rem" }}>
              Assessment Submitted!
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1.75rem" }}>
              Thank you, <strong>{session.participant?.name || "Candidate"}</strong>. Your responses have been securely submitted and recorded.
            </p>

            <div
              style={{
                backgroundColor: "var(--slate-50)",
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                textAlign: "left",
                fontSize: "0.875rem",
                marginBottom: "1.75rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--slate-500)" }}>Assessment:</span>
                <strong>{session.test?.title || "Assessment"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--slate-500)" }}>Questions Answered:</span>
                <strong>{Object.keys(answers).length} / {questions.length}</strong>
              </div>
            </div>

            <p style={{ fontSize: "0.8125rem", color: "var(--slate-400)" }}>
              You may now safely close this browser window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──── FULLSCREEN GATING SCREEN ────
  if (configuration.fullscreen_required && !hasEnteredFullscreenOnce && !isFullscreen) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--slate-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <Card style={{ maxWidth: "580px", width: "100%", textAlign: "center", boxShadow: "var(--shadow-xl)" }}>
          <CardContent style={{ padding: "2.5rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🖥️</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", marginBottom: "0.5rem" }}>
              Fullscreen Mode Required
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              This assessment enforces <strong>automated proctoring</strong>. You must enter fullscreen mode to begin. Tab switches, window defocusing, and exiting fullscreen are actively monitored.
            </p>

            <div
              style={{
                backgroundColor: "var(--slate-50)",
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                textAlign: "left",
                fontSize: "0.8125rem",
                marginBottom: "2rem"
              }}
            >
              <div style={{ marginBottom: "0.25rem" }}><strong>Assessment:</strong> {session.test?.title}</div>
              <div style={{ marginBottom: "0.25rem" }}><strong>Candidate:</strong> {session.participant?.name}</div>
              <div><strong>Violation Limit:</strong> {configuration.violation_limit || 3} allowed before auto-submit</div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={requestFullscreenAndStart}
              style={{ width: "100%" }}
            >
              ⛶ Enter Fullscreen & Begin Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──── FULLSCREEN EXITED BLOCKING OVERLAY ────
  if (configuration.fullscreen_required && hasEnteredFullscreenOnce && !isFullscreen) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "1.5rem"
        }}
      >
        <Card style={{ maxWidth: "480px", width: "100%", textAlign: "center", border: "2px solid var(--danger-500)" }}>
          <CardContent style={{ padding: "2.5rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--danger-700)", marginBottom: "0.5rem" }}>
              Fullscreen Mode Exited
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              You have left fullscreen mode. This event has been recorded in your proctoring violation log.
            </p>

            <div
              style={{
                backgroundColor: "var(--danger-50)",
                border: "1px solid var(--danger-100)",
                color: "var(--danger-700)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: "1.5rem"
              }}
            >
              Violations: {violationsCount} / {configuration.violation_limit || 3}
            </div>

            <Button
              type="button"
              variant="danger"
              size="lg"
              onClick={requestFullscreenAndStart}
              style={{ width: "100%" }}
            >
              ⛶ Re-enter Fullscreen to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isSequential = configuration.navigation_mode === "SEQUENTIAL";
  const currentQTimeRemaining = currentQ ? questionTimes[currentQ.id] : undefined;
  const isCurrentQExpired = currentQTimeRemaining !== undefined && currentQTimeRemaining <= 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--slate-50)", padding: "1.5rem" }}>
      {/* Violation Alert Modal */}
      {violationWarning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem"
          }}
        >
          <Card style={{ maxWidth: "460px", width: "100%", textAlign: "center" }}>
            <CardContent style={{ padding: "2rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                {violationWarning.isFatal ? "🚫" : "⚠️"}
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: violationWarning.isFatal ? "var(--danger-700)" : "var(--warning-700)" }}>
                {violationWarning.title}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--slate-600)", margin: "0.75rem 0 1.5rem", lineHeight: 1.5 }}>
                {violationWarning.message}
              </p>
              {!violationWarning.isFatal && (
                <Button variant="primary" size="md" onClick={() => setViolationWarning(null)}>
                  I Understand, Return to Test
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Top Header Bar */}
        <Card style={{ marginBottom: "1.5rem" }}>
          <CardContent style={{ padding: "0.875rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--slate-900)" }}>
                {session.test?.title || "Assessment"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                Candidate: <strong>{session.participant?.name}</strong>
                {session.team && ` • Team: ${session.team.team_name}`}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: saveStatus === "Saving..." ? "var(--warning-600)" : "var(--success-600)" }}>
                ● {saveStatus}
              </div>

              {/* Overall Total Countdown Timer */}
              {timeLeftSeconds !== null && (
                <div
                  style={{
                    backgroundColor: timeLeftSeconds < 120 ? "var(--danger-50)" : "var(--slate-100)",
                    border: timeLeftSeconds < 120 ? "1px solid var(--danger-200)" : "1px solid var(--slate-200)",
                    color: timeLeftSeconds < 120 ? "var(--danger-700)" : "var(--slate-800)",
                    padding: "0.375rem 0.875rem",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 800,
                    fontSize: "0.9375rem"
                  }}
                >
                  ⏱ Total Time: {formatTime(timeLeftSeconds)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Test Layout */}
        <div style={{ display: "grid", gridTemplateColumns: isSequential ? "1fr" : "3fr 1fr", gap: "1.5rem" }}>
          {/* Question Display Card */}
          {currentQ && (
            <Card>
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
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <Badge variant="primary">{currentQ.type}</Badge>
                  {currentQ.difficulty && <Badge variant="outline">{currentQ.difficulty}</Badge>}
                  <Badge variant="outline">{currentQ.marks} Mark{currentQ.marks > 1 ? "s" : ""}</Badge>
                </div>

                {/* Question Specific Timer */}
                {currentQTimeRemaining !== undefined && (
                  <div>
                    {isCurrentQExpired ? (
                      <Badge variant="danger">⏳ Question Time Expired (Locked)</Badge>
                    ) : (
                      <div
                        style={{
                          backgroundColor: currentQTimeRemaining <= 10 ? "var(--danger-50)" : "var(--warning-50)",
                          border: currentQTimeRemaining <= 10 ? "2px solid var(--danger-500)" : "1px solid var(--warning-500)",
                          color: currentQTimeRemaining <= 10 ? "var(--danger-700)" : "var(--warning-700)",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "var(--radius-full)",
                          fontWeight: 800,
                          fontSize: "0.875rem"
                        }}
                      >
                        ⏳ Question Time: {formatTime(currentQTimeRemaining)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Question Body */}
              <CardContent style={{ padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <p style={{ fontSize: "1.0625rem", color: "var(--slate-900)", lineHeight: 1.6, fontWeight: 500 }}>
                  {currentQ.question_text}
                </p>

                {/* MCQ / True-False Options */}
                {(currentQ.type === "MCQ" || currentQ.type === "TRUE_FALSE") && Array.isArray(currentQ.options) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {currentQ.options.map((opt, idx) => {
                      const optLabel = opt.label || String.fromCharCode(65 + idx);
                      const isChecked = answers[currentQ.id] === optLabel;

                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.875rem",
                            padding: "0.875rem 1.25rem",
                            borderRadius: "var(--radius-md)",
                            border: isChecked ? "2px solid var(--primary-600)" : "1px solid var(--slate-300)",
                            backgroundColor: isCurrentQExpired ? "var(--slate-100)" : isChecked ? "var(--primary-50)" : "#ffffff",
                            cursor: isCurrentQExpired ? "not-allowed" : "pointer",
                            opacity: isCurrentQExpired ? 0.7 : 1,
                            transition: "all 0.15s ease"
                          }}
                        >
                          <input
                            type="radio"
                            name={`question_${currentQ.id}`}
                            value={optLabel}
                            checked={isChecked}
                            disabled={isCurrentQExpired}
                            onChange={() => handleAnswerSelect(currentQ.id, optLabel)}
                          />
                          <strong style={{ minWidth: "20px", color: isChecked ? "var(--primary-700)" : "var(--slate-700)" }}>
                            {optLabel}.
                          </strong>
                          <span style={{ color: "var(--slate-800)", fontSize: "0.9375rem" }}>
                            {opt.text || opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer Input */}
                {currentQ.type === "SHORT_ANSWER" && (
                  <input
                    type="text"
                    placeholder={isCurrentQExpired ? "Time expired for this question." : "Type your concise answer here..."}
                    value={answers[currentQ.id] || ""}
                    disabled={isCurrentQExpired}
                    onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                    style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.9375rem" }}
                  />
                )}

                {/* Long Answer Textarea */}
                {currentQ.type === "LONG_ANSWER" && (
                  <textarea
                    rows={6}
                    placeholder={isCurrentQExpired ? "Time expired for this question." : "Write your comprehensive answer here..."}
                    value={answers[currentQ.id] || ""}
                    disabled={isCurrentQExpired}
                    onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                    style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.9375rem" }}
                  />
                )}
              </CardContent>

              {/* Navigation Footer */}
              <CardFooter style={{ justifyContent: "space-between" }}>
                {!isSequential ? (
                  <Button
                    variant="outline"
                    size="md"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Previous
                  </Button>
                ) : <div />}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    >
                      Next Question →
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="md"
                      onClick={() => handleSubmit(false)}
                      loading={submitting}
                    >
                      Submit Assessment
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          )}

          {/* Right Sidebar: Questions Grid (Free Navigation Mode) */}
          {!isSequential && (
            <Card style={{ height: "fit-content" }}>
              <CardHeader>
                <CardTitle style={{ fontSize: "1rem" }}>Questions Overview</CardTitle>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "";
                    const isCurrent = idx === currentIndex;
                    const isExpired = questionTimes[q.id] !== undefined && questionTimes[q.id] <= 0;

                    let bg = "var(--slate-50)";
                    let textCol = "var(--slate-700)";
                    let borderCol = "var(--slate-300)";

                    if (isCurrent) {
                      bg = "var(--primary-600)";
                      textCol = "#ffffff";
                      borderCol = "var(--primary-600)";
                    } else if (isExpired) {
                      bg = "var(--danger-100)";
                      textCol = "var(--danger-700)";
                      borderCol = "var(--danger-200)";
                    } else if (isAnswered) {
                      bg = "var(--success-100)";
                      textCol = "var(--success-700)";
                      borderCol = "var(--success-200)";
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        style={{
                          padding: "0.5rem",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bg,
                          color: textCol,
                          fontWeight: isCurrent ? 800 : 600,
                          fontSize: "0.8125rem",
                          cursor: "pointer"
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ width: "10px", height: "10px", backgroundColor: "var(--success-100)", border: "1px solid var(--success-500)", borderRadius: "2px" }} />
                    <span>Answered ({Object.values(answers).filter((a) => a !== "" && a !== null && a !== undefined).length})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ width: "10px", height: "10px", backgroundColor: "var(--slate-50)", border: "1px solid var(--slate-300)", borderRadius: "2px" }} />
                    <span>Unanswered ({questions.length - Object.values(answers).filter((a) => a !== "" && a !== null && a !== undefined).length})</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="success"
                  size="md"
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                  style={{ width: "100%", marginTop: "0.5rem" }}
                >
                  Submit Assessment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
