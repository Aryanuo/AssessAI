import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTests, deleteTest } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import { LoadingSpinner, EmptyState } from "../components/ui/Alert";
import { ConfirmDialog } from "../components/ui/Modal";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Deletion modal state
  const [deletingTestId, setDeletingTestId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadTests() {
      try {
        setLoading(true);
        setError("");
        const data = await getTests();
        setTests(data.tests || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load your assessments.");
      } finally {
        setLoading(false);
      }
    }

    loadTests();
  }, []);

  async function handleConfirmDelete() {
    if (!deletingTestId) return;

    try {
      setDeleteLoading(true);
      await deleteTest(deletingTestId);
      setTests((current) => current.filter((t) => t.id !== deletingTestId));
      setDeletingTestId(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete test.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Calculate stats
  const totalCount = tests.length;
  const publishedCount = tests.filter((t) => t.status === "PUBLISHED").length;
  const draftCount = tests.filter((t) => t.status === "DRAFT" || !t.status).length;

  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const q = searchQuery.toLowerCase();
    return tests.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.test_code?.toLowerCase().includes(q)
    );
  }, [tests, searchQuery]);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Assessments Dashboard
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
            Welcome back, <strong>{user?.user_metadata?.name || user?.email?.split("@")[0]}</strong>. Manage and evaluate your tests below.
          </p>
        </div>

        <Link to="/tests/create">
          <Button variant="primary" size="md">
            <span>+</span> Create New Assessment
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError("")} style={{ marginBottom: "1.5rem" }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}
      >
        <Card>
          <CardContent style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Assessments
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--slate-900)", marginTop: "0.25rem" }}>
              {totalCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--success-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ● Published & Live
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--success-700)", marginTop: "0.25rem" }}>
              {publishedCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ○ Drafts in Progress
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--slate-700)", marginTop: "0.25rem" }}>
              {draftCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tests Grid */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--slate-900)" }}>
          Your Tests ({filteredTests.length})
        </h2>

        {tests.length > 0 && (
          <input
            type="text"
            placeholder="🔍 Search tests by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "280px", padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
          />
        )}
      </div>

      {loading && <LoadingSpinner text="Loading your assessments..." />}

      {!loading && tests.length === 0 && (
        <EmptyState
          icon="📝"
          title="No assessments created yet"
          description="Create your first assessment to start uploading course documents and generating AI-evaluated questions."
          action={
            <Link to="/tests/create">
              <Button variant="primary" size="md">
                + Create Your First Assessment
              </Button>
            </Link>
          }
        />
      )}

      {!loading && tests.length > 0 && filteredTests.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No matching tests found"
          description={`No tests match your search query "${searchQuery}". Try a different keyword.`}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          }
        />
      )}

      {!loading && filteredTests.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {filteredTests.map((test) => {
            const isPublished = test.status === "PUBLISHED";

            return (
              <Card
                key={test.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  cursor: "default"
                }}
              >
                <CardContent style={{ flexGrow: 1, padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <Badge variant={isPublished ? "success" : "default"}>
                      {isPublished ? "● PUBLISHED" : "○ DRAFT"}
                    </Badge>

                    {test.test_code && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          backgroundColor: "var(--slate-100)",
                          padding: "0.2rem 0.4rem",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--slate-600)"
                        }}
                      >
                        {test.test_code}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "var(--slate-900)",
                      marginBottom: "0.5rem",
                      lineHeight: 1.3
                    }}
                  >
                    {test.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--slate-500)",
                      lineHeight: 1.5,
                      marginBottom: "1rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {test.description || "No description provided."}
                  </p>

                  <div style={{ fontSize: "0.75rem", color: "var(--slate-400)", display: "flex", gap: "0.75rem" }}>
                    {test.created_at && (
                      <span>Created {new Date(test.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </CardContent>

                {/* Card Actions */}
                <div
                  style={{
                    padding: "0.875rem 1.25rem",
                    backgroundColor: "var(--slate-50)",
                    borderTop: "1px solid var(--slate-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem"
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link to={`/tests/${test.id}`}>
                      <Button variant="primary" size="sm">
                        Open Workspace →
                      </Button>
                    </Link>

                    {isPublished && (
                      <Link to={`/tests/${test.id}/results`}>
                        <Button variant="outline" size="sm">
                          📊 Results
                        </Button>
                      </Link>
                    )}
                  </div>
                  {/* Delete test button temporarily removed from frontend */}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingTestId)}
        onClose={() => setDeletingTestId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment?"
        message="Are you sure you want to delete this assessment? All associated questions, documents, configuration, and student submissions will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Assessment"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

export default Dashboard;