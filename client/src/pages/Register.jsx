import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardContent } from "../components/ui/Card";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim()
        }
      }
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--slate-50)",
        padding: "1.5rem"
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--primary-600), var(--primary-800))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "1.5rem",
              marginBottom: "1rem",
              boxShadow: "var(--shadow-md)"
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
            Create your AssessAI account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--slate-500)" }}>
            Start creating AI-driven assessments in minutes
          </p>
        </div>

        <Card style={{ boxShadow: "var(--shadow-lg)" }}>
          <CardContent style={{ padding: "2rem" }}>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {error && (
                <Alert variant="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}

              <Input
                label="Full Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
              />

              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                helperText="Must be at least 6 characters long."
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Footer */}
        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600, color: "var(--primary-600)" }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;