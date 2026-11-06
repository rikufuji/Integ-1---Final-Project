import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";

export default function UserPayments() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [profile, setProfile]   = useState(null);
  const [payInfo, setPayInfo]   = useState(null);
  const [form, setForm]         = useState({ amount: "", method: "GCash", message: "", date: "" });
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    fetchPayments();
    API.get("/api/users/profile").then((r) => setProfile(r.data)).catch(() => {});
    API.get("/api/settings").then((r) => setPayInfo(r.data)).catch(() => {});
  }, [user]);

  function fetchPayments() {
    API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("proofImage", file);
      await API.post("/api/payments", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess("Payment submitted successfully!");
      setForm({ amount: "", method: "GCash", message: "", date: "" });
      setFile(null);
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed");
    } finally { setLoading(false); }
  }

  if (!user) return null;

  // safe string coercion — prevents [object Object]
  const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));

  const src = profile || user;
  const approvedPayments = payments.filter((p) => p.status === "approved");
  const pendingPayments  = payments.filter((p) => p.status === "pending");
  const totalPaid        = approvedPayments.reduce((sum, p) => sum + Number(s(p.amount) || 0), 0);
  const monthlyRent      = Number(s(src.monthlyRent)) || 0;
  const dueDate          = s(src.dueDate) || "";
  const filtered         = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: 0 }}>

        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <h1>Payments Dashboard</h1>
            <p>View and manage your payment transactions.</p>
          </div>

          {/* Top row: form LEFT, summary RIGHT */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 20 }}>

            {/* Submit Payment Form */}
            <div className="card">
              <div className="card-title">Submit Payment Request</div>

              {/* Block unassigned tenants */}
              {!s(src.roomNumber) ? (
                <div style={{ background: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: 12, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>No Room Assigned</div>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                    You need to be assigned a room before you can submit a payment.<br />
                    Please contact the admin or submit a <a href="/user/rooms" style={{ color: "#b45309", fontWeight: 700 }}>room reservation</a> first.
                  </div>
                </div>
              ) : (
                <>
              {/* Owner payment info banner */}
              {payInfo && (payInfo.gcashNumber || payInfo.bankAccount) && (
                <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    💳 Send your payment to
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {payInfo.gcashQR && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <img src={`http://localhost:5000/uploads/${payInfo.gcashQR}`} alt="QR Code"
                          style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 8, border: "1.5px solid #86efac", background: "#fff" }} />
                        <div style={{ fontSize: 9, color: "#1d4ed8", marginTop: 3 }}>GCash QR</div>
                      </div>
                    )}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {payInfo.gcashNumber && (
                        <div>
                          <div style={{ fontSize: 9, color: "#1d4ed8", fontWeight: 600, textTransform: "uppercase" }}>GCash Number</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>{payInfo.gcashNumber}</div>
                        </div>
                      )}
                      {payInfo.bankAccount && (
                        <div>
                          <div style={{ fontSize: 9, color: "#1d4ed8", fontWeight: 600, textTransform: "uppercase" }}>Bank Account Number</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>{payInfo.bankAccount}</div>
                        </div>
                      )}
                      {payInfo.bankHolder && (
                        <div>
                          <div style={{ fontSize: 9, color: "#1d4ed8", fontWeight: 600, textTransform: "uppercase" }}>Account Name</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{payInfo.bankHolder}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" placeholder="Enter amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Method</label>
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    <option>GCash</option>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Proof of Payment</label>
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} style={{ padding: "8px" }} />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Message (Optional)</label>
                  <textarea rows={2} placeholder="Add a note..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={{ resize: "none" }} />
                </div>
                {error   && <p className="form-error"   style={{ gridColumn: "1/-1", marginBottom: 4 }}>{error}</p>}
                {success && <p style={{ gridColumn: "1/-1", color: "var(--success)", fontSize: 13, marginBottom: 4 }}>{success}</p>}
                <button type="submit" className="btn btn-primary" style={{ gridColumn: "1/-1" }} disabled={loading}>
                  {loading ? "Submitting..." : "💳 Submit Payment"}
                </button>
              </form>
              </>
              )}
            </div>

            {/* Payment Summary */}
            <div className="card" style={{ alignSelf: "start" }}>
              <div className="card-title">Payment Summary</div>
              {[
                ["Total Paid",    totalPaid > 0 ? `₱${totalPaid.toLocaleString()}` : "₱0",                          "var(--success)"],
                ["Monthly Rent",  monthlyRent > 0 ? `₱${monthlyRent.toLocaleString()}` : "₱0",                      "var(--primary)"],
                ["Next Due Date", dueDate ? `${dueDate}th of month` : "—",                                           "var(--warning)"],
                ["Pending",       `${pendingPayments.length} payment${pendingPayments.length !== 1 ? "s" : ""}`,     "var(--warning)"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, borderBottom: "2px solid var(--border)" }}>
            {["all", "pending", "approved", "denied"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: "none", background: "none", fontFamily: "inherit", textTransform: "capitalize",
                color: filter === f ? "var(--primary)" : "var(--muted)",
                borderBottom: filter === f ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.18s",
              }}>{f} {f !== "all" && `(${payments.filter((p) => p.status === f).length})`}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            <div style={{ overflowY: "auto", maxHeight: 400 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Date", "Amount", "Method", "Status", "Note"].map((h) => (
                      <th key={h} style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 16px", textAlign: "left", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 48, fontSize: 14 }}>No payments yet.</td></tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(p.date)}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14 }}>₱{Number(s(p.amount) || 0).toLocaleString()}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(p.method)}</td>
                        <td style={{ padding: "13px 16px" }}><span className={`badge badge-${s(p.status)}`}>{s(p.status)}</span></td>
                        <td style={{ padding: "13px 16px", color: "var(--muted)", fontSize: 12 }}>{s(p.denialReason) || s(p.message) || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
