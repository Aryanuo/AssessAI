import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createTest } from "../services/api";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";

function CreateTest() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Assessment title is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await createTest({
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null
      });

      navigate(`/tests/${data.test.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create assessment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
      {/* Back Link */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          to="/dashboard"
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
          ← Back to Dashboard
        </Link>
      </div>

      <Card style={{ boxShadow: "var(--shadow-md)" }}>
        <CardHeader>
          <CardTitle style={{ fontSize: "1.375rem" }}>Create New Assessment</CardTitle>
          <CardDescription>
            Set up the basic details for your assessment. You can upload course material and generate AI questions in the next step.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {error && (
              <Alert variant="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Input
              label="Assessment Title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS101: Midterm Exam - Java Fundamentals"
              helperText="A clear, identifiable title for candidates and creators."
            />

            <Textarea
              label="Description (Optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of topics covered in this assessment..."
              helperText="Summary visible to candidates on the assessment join screen."
            />

            <Textarea
              label="Instructions for Candidates (Optional)"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Calculators are permitted. Ensure you have an uninterrupted internet connection..."
              helperText="Important rules displayed to test-takers before they begin."
            />
          </CardContent>

          <CardFooter style={{ justifyContent: "flex-end", gap: "0.75rem" }}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
            >
              Create Assessment & Continue →
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default CreateTest;