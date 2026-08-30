import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getPublicTest,
  registerIndividual,
  createTeam,
  joinTeam,
  startAttempt
} from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/Alert";

export default function PublicTestJoin() {
  const { testCode: initialCode } = useParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(initialCode || "");
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [error, setError] = useState("");

  // Participant form state
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingAttempt, setStartingAttempt] = useState(false);

  // Team choice state
  const [teamAction, setTeamAction] = useState("CREATE"); // "CREATE" or "JOIN"
  const [teamName, setTeamName] = useState("");
  const [joinTeamCode, setJoinTeamCode] = useState("");

  // Joined state
  const [registeredSession, setRegisteredSession] = useState(null);

  useEffect(() => {
    if (initialCode) {
      loadPublicTest(initialCode);
    }
  }, [initialCode]);

  async function loadPublicTest(code) {
    if (!code || !code.trim()) return;

    try {
      setLoading(true);
      setError("");
      const data = await getPublicTest(code.trim());
      setTestData(data);

      // Initialize form fields
      const initialFields = {};
      (data.configuration?.participant_fields || []).forEach((field) => {
        initialFields[field.name] = "";
      });
      setFormData(initialFields);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load assessment information");
      setTestData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(e) {
    e.preventDefault();
    if (inputCode.trim()) {
      navigate(`/join/${inputCode.trim().toUpperCase()}`);
      loadPublicTest(inputCode.trim());
    }
  }

  function handleInputChange(name, value) {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleJoinSubmit(e) {
    e.preventDefault();
    setError("");

    // Validate required fields
    const fields = testData?.configuration?.participant_fields || [];
    for (const f of fields) {
      if (f.required && (!formData[f.name] || !formData[f.name].trim())) {
        setError(`Please fill in required field: ${f.label}`);
        return;
      }
    }

    const mode = testData?.configuration?.participation_mode;
    const testCode = testData.test.test_code || testData.test.id;

    if (mode === "TEAM") {
      if (teamAction === "CREATE" && !teamName.trim()) {
        setError("Please enter a team name.");
        return;
      }
      if (teamAction === "JOIN" && !joinTeamCode.trim()) {
        setError("Please enter the team code to join.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let res;
      if (mode === "TEAM") {
        if (teamAction === "CREATE") {
          res = await createTeam(testCode, {
            team_name: teamName.trim(),
            ...formData
          });
        } else {
          res = await joinTeam(testCode, joinTeamCode.trim().toUpperCase(), formData);
        }
      } else {
        res = await registerIndividual(testCode, formData);
      }

      const sessionObj = {
        test: res.test,
        participant: res.participant,
        team: res.team || null
      };

      sessionStorage.setItem("active_assessment_session", JSON.stringify(sessionObj));
      setRegisteredSession(sessionObj);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to register for assessment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartAttempt() {
    if (!registeredSession) return;
    setError("");
    setStartingAttempt(true);

    try {
      const data = await startAttempt({
        testId: registeredSession.test.id,
        participantId: registeredSession.participant.id,
        teamId: registeredSession.team?.id || null
      });

      navigate(`/attempt/${data.attempt.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to start assessment attempt");
    } finally {
      setStartingAttempt(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--slate-50)", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--primary-600), var(--primary-800))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "1.25rem",
              marginBottom: "0.75rem",
              boxShadow: "var(--shadow-md)"
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Assessment Portal
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
            Candidate entry & registration
          </p>
        </div>

        {/* Enter Code Card if not supplied in URL */}
        {!initialCode && (
          <Card style={{ marginBottom: "2rem" }}>
            <CardHeader>
              <CardTitle>Enter Assessment Access Code</CardTitle>
              <CardDescription>
                Provide the 6-character code provided by your instructor or examiner.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLookup} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <Input
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  required
                  style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)", fontSize: "1.125rem", letterSpacing: "0.1em" }}
                />

                <Button type="submit" variant="primary" size="md" style={{ height: "42px" }}>
                  Find Assessment →
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading && <LoadingSpinner text="Fetching assessment parameters..." />}

        {error && (
          <Alert variant="error" title="Notice" onClose={() => setError("")} style={{ marginBottom: "1.5rem" }}>
            {error}
          </Alert>
        )}

        {/* Test Overview & Registration Card */}
        {testData && !registeredSession && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Assessment Information Card */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                  <div>
                    <CardTitle style={{ fontSize: "1.375rem" }}>{testData.test.title}</CardTitle>
                    {testData.test.description && (
                      <CardDescription style={{ marginTop: "0.25rem" }}>
                        {testData.test.description}
                      </CardDescription>
                    )}
                  </div>

                  <Badge variant="primary" size="sm">
                    {testData.test.total_questions} Questions
                  </Badge>
                </div>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {testData.test.instructions && (
                  <div
                    style={{
                      backgroundColor: "var(--slate-50)",
                      border: "1px solid var(--slate-200)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.875rem 1rem",
                      fontSize: "0.8125rem",
                      color: "var(--slate-700)"
                    }}
                  >
                    <strong>Instructions:</strong>
                    <p style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>{testData.test.instructions}</p>
                  </div>
                )}

                {/* Metadata Parameters Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    fontSize: "0.8125rem",
                    backgroundColor: "var(--slate-50)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)"
                  }}
                >
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Total Marks:</span>{" "}
                    <strong>{testData.test.total_marks}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Duration:</span>{" "}
                    <strong>
                      {testData.configuration.duration_minutes
                        ? `${testData.configuration.duration_minutes} Minutes`
                        : "Unlimited"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Participation:</span>{" "}
                    <strong>
                      {testData.configuration.participation_mode === "TEAM"
                        ? `Team (${testData.configuration.team_size} members)`
                        : "Individual"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Proctoring:</span>{" "}
                    <strong>
                      {testData.configuration.fullscreen_required ? "Fullscreen Required" : "Standard"}
                    </strong>
                  </div>
                </div>

                {/* Schedule Warnings */}
                {testData.schedule_status.is_upcoming && (
                  <Alert variant="warning" title="Assessment Scheduled">
                    This test will unlock on:{" "}
                    <strong>{new Date(testData.configuration.start_time).toLocaleString()}</strong>
                  </Alert>
                )}

                {testData.schedule_status.is_ended && (
                  <Alert variant="error" title="Assessment Ended">
                    This assessment concluded on:{" "}
                    <strong>{new Date(testData.configuration.end_time).toLocaleString()}</strong>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Registration Form */}
            {!testData.schedule_status.is_ended && !testData.schedule_status.is_upcoming && (
              <Card>
                <CardHeader>
                  <CardTitle>Candidate Registration</CardTitle>
                  <CardDescription>
                    Enter your details to register for this session.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleJoinSubmit}>
                  <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {(testData.configuration.participant_fields || []).map((field) => (
                      <Input
                        key={field.name}
                        label={field.label}
                        type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={`Enter your ${field.label.toLowerCase()}`}
                      />
                    ))}

                    {/* Team Options */}
                    {testData.configuration.participation_mode === "TEAM" && (
                      <div
                        style={{
                          borderTop: "1px solid var(--slate-200)",
                          paddingTop: "1.25rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem"
                        }}
                      >
                        <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--slate-800)" }}>
                          Team Options
                        </label>

                        <div style={{ display: "flex", gap: "1.5rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="team_action"
                              value="CREATE"
                              checked={teamAction === "CREATE"}
                              onChange={() => setTeamAction("CREATE")}
                            />
                            Create a New Team
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="team_action"
                              value="JOIN"
                              checked={teamAction === "JOIN"}
                              onChange={() => setTeamAction("JOIN")}
                            />
                            Join Existing Team Code
                          </label>
                        </div>

                        {teamAction === "CREATE" ? (
                          <Input
                            label="Team Name"
                            type="text"
                            required
                            placeholder="e.g. Code Ninjas"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                          />
                        ) : (
                          <Input
                            label="Team Code"
                            type="text"
                            required
                            placeholder="e.g. TM-4829"
                            value={joinTeamCode}
                            onChange={(e) => setJoinTeamCode(e.target.value.toUpperCase())}
                            style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter style={{ justifyContent: "flex-end" }}>
                    <Button type="submit" variant="primary" size="lg" loading={isSubmitting} style={{ width: "100%" }}>
                      Register & Continue →
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}
          </div>
        )}

        {/* Registered Success Screen */}
        {registeredSession && (
          <Card style={{ borderColor: "var(--success-200)", boxShadow: "var(--shadow-lg)" }}>
            <CardHeader style={{ backgroundColor: "var(--success-50)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>✓</span>
                <div>
                  <CardTitle style={{ color: "var(--success-800)" }}>Registration Confirmed</CardTitle>
                  <CardDescription style={{ color: "var(--success-700)" }}>
                    Ready to begin session for <strong>{registeredSession.participant.name}</strong>.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {registeredSession.team && (
                <div
                  style={{
                    backgroundColor: "var(--slate-50)",
                    border: "1px solid var(--slate-200)",
                    padding: "1.25rem",
                    borderRadius: "var(--radius-md)"
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                    Team Assignment
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--slate-900)", marginTop: "0.25rem" }}>
                    {registeredSession.team.team_name}
                  </div>
                  <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--slate-600)" }}>Team Share Code:</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        backgroundColor: "var(--primary-50)",
                        color: "var(--primary-700)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--primary-200)"
                      }}
                    >
                      {registeredSession.team.team_code}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "0.375rem" }}>
                    Share this code with teammates so they join this same team. (Capacity: {registeredSession.team.member_count} / {registeredSession.team.max_members})
                  </p>
                </div>
              )}

              <p style={{ fontSize: "0.875rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
                Clicking the button below will initialize your assessment timer and question session.
              </p>

              <Button
                type="button"
                variant="success"
                size="lg"
                onClick={handleStartAttempt}
                loading={startingAttempt}
                style={{ width: "100%" }}
              >
                Start Assessment Now →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
