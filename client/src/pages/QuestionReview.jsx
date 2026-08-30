import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getTest,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  createQuestion
} from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input, Textarea, Select } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/Card";
import { LoadingSpinner, EmptyState } from "../components/ui/Alert";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { TestWorkspaceHeader } from "../components/layout/TestWorkspaceHeader";

function QuestionReview() {
  const { id: testId } = useParams();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search & Filter
  const [filterType, setFilterType] = useState("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Question Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    type: "MCQ",
    question_text: "",
    difficulty: "EASY",
    topic: "",
    marks: 1,
    negative_marks: 0,
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" }
    ],
    correct_answer: "A",
    expected_answer: "",
    rubric: ""
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [testData, questionsData] = await Promise.all([
        getTest(testId),
        getQuestions(testId)
      ]);

      setTest(testData.test);
      setQuestions(questionsData.questions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [testId]);

  async function handleConfirmDelete() {
    if (!deletingId) return;

    try {
      setDeleteLoading(true);
      await deleteQuestion(deletingId);
      setQuestions((current) => current.filter((q) => q.id !== deletingId));
      setDeletingId(null);
      setSuccessMsg("Question deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete question.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function moveQuestion(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setQuestions(reordered);

    try {
      await reorderQuestions(
        testId,
        reordered.map((q) => q.id)
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save question order.");
      loadData();
    }
  }

  async function handleSaveQuestion(question) {
    try {
      setSavingId(question.id);
      setError("");

      const payload = {
        type: question.type,
        question_text: question.question_text,
        difficulty: question.difficulty,
        topic: question.topic,
        marks: Number(question.marks),
        negative_marks: Number(question.negative_marks || 0),
        options: question.options,
        correct_answer: question.correct_answer,
        expected_answer: question.expected_answer,
        rubric: question.rubric
      };

      const data = await updateQuestion(question.id, payload);

      setQuestions((current) =>
        current.map((item) => (item.id === question.id ? data.question : item))
      );

      setSuccessMsg(`Question #${questions.findIndex((q) => q.id === question.id) + 1} saved.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update question.");
    } finally {
      setSavingId(null);
    }
  }

  function updateLocalQuestion(questionId, field, value) {
    setQuestions((current) =>
      current.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    );
  }

  async function handleCreateQuestionSubmit(e) {
    e.preventDefault();
    if (!newQuestion.question_text.trim()) {
      setError("Question text is required.");
      return;
    }

    try {
      setAddLoading(true);
      setError("");

      const payload = {
        type: newQuestion.type,
        question_text: newQuestion.question_text.trim(),
        difficulty: newQuestion.difficulty,
        topic: newQuestion.topic.trim() || null,
        marks: Number(newQuestion.marks) || 1,
        negative_marks: Number(newQuestion.negative_marks) || 0,
        options: newQuestion.type === "MCQ" || newQuestion.type === "TRUE_FALSE" ? newQuestion.options : null,
        correct_answer: newQuestion.type === "MCQ" || newQuestion.type === "TRUE_FALSE" ? newQuestion.correct_answer : null,
        expected_answer: newQuestion.expected_answer.trim() || null,
        rubric: newQuestion.rubric || null
      };

      const data = await createQuestion(testId, payload);
      setQuestions((prev) => [...prev, data.question]);
      setShowAddModal(false);
      setSuccessMsg("New question created successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);

      // Reset form
      setNewQuestion({
        type: "MCQ",
        question_text: "",
        difficulty: "EASY",
        topic: "",
        marks: 1,
        negative_marks: 0,
        options: [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" }
        ],
        correct_answer: "A",
        expected_answer: "",
        rubric: ""
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create question.");
    } finally {
      setAddLoading(false);
    }
  }

  // Calculate stats
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchType = filterType === "ALL" || q.type === filterType;
      const matchDiff = filterDifficulty === "ALL" || q.difficulty === filterDifficulty;
      const matchSearch =
        !searchQuery.trim() ||
        q.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchDiff && matchSearch;
    });
  }, [questions, filterType, filterDifficulty, searchQuery]);

  if (loading) {
    return <LoadingSpinner text="Loading question repository..." />;
  }

  return (
    <div>
      <TestWorkspaceHeader test={test} activeStep="questions" />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        {/* Top Actions & Summary Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--slate-900)" }}>
              Question Repository ({questions.length} Items • {totalMarks} Total Marks)
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
              Review, edit options, customize rubrics, and reorder questions for this assessment.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
              + Add Question
            </Button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <Alert variant="error" onClose={() => setError("")} style={{ marginBottom: "1.5rem" }}>
            {error}
          </Alert>
        )}

        {successMsg && (
          <Alert variant="success" onClose={() => setSuccessMsg("")} style={{ marginBottom: "1.5rem" }}>
            {successMsg}
          </Alert>
        )}

        {/* Filter Bar */}
        {questions.length > 0 && (
          <Card style={{ marginBottom: "1.5rem" }}>
            <CardContent style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="🔍 Search questions or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flexGrow: 1, minWidth: "200px", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                />

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                >
                  <option value="ALL">All Question Types</option>
                  <option value="MCQ">MCQ</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="LONG_ANSWER">Long Answer</option>
                </select>

                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                {(filterType !== "ALL" || filterDifficulty !== "ALL" || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterType("ALL");
                      setFilterDifficulty("ALL");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {questions.length === 0 && (
          <EmptyState
            icon="📝"
            title="No questions in this assessment yet"
            description="You can generate questions automatically from an uploaded DOCX file, or create custom questions manually."
            action={
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link to={`/tests/${testId}`}>
                  <Button variant="outline" size="md">
                    Upload Document & AI Generate
                  </Button>
                </Link>
                <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
                  + Add Question Manually
                </Button>
              </div>
            }
          />
        )}

        {/* Filtered Empty State */}
        {questions.length > 0 && filteredQuestions.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No questions matched your filters"
            description="Try changing your search terms or filter criteria."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterType("ALL");
                  setFilterDifficulty("ALL");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            }
          />
        )}

        {/* Question Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredQuestions.map((question, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredQuestions.length - 1;
            const isSaving = savingId === question.id;

            return (
              <Card key={question.id} style={{ boxShadow: "var(--shadow-sm)" }}>
                {/* Header Bar */}
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: "var(--slate-50)",
                    borderBottom: "1px solid var(--slate-200)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--slate-800)" }}>
                      #{index + 1}
                    </span>

                    <Badge variant="primary">{question.type}</Badge>

                    {question.difficulty && (
                      <Badge
                        variant={
                          question.difficulty === "EASY"
                            ? "success"
                            : question.difficulty === "HARD"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {question.difficulty}
                      </Badge>
                    )}

                    <Badge variant="outline">
                      {question.marks} Mark{question.marks > 1 ? "s" : ""}
                    </Badge>

                    {question.negative_marks > 0 && (
                      <Badge variant="danger">
                        -{question.negative_marks} Neg
                      </Badge>
                    )}
                  </div>

                  {/* Reorder and Delete Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFirst}
                      onClick={() => moveQuestion(index, -1)}
                      title="Move up"
                      style={{ padding: "0.25rem 0.5rem", height: "30px" }}
                    >
                      ▲
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLast}
                      onClick={() => moveQuestion(index, 1)}
                      title="Move down"
                      style={{ padding: "0.25rem 0.5rem", height: "30px" }}
                    >
                      ▼
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(question.id)}
                      title="Delete question"
                      style={{ color: "var(--danger-600)", padding: "0.25rem 0.5rem", height: "30px" }}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                {/* Question Form Body */}
                <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem" }}>
                  {/* Top Metadata Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                    <Select
                      label="Question Type"
                      value={question.type}
                      onChange={(e) => updateLocalQuestion(question.id, "type", e.target.value)}
                    >
                      <option value="MCQ">MCQ (Multiple Choice)</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="LONG_ANSWER">Long Answer</option>
                    </Select>

                    <Select
                      label="Difficulty"
                      value={question.difficulty || "EASY"}
                      onChange={(e) => updateLocalQuestion(question.id, "difficulty", e.target.value)}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </Select>

                    <Input
                      label="Topic / Category"
                      type="text"
                      value={question.topic || ""}
                      onChange={(e) => updateLocalQuestion(question.id, "topic", e.target.value)}
                      placeholder="e.g. Memory Management"
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <Input
                        label="Marks"
                        type="number"
                        min="1"
                        value={question.marks || 1}
                        onChange={(e) => updateLocalQuestion(question.id, "marks", e.target.value)}
                      />

                      <Input
                        label="Negative Marks"
                        type="number"
                        min="0"
                        step="0.25"
                        value={question.negative_marks || 0}
                        onChange={(e) => updateLocalQuestion(question.id, "negative_marks", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <Textarea
                    label="Question Prompt"
                    rows={3}
                    value={question.question_text || ""}
                    onChange={(e) => updateLocalQuestion(question.id, "question_text", e.target.value)}
                    placeholder="Enter the full question prompt..."
                  />

                  {/* MCQ & True/False Options Editor */}
                  {(question.type === "MCQ" || question.type === "TRUE_FALSE") && (
                    <div
                      style={{
                        backgroundColor: "var(--slate-50)",
                        padding: "1.25rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--slate-200)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <strong style={{ fontSize: "0.875rem", color: "var(--slate-800)" }}>
                          Answer Options & Correct Key
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                          Select the radio button next to the correct answer
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                        {(question.options || []).map((opt, optIdx) => {
                          const optLabel = opt.label || String.fromCharCode(65 + optIdx);
                          const isCorrect = question.correct_answer === optLabel;

                          return (
                            <div
                              key={optIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                backgroundColor: isCorrect ? "var(--success-50)" : "#ffffff",
                                border: isCorrect ? "1px solid var(--success-500)" : "1px solid var(--slate-300)",
                                borderRadius: "var(--radius-md)",
                                padding: "0.5rem 0.75rem"
                              }}
                            >
                              <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name={`correct_for_${question.id}`}
                                  checked={isCorrect}
                                  onChange={() => updateLocalQuestion(question.id, "correct_answer", optLabel)}
                                />
                                <strong style={{ minWidth: "18px", color: isCorrect ? "var(--success-700)" : "var(--slate-700)" }}>
                                  {optLabel}.
                                </strong>
                              </label>

                              <input
                                type="text"
                                value={opt.text || ""}
                                onChange={(e) => {
                                  const updatedOpts = [...question.options];
                                  updatedOpts[optIdx] = { ...updatedOpts[optIdx], text: e.target.value };
                                  updateLocalQuestion(question.id, "options", updatedOpts);
                                }}
                                style={{ flexGrow: 1, border: "none", outline: "none", backgroundColor: "transparent", padding: 0 }}
                                placeholder={`Option ${optLabel} text...`}
                              />

                              {isCorrect && (
                                <Badge variant="success" size="sm">
                                  ✓ Correct Key
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Short & Long Answer Expected Answer & Rubric */}
                  {(question.type === "SHORT_ANSWER" || question.type === "LONG_ANSWER") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <Textarea
                        label="Expected / Model Answer"
                        rows={3}
                        value={question.expected_answer || ""}
                        onChange={(e) => updateLocalQuestion(question.id, "expected_answer", e.target.value)}
                        placeholder="Model answer used by Gemini AI during automated scoring..."
                      />

                      {question.type === "LONG_ANSWER" && (
                        <Textarea
                          label="Grading Rubric / Criteria"
                          rows={4}
                          value={
                            typeof question.rubric === "string"
                              ? question.rubric
                              : JSON.stringify(question.rubric || {}, null, 2)
                          }
                          onChange={(e) => updateLocalQuestion(question.id, "rubric", e.target.value)}
                          placeholder="Rubric guidelines for AI grading (points breakdown, required keywords)..."
                        />
                      )}
                    </div>
                  )}
                </CardContent>

                {/* Footer with Save Action */}
                <CardFooter style={{ justifyContent: "flex-end" }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveQuestion(question)}
                    loading={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Question Changes"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Delete Question Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Question?"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmLabel="Delete Question"
        confirmVariant="danger"
        loading={deleteLoading}
      />

      {/* Add Question Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Question"
        description="Manually create a question with custom options or subjective grading rubrics."
        maxWidth="620px"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setShowAddModal(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateQuestionSubmit} loading={addLoading}>
              Create Question
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateQuestionSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Select
              label="Question Type"
              value={newQuestion.type}
              onChange={(e) => {
                const newT = e.target.value;
                let opts = newQuestion.options;
                let key = newQuestion.correct_answer;
                if (newT === "TRUE_FALSE") {
                  opts = [
                    { label: "A", text: "True" },
                    { label: "B", text: "False" }
                  ];
                  key = "A";
                } else if (newT === "MCQ") {
                  opts = [
                    { label: "A", text: "" },
                    { label: "B", text: "" },
                    { label: "C", text: "" },
                    { label: "D", text: "" }
                  ];
                  key = "A";
                }
                setNewQuestion({ ...newQuestion, type: newT, options: opts, correct_answer: key });
              }}
            >
              <option value="MCQ">MCQ (Multiple Choice)</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer</option>
            </Select>

            <Select
              label="Difficulty"
              value={newQuestion.difficulty}
              onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </Select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
            <Input
              label="Topic"
              type="text"
              value={newQuestion.topic}
              onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
              placeholder="e.g. Algorithms"
            />

            <Input
              label="Marks"
              type="number"
              min="1"
              value={newQuestion.marks}
              onChange={(e) => setNewQuestion({ ...newQuestion, marks: e.target.value })}
            />

            <Input
              label="Neg. Marks"
              type="number"
              min="0"
              step="0.25"
              value={newQuestion.negative_marks}
              onChange={(e) => setNewQuestion({ ...newQuestion, negative_marks: e.target.value })}
            />
          </div>

          <Textarea
            label="Question Text"
            required
            rows={3}
            value={newQuestion.question_text}
            onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
            placeholder="Type your question prompt here..."
          />

          {(newQuestion.type === "MCQ" || newQuestion.type === "TRUE_FALSE") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--slate-700)" }}>
                Options & Correct Answer
              </label>

              {newQuestion.options.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="radio"
                    name="new_q_correct_key"
                    checked={newQuestion.correct_answer === opt.label}
                    onChange={() => setNewQuestion({ ...newQuestion, correct_answer: opt.label })}
                  />
                  <span style={{ fontWeight: 600, minWidth: "16px" }}>{opt.label}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...newQuestion.options];
                      updated[idx] = { ...updated[idx], text: e.target.value };
                      setNewQuestion({ ...newQuestion, options: updated });
                    }}
                    placeholder={`Option ${opt.label} text`}
                    style={{ flexGrow: 1 }}
                  />
                </div>
              ))}
            </div>
          )}

          {(newQuestion.type === "SHORT_ANSWER" || newQuestion.type === "LONG_ANSWER") && (
            <Textarea
              label="Expected Answer"
              rows={3}
              value={newQuestion.expected_answer}
              onChange={(e) => setNewQuestion({ ...newQuestion, expected_answer: e.target.value })}
              placeholder="Model answer used by Gemini AI during automated scoring..."
            />
          )}

          {newQuestion.type === "LONG_ANSWER" && (
            <Textarea
              label="Rubric (Optional)"
              rows={3}
              value={newQuestion.rubric}
              onChange={(e) => setNewQuestion({ ...newQuestion, rubric: e.target.value })}
              placeholder="Key concepts or keywords for full credit..."
            />
          )}
        </form>
      </Modal>
    </div>
  );
}

export default QuestionReview;