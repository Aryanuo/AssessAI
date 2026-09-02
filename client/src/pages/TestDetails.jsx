import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getTest,
  updateTest,
  deleteTest,
  uploadDocument,
  generateQuestions,
  publishTest
} from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input, Textarea } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/Alert";
import { ConfirmDialog } from "../components/ui/Modal";
import { TestWorkspaceHeader } from "../components/layout/TestWorkspaceHeader";

function TestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Document upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedDocument, setUploadedDocument] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState("");

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState([]);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadTest() {
      try {
        setLoading(true);
        setError("");
        const data = await getTest(id);
        setTest(data.test);
        setTitle(data.test.title || "");
        setDescription(data.test.description || "");
        setInstructions(data.test.instructions || "");
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load test details.");
      } finally {
        setLoading(false);
      }
    }

    loadTest();
  }, [id]);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSaveSuccess(false);

    if (!title.trim()) {
      setError("Test title is required.");
      return;
    }

    setSaving(true);

    try {
      const data = await updateTest(id, {
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null
      });

      setTest(data.test);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save test changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setUploadError("Please select a DOCX file.");
      return;
    }

    if (
      file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      !file.name.endsWith(".docx")
    ) {
      setUploadError("Only DOCX files are supported.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const data = await uploadDocument(id, file);
      setUploadedDocument(data.document);
      setFile(null);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateQuestions() {
    setGenerating(true);
    setGenerationError("");
    setGenerationResult(null);

    try {
      const data = await generateQuestions(id);
      setGenerationResult(data);
    } catch (err) {
      console.error(err);
      setGenerationError(err.message || "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishErrors([]);
    setPublishSuccess("");

    try {
      const data = await publishTest(id);
      setTest(data.test);
      setPublishSuccess("Test published successfully! Public candidate access is now live.");
    } catch (err) {
      console.error(err);
      if (err.validationErrors && Array.isArray(err.validationErrors)) {
        setPublishErrors(err.validationErrors);
      } else {
        setPublishErrors([err.message || "Failed to publish test"]);
      }
    } finally {
      setPublishing(false);
    }
  }

  function handleCopyLink() {
    if (!test?.test_code) return;
    const url = `${window.location.origin}/join/${test.test_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteTest(id);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete test.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading assessment workspace..." />;
  }

  if (error && !test) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "1.5rem" }}>
        <Alert variant="error" title="Failed to load test">
          {error}
        </Alert>
        <div style={{ marginTop: "1rem" }}>
          <Link to="/dashboard">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = test?.status === "PUBLISHED";

  return (
    <div>
      <TestWorkspaceHeader test={test} activeStep="overview" />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        {/* Global Notifications */}
        {publishErrors.length > 0 && (
          <Alert variant="error" title="Cannot Publish Assessment" onClose={() => setPublishErrors([])} style={{ marginBottom: "1.5rem" }}>
            <ul style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}>
              {publishErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}

        {publishSuccess && (
          <Alert variant="success" title="Published Successfully" onClose={() => setPublishSuccess("")} style={{ marginBottom: "1.5rem" }}>
            {publishSuccess}
          </Alert>
        )}

        {saveSuccess && (
          <Alert variant="success" title="Changes Saved" style={{ marginBottom: "1.5rem" }}>
            Assessment details updated successfully.
          </Alert>
        )}

        {/* 2-Column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* LEFT COLUMN: Main Form, Document Upload, Question Generation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* General Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
                <CardDescription>
                  Configure core metadata, candidate instructions, and description.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSave}>
                <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {error && <Alert variant="error">{error}</Alert>}

                  <Input
                    label="Title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CS101: Midterm Exam"
                  />

                  <Textarea
                    label="Description"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the assessment..."
                  />

                  <Textarea
                    label="Instructions for Candidates"
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Rules, allowed materials, submission guidance..."
                  />
                </CardContent>

                <CardFooter style={{ justifyContent: "flex-end" }}>
                  <Button type="submit" variant="primary" size="md" loading={saving}>
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Step 1: Document Upload */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary-100)", color: "var(--primary-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.8125rem", fontWeight: 700 }}>
                    1
                  </span>
                  <CardTitle>Upload Question Document (DOCX)</CardTitle>
                </div>
                <CardDescription>
                  Upload your syllabus or study material in Microsoft Word (.docx) format for AI question extraction.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {uploadError && <Alert variant="error">{uploadError}</Alert>}

                <div
                  style={{
                    border: "2px dashed var(--slate-300)",
                    borderRadius: "var(--radius-lg)",
                    padding: "2rem",
                    textAlign: "center",
                    backgroundColor: "var(--slate-50)"
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--slate-700)", marginBottom: "0.25rem" }}>
                    Select a DOCX file to extract questions
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--slate-400)", marginBottom: "1rem" }}>
                    Supports Microsoft Word (.docx) up to 25MB
                  </p>

                  <input
                    type="file"
                    id="docx-file-input"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />

                  <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", alignItems: "center" }}>
                    <label htmlFor="docx-file-input">
                      <span
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid var(--slate-300)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "var(--slate-700)",
                          cursor: "pointer",
                          display: "inline-block"
                        }}
                      >
                        {file ? "Change File" : "Choose DOCX File"}
                      </span>
                    </label>

                    {file && (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={handleUpload}
                        loading={uploading}
                      >
                        Upload & Extract Text
                      </Button>
                    )}
                  </div>

                  {file && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--primary-700)", fontWeight: 500 }}>
                      Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {uploadedDocument && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.875rem 1rem",
                      backgroundColor: "var(--success-50)",
                      border: "1px solid var(--success-100)",
                      borderRadius: "var(--radius-md)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--success-700)" }}>
                        ✓ {uploadedDocument.file_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--success-600)" }}>
                        Status: {uploadedDocument.status} • Text successfully extracted
                      </div>
                    </div>

                    <Badge variant="success">Ready for AI</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: AI Question Generation */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary-100)", color: "var(--primary-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.8125rem", fontWeight: 700 }}>
                    2
                  </span>
                  <CardTitle>Generate Questions with Gemini AI</CardTitle>
                </div>
                <CardDescription>
                  Automatically generate high-quality MCQs, True/False, and subjective questions with rubrics based on the uploaded document.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {generationError && <Alert variant="error">{generationError}</Alert>}

                {generationResult && (
                  <Alert variant="success" title="Questions Generated!">
                    Successfully created <strong>{generationResult.count} questions</strong>. You can now review, edit, and reorder them.
                  </Alert>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleGenerateQuestions}
                    loading={generating}
                    disabled={!uploadedDocument && !generationResult}
                  >
                    ⚡ {generating ? "Analyzing & Generating..." : "Generate AI Questions"}
                  </Button>

                  <Link to={`/tests/${id}/questions`}>
                    <Button variant="outline" size="md">
                      Go to Question Review →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Publishing, Quick Navigation, Danger Zone */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Live Access / Publishing Card */}
            <Card>
              <CardHeader>
                <CardTitle>Public Candidate Access</CardTitle>
                <CardDescription>
                  {isPublished
                    ? "Your assessment is live and accepting participant submissions."
                    : "Publish when you are ready to allow candidates to join."}
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {isPublished ? (
                  <div>
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginBottom: "0.25rem", textTransform: "uppercase", fontWeight: 600 }}>
                        Candidate Test Code
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          color: "var(--primary-700)",
                          backgroundColor: "var(--primary-50)",
                          border: "1px solid var(--primary-200)",
                          padding: "0.5rem 1rem",
                          borderRadius: "var(--radius-md)",
                          textAlign: "center",
                          letterSpacing: "0.1em"
                        }}
                      >
                        {test.test_code}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCopyLink}
                      style={{ width: "100%", marginBottom: "0.75rem" }}
                    >
                      {copied ? "✓ Copied Link to Clipboard!" : "📋 Copy Direct Join Link"}
                    </Button>

                    <a
                      href={`/join/${test.test_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        textAlign: "center",
                        fontSize: "0.8125rem",
                        color: "var(--slate-500)",
                        textDecoration: "none"
                      }}
                    >
                      Open Candidate Portal ↗
                    </a>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1rem" }}>
                      Make sure you have reviewed your questions and configured test parameters before publishing.
                    </p>

                    <Button
                      variant="success"
                      size="md"
                      onClick={handlePublish}
                      loading={publishing}
                      style={{ width: "100%" }}
                    >
                      🚀 Publish Assessment
                    </Button>
                  </div>
                )}
              </CardContent>

              {isPublished && (
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePublish}
                    loading={publishing}
                    style={{ width: "100%" }}
                  >
                    🔄 Re-Publish / Sync Changes
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Actions</CardTitle>
              </CardHeader>

              <CardContent style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 1.5rem" }}>
                <Link to={`/tests/${id}/questions`} style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    📝 Review & Edit Questions
                  </Button>
                </Link>

                <Link to={`/tests/${id}/configure`} style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    ⚙️ Test Configuration
                  </Button>
                </Link>

                <Link to={`/tests/${id}/results`} style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    📊 View Results & Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Danger Zone Card temporarily removed from frontend */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestDetails;