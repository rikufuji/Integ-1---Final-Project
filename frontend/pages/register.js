import { useState } from "react";
import { useRouter } from "next/router";
import API from "../lib/api";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", fullName: "", phone: "", address: "", emergencyContact: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/api/auth/register", form);
      router.push("/?registered=1");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <img src="/logo.png" alt="BoardEase" onError={(e) => { e.target.style.display = "none"; }} />
          <span>BoardEase</span>
        </div>
        <h2 className="auth-title">Create Account</h2>

        <form onSubmit={handleSubmit}>
          {[
            { label: "Full Name", key: "fullName", type: "text", required: true },
            { label: "Username", key: "username", type: "text", required: true },
            { label: "Password", key: "password", type: "password", required: true },
            { label: "Phone Number", key: "phone", type: "tel" },
            { label: "Address", key: "address", type: "text" },
            { label: "Emergency Contact", key: "emergencyContact", type: "text" },
          ].map(({ label, key, type, required }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input type={type} placeholder={label} required={required} {...f(key)} />
            </div>
          ))}
          {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <a href="/">Sign in</a>
        </div>
      </div>
    </div>
  );
}
