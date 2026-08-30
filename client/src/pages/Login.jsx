import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
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
      <div style={{ width: "100%", maxWidth: "420px" }}>
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
            Welcome back to AssessAI
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--slate-500)" }}>
            Sign in to manage and evaluate your assessments
          </p>
        </div>

        <Card style={{ boxShadow: "var(--shadow-lg)" }}>
          <CardContent style={{ padding: "2rem" }}>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {error && (
                <Alert variant="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}

              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register Footer */}
        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--slate-500)", marginTop: "1.5rem" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 600, color: "var(--primary-600)" }}>
            Create one free →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;