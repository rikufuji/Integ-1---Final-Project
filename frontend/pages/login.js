import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./_app";
import API from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/login", form);
      login(data.user, data.token);
      router.push(data.user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <img src="/logo.png" alt="BoardEase" onError={(e) => { e.target.style.display = "none"; }} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 10, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1e2340", lineHeight: 1.2 }}>BoardEase</span>
            <p className="auth-tagline" style={{ margin: 0 }}>Your home away from home, managed with ease.</p>
          </div>
        </div>
        <h2 className="auth-title" style={{ textAlign: "center" }}>Sign In</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <a href="/register">Create one</a>
        </div>
      </div>
    </div>
  );
}
