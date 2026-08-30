import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getConfiguration, updateConfiguration, getTest } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input, Select } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/Alert";
import { TestWorkspaceHeader } from "../components/layout/TestWorkspaceHeader";

const DEFAULT_PARTICIPANT_FIELDS = [
  { name: "name", label: "Full Name", type: "text", required: true },
  { name: "email", label: "Email Address", type: "email", required: true }
];

export default function TestConfiguration() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Configuration states
  const [participationMode, setParticipationMode] = useState("INDIVIDUAL");
  const [teamSize, setTeamSize] = useState(2);
  const [teamScoringMethod, setTeamScoringMethod] = useState("AVERAGE");

  const [durationMinutes, setDurationMinutes] = useState("");
  const [timingRules, setTimingRules] = useState([]);
  const [newRule, setNewRule] = useState({
    type: "MCQ",
    difficulty: "EASY",
    seconds: 30
  });

  const [navigationMode, setNavigationMode] = useState("FREE");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);

  const [maxAttempts, setMaxAttempts] = useState(1);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(true);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [showScore, setShowScore] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [participantFields, setParticipantFields] = useState(DEFAULT_PARTICIPANT_FIELDS);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const [violationLimit, setViolationLimit] = useState(3);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [testRes, configRes] = await Promise.all([
          getTest(testId),
          getConfiguration(testId)
        ]);

        setTest(testRes.test);

        const cfg = configRes.configuration;
        if (cfg) {
          setParticipationMode(cfg.participation_mode || "INDIVIDUAL");
          setTeamSize(cfg.team_size || 2);
          setTeamScoringMethod(cfg.team_scoring_method || "AVERAGE");

          setDurationMinutes(
            cfg.duration_minutes !== null && cfg.duration_minutes !== undefined
              ? cfg.duration_minutes
              : ""
          );
          setTimingRules(Array.isArray(cfg.timing_rules) ? cfg.timing_rules : []);

          setNavigationMode(cfg.navigation_mode || "FREE");
          setRandomizeQuestions(Boolean(cfg.randomize_questions));
          setRandomizeOptions(Boolean(cfg.randomize_options));

          setMaxAttempts(cfg.max_attempts || 1);
          setNegativeMarkingEnabled(cfg.negative_marking_enabled !== false);

          if (cfg.start_time) {
            setStartTime(new Date(cfg.start_time).toISOString().slice(0, 16));
          }
          if (cfg.end_time) {
            setEndTime(new Date(cfg.end_time).toISOString().slice(0, 16));
          }

          setShowScore(cfg.show_score !== false);
          setShowCorrectAnswers(Boolean(cfg.show_correct_answers));
          setShowLeaderboard(Boolean(cfg.show_leaderboard));

          if (Array.isArray(cfg.participant_fields) && cfg.participant_fields.length > 0) {
            setParticipantFields(cfg.participant_fields);
          }

          setFullscreenRequired(Boolean(cfg.fullscreen_required));
          setViolationLimit(cfg.violation_limit || 3);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [testId]);

  function handleAddTimingRule() {
    const exists = timingRules.some(
      (r) => r.type === newRule.type && r.difficulty === newRule.difficulty
    );

    if (exists) {
      setError(`A timing rule for ${newRule.type} (${newRule.difficulty}) already exists.`);
      return;
    }

    setTimingRules([...timingRules, { ...newRule, seconds: Number(newRule.seconds) }]);
    setError("");
  }

  function handleRemoveTimingRule(index) {
    setTimingRules(timingRules.filter((_, i) => i !== index));
  }

  function handleAddParticipantField() {
    if (!newFieldName.trim() || !newFieldLabel.trim()) {
      setError("Field identifier and label are required.");
      return;
    }

    const cleanName = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    if (participantFields.some((f) => f.name === cleanName)) {
      setError(`Participant field "${cleanName}" already exists.`);
      return;
    }

    setParticipantFields([
      ...participantFields,
      {
        name: cleanName,
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired
      }
    ]);

    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setError("");
  }

  function handleRemoveParticipantField(index) {
    setParticipantFields(participantFields.filter((_, i) => i !== index));
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const payload = {
        participation_mode: participationMode,
        team_size: participationMode === "TEAM" ? Number(teamSize) : null,
        team_scoring_method: participationMode === "TEAM" ? teamScoringMethod : "AVERAGE",

        duration_minutes: durationMinutes !== "" ? Number(durationMinutes) : null,
        timing_rules: timingRules,

        navigation_mode: navigationMode,
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,

        max_attempts: Number(maxAttempts),
        negative_marking_enabled: negativeMarkingEnabled,

        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,

        show_score: showScore,
        show_correct_answers: showCorrectAnswers,
        show_leaderboard: showLeaderboard,

        participant_fields: participantFields,

        fullscreen_required: fullscreenRequired,
        violation_limit: Number(violationLimit)
      };

      await updateConfiguration(testId, payload);
      setSuccessMessage("Test configuration saved successfully! Changes are active for new attempts.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading test configuration settings..." />;
  }

  return (
    <div>
      <TestWorkspaceHeader test={test} activeStep="configure" />

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem 5rem" }}>
        {/* Header Title */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Assessment Configuration
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
            Customize participation modes, time limits, question navigation, scoring behavior, and anti-cheat proctoring rules.
          </p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError("")} style={{ marginBottom: "1.5rem" }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage("")} style={{ marginBottom: "1.5rem" }}>
            {successMessage}
          </Alert>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Section 1: Participation Mode */}
          <Card>
            <CardHeader>
              <CardTitle>1. Participation Mode & Teams</CardTitle>
              <CardDescription>
                Choose whether candidates take this test individually or collaborate in fixed-size teams.
              </CardDescription>
            </CardHeader>

            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1.25rem",
                    border: participationMode === "INDIVIDUAL" ? "2px solid var(--primary-600)" : "1px solid var(--slate-300)",
                    backgroundColor: participationMode === "INDIVIDUAL" ? "var(--primary-50)" : "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="radio"
                    name="participation_mode"
                    value="INDIVIDUAL"
                    checked={participationMode === "INDIVIDUAL"}
                    onChange={(e) => setParticipationMode(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>👤 Individual Assessment</div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                      Each candidate registers and completes their own attempt independently.
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1.25rem",
                    border: participationMode === "TEAM" ? "2px solid var(--primary-600)" : "1px solid var(--slate-300)",
                    backgroundColor: participationMode === "TEAM" ? "var(--primary-50)" : "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="radio"
                    name="participation_mode"
                    value="TEAM"
                    checked={participationMode === "TEAM"}
                    onChange={(e) => setParticipationMode(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>👥 Team Mode</div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                      Candidates create or join a team (e.g. TM-XXXX) with fixed capacity.
                    </p>
                  </div>
                </label>
              </div>

              {participationMode === "TEAM" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", backgroundColor: "var(--slate-50)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--slate-200)" }}>
                  <Input
                    label="Team Size (Fixed Members)"
                    type="number"
                    min="2"
                    max="10"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    helperText="Required number of members per team."
                  />

                  <Select
                    label="Team Scoring Aggregation"
                    value={teamScoringMethod}
                    onChange={(e) => setTeamScoringMethod(e.target.value)}
                    helperText="How member scores are calculated."
                  >
                    <option value="AVERAGE">Average of All Member Scores</option>
                    <option value="HIGHEST">Highest Member Score</option>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Timing & Question Limits */}
          <Card>
            <CardHeader>
              <CardTitle>2. Timing & Question Time Limits</CardTitle>
              <CardDescription>
                Set an overall test countdown and optional per-question time limits.
              </CardDescription>
            </CardHeader>

            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ maxWidth: "320px" }}>
                <Input
                  label="Overall Test Duration (Minutes)"
                  type="number"
                  min="1"
                  placeholder="e.g. 60 (Leave blank for unlimited)"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  helperText="Leave empty for unlimited total duration."
                />
              </div>

              {/* Per-Question Timing Rules Table */}
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--slate-800)", display: "block", marginBottom: "0.25rem" }}>
                  Per-Question Automatic Time Limits
                </label>
                <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginBottom: "0.75rem" }}>
                  Enforce countdown timers on questions based on their type and difficulty level.
                </p>

                {timingRules.length > 0 ? (
                  <div style={{ border: "1px solid var(--slate-200)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "1rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--slate-100)", textAlign: "left" }}>
                          <th style={{ padding: "0.625rem 1rem" }}>Question Type</th>
                          <th style={{ padding: "0.625rem 1rem" }}>Difficulty</th>
                          <th style={{ padding: "0.625rem 1rem" }}>Time Limit</th>
                          <th style={{ padding: "0.625rem 1rem", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timingRules.map((rule, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                            <td style={{ padding: "0.625rem 1rem", fontWeight: 600 }}>{rule.type}</td>
                            <td style={{ padding: "0.625rem 1rem" }}>
                              <Badge variant="outline">{rule.difficulty}</Badge>
                            </td>
                            <td style={{ padding: "0.625rem 1rem", fontWeight: 700, color: "var(--primary-700)" }}>
                              {rule.seconds} seconds
                            </td>
                            <td style={{ padding: "0.625rem 1rem", textAlign: "right" }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTimingRule(idx)}
                                style={{ color: "var(--danger-600)" }}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.8125rem", color: "var(--slate-400)", fontStyle: "italic", marginBottom: "0.75rem" }}>
                    No per-question timing rules active. Questions have no individual time caps.
                  </p>
                )}

                {/* Add Rule Form */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-end",
                    backgroundColor: "var(--slate-50)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    flexWrap: "wrap"
                  }}
                >
                  <Select
                    label="Type"
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                  </Select>

                  <Select
                    label="Difficulty"
                    value={newRule.difficulty}
                    onChange={(e) => setNewRule({ ...newRule, difficulty: e.target.value })}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </Select>

                  <Input
                    label="Limit (Seconds)"
                    type="number"
                    min="5"
                    value={newRule.seconds}
                    onChange={(e) => setNewRule({ ...newRule, seconds: e.target.value })}
                    style={{ width: "120px" }}
                  />

                  <Button type="button" variant="primary" size="md" onClick={handleAddTimingRule}>
                    + Add Timing Rule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Navigation & Randomization */}
          <Card>
            <CardHeader>
              <CardTitle>3. Navigation Mode & Randomization</CardTitle>
              <CardDescription>
                Configure candidate question traversal and anti-guessing question order shuffling.
              </CardDescription>
            </CardHeader>

            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1.25rem",
                    border: navigationMode === "FREE" ? "2px solid var(--primary-600)" : "1px solid var(--slate-300)",
                    backgroundColor: navigationMode === "FREE" ? "var(--primary-50)" : "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="radio"
                    name="navigation_mode"
                    value="FREE"
                    checked={navigationMode === "FREE"}
                    onChange={(e) => setNavigationMode(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>🌐 Free Navigation</div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                      Candidates can jump between questions and review previous answers.
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1.25rem",
                    border: navigationMode === "SEQUENTIAL" ? "2px solid var(--primary-600)" : "1px solid var(--slate-300)",
                    backgroundColor: navigationMode === "SEQUENTIAL" ? "var(--primary-50)" : "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="radio"
                    name="navigation_mode"
                    value="SEQUENTIAL"
                    checked={navigationMode === "SEQUENTIAL"}
                    onChange={(e) => setNavigationMode(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>🔒 Sequential Mode</div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                      Candidates must answer questions in order and cannot return to past questions.
                    </p>
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", gap: "2rem", paddingTop: "0.5rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  />
                  Randomize question order for each candidate
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                  />
                  Randomize MCQ option choices (A/B/C/D)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Attempts & Marking Rules */}
          <Card>
            <CardHeader>
              <CardTitle>4. Attempts & Marking Rules</CardTitle>
            </CardHeader>

            <CardContent style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <Input
                label="Maximum Allowed Attempts"
                type="number"
                min="1"
                max="10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                helperText="How many times a candidate can take this assessment."
              />

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, marginTop: "1.5rem" }}>
                  <input
                    type="checkbox"
                    checked={negativeMarkingEnabled}
                    onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                  />
                  Enable Negative Marking for incorrect answers
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
                  Deducts question's negative marks when an incorrect option is chosen.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Anti-Cheat & Automated Proctoring */}
          <Card>
            <CardHeader>
              <CardTitle>5. Anti-Cheat & Automated Proctoring</CardTitle>
              <CardDescription>
                Configure browser-level deterrents and violation thresholds.
              </CardDescription>
            </CardHeader>

            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700, color: "var(--slate-900)" }}>
                <input
                  type="checkbox"
                  checked={fullscreenRequired}
                  onChange={(e) => setFullscreenRequired(e.target.checked)}
                />
                Require Fullscreen Mode & Anti-Cheat Monitoring
              </label>

              {fullscreenRequired && (
                <div style={{ backgroundColor: "var(--slate-50)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--slate-200)" }}>
                  <div style={{ maxWidth: "320px" }}>
                    <Input
                      label="Max Allowed Violations Before Auto-Submission"
                      type="number"
                      min="1"
                      max="10"
                      value={violationLimit}
                      onChange={(e) => setViolationLimit(e.target.value)}
                      helperText="Includes tab switching, window defocus, and exiting fullscreen."
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 6: Candidate Registration Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle>6. Candidate Registration Fields</CardTitle>
              <CardDescription>
                Customize the information candidates must provide before starting the test.
              </CardDescription>
            </CardHeader>

            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ border: "1px solid var(--slate-200)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--slate-100)", textAlign: "left" }}>
                      <th style={{ padding: "0.625rem 1rem" }}>Field Identifier</th>
                      <th style={{ padding: "0.625rem 1rem" }}>Display Label</th>
                      <th style={{ padding: "0.625rem 1rem" }}>Type</th>
                      <th style={{ padding: "0.625rem 1rem" }}>Required</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantFields.map((field, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                        <td style={{ padding: "0.625rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          {field.name}
                        </td>
                        <td style={{ padding: "0.625rem 1rem", fontWeight: 600 }}>{field.label}</td>
                        <td style={{ padding: "0.625rem 1rem" }}>{field.type}</td>
                        <td style={{ padding: "0.625rem 1rem" }}>
                          <Badge variant={field.required ? "primary" : "outline"}>
                            {field.required ? "Required" : "Optional"}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.625rem 1rem", textAlign: "right" }}>
                          {field.name !== "name" && field.name !== "email" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveParticipantField(idx)}
                              style={{ color: "var(--danger-600)" }}
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Field Inputs */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-end",
                  backgroundColor: "var(--slate-50)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  flexWrap: "wrap"
                }}
              >
                <Input
                  label="Identifier"
                  type="text"
                  placeholder="e.g. student_id"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                />

                <Input
                  label="Label"
                  type="text"
                  placeholder="e.g. Student Roll Number"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />

                <Select
                  label="Field Type"
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                </Select>

                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", paddingBottom: "0.75rem", fontSize: "0.8125rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                  />
                  Required
                </label>

                <Button type="button" variant="primary" size="md" onClick={handleAddParticipantField}>
                  + Add Field
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Bottom Bar */}
          <div
            style={{
              position: "sticky",
              bottom: "1.5rem",
              backgroundColor: "#ffffff",
              border: "1px solid var(--slate-200)",
              borderRadius: "var(--radius-xl)",
              padding: "1rem 1.5rem",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "var(--slate-500)" }}>
              Ensure all parameters are configured before candidates begin attempts.
            </div>

            <Button type="submit" variant="primary" size="lg" loading={saving}>
              Save Test Configuration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
