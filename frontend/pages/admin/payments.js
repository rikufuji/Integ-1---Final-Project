import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));

// Format tenant ID: first+last initials + room number e.g. CM-102
function tenantCode(tenantName, roomNumber) {
  const parts = String(tenantName || "").trim().split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last  = parts[parts.length - 1]?.[0] || "";
  const room  = String(roomNumber || "").trim();
  return (first + last).toUpperCase() + (room ? "-" + room : "");
}

export default function AdminPayments() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab]           = useState("payments");
  const [payments, setPayments] = useState([]);
  const [reservations, setResvs] = useState([]);
  const [modal, setModal]       = useState(null);
  const [reason, setReason]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/user/payments"); return; }
    fetchAll();
    const socket = connectSocket(localStorage.getItem("token"));
    socket.on("reservation_new", () => fetchAll());
    socket.on("reservation_updated", () => fetchAll());
    return () => disconnectSocket();
  }, [user]);

  function fetchAll() {
    API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
    API.get("/api/reservations").then((r) => setResvs(r.data)).catch(() => {});
  }

  async function handlePaymentAction(action) {
    setLoading(true);
    try {
      if (action === "approve") {
        await API.put(`/api/payments/${modal.item.id}/approve`);
      } else {
        if (!reason.trim()) { alert("Please provide a denial reason."); setLoading(false); return; }
        await API.put(`/api/payments/${modal.item.id}/deny`, { reason });
      }
      setModal(null); setReason(""); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Action failed"); }
    finally { setLoading(false); }
  }

  async function handleResvAction(action) {
    setLoading(true);
    try {
      if (action === "approve") {
        await API.put(`/api/reservations/${modal.item.id}/approve`, { note: reason });
      } else {
        if (!reason.trim()) { alert("Please provide a reason."); setLoading(false); return; }
        await API.put(`/api/reservations/${modal.item.id}/decline`, { note: reason });
      }
      setModal(null); setReason(""); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Action failed"); }
    finally { setLoading(false); }
  }

  if (!user) return null;

  const approved  = payments.filter((p) => p.status === "approved");
  const pending   = payments.filter((p) => p.status === "pending");
  const pendingR  = reservations.filter((r) => r.status === "pending");
  const filtered  = filter === "all" ? payments : payments.filter((p) => p.status === filter);
  const filteredR = filter === "all" ? reservations : reservations.filter((r) => r.status === filter);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 0 }}>

        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <h1>Payments Dashboard</h1>
            <p>Review and manage all tenant payment requests and reservations.</p>
          </div>

          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              { label: "Approved",        value: approved.length,  color: "var(--success)", sub: approved.length === 1 ? "payment" : "payments" },
              { label: "Pending",         value: pending.length,   color: "var(--warning)", sub: pending.length === 1 ? "payment" : "payments" },
              { label: "Total Collected", value: `₱${approved.reduce((s,p)=>s+Number(p.amount||0),0).toLocaleString()}`, color: "var(--primary)", sub: "payment" },
              { label: "Reservations",    value: pendingR.length,  color: "var(--warning)", sub: "pending" },
            ].map((st) => (
              <div key={st.label} className="stat-card">
                <span className="stat-label">{st.label}</span>
                <span className="stat-value" style={{ color: st.color }}>{st.value}</span>
                {st.sub && <span className="stat-sub">{st.sub}</span>}
              </div>
            ))}
          </div>

          {/* Main tabs: Payments / Reservations */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 0 }}>
            {[
              { key: "payments",     label: `Payments (${payments.length})`         },
              { key: "reservations", label: `Reservations (${pendingR.length})`, badge: pendingR.length },
            ].map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setFilter(t.key === "reservations" ? "pending" : "all"); }} style={{
                padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: "none", background: "none", fontFamily: "inherit",
                color: tab === t.key ? "var(--primary)" : "var(--muted)",
                borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.18s", display: "flex", alignItems: "center", gap: 6,
              }}>
                {t.label}
                {t.badge > 0 && (
                  <span style={{ background: "var(--warning)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-filter tabs */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginTop: 8 }}>
            {["all","pending","approved","denied","declined"].filter((f) =>
              tab === "payments" ? f !== "declined" : f !== "denied"
            ).map((f) => {
              const count = tab === "payments"
                ? payments.filter((p) => p.status === f).length
                : reservations.filter((r) => r.status === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: "none", background: "none", fontFamily: "inherit", textTransform: "capitalize",
                  color: filter === f ? "var(--primary)" : "var(--muted)",
                  borderBottom: filter === f ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: -1, transition: "all 0.18s",
                }}>{f} {f !== "all" && `(${count})`}</button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, padding: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* ── PAYMENTS TABLE ── */}
              {tab === "payments" && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Pay ID","Tenant ID","Tenant","Room","Date","Amount","Method","Proof","Status","Action"].map((h) => (
                        <th key={h} style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 16px", textAlign: "left", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--muted)", padding: 48, fontSize: 14 }}>No payments found.</td></tr>
                    ) : filtered.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>{s(p.id)}</td>
                        <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "#6b7280", whiteSpace: "nowrap" }}>{tenantCode(p.tenantName, p.roomNumber)}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 14 }}>{s(p.tenantName)}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(p.roomNumber)}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(p.date)}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14 }}>₱{Number(s(p.amount)||0).toLocaleString()}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(p.method)}</td>
                        <td style={{ padding: "13px 16px" }}>
                          {s(p.proofImage) ? (
                            <img src={`${API_URL}/uploads/${s(p.proofImage)}`} alt="proof"
                              style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1.5px solid var(--border)" }}
                              onClick={() => setModal({ item: p, action: "review", type: "payment" })} />
                          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}><span className={`badge badge-${s(p.status)}`}>{s(p.status)}</span></td>
                        <td style={{ padding: "13px 16px" }}>
                          {s(p.status) === "pending" ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-success btn-sm" onClick={() => { setModal({ item: p, action: "review", type: "payment" }); setReason(""); }}>Review</button>
                            </div>
                          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>{s(p.denialReason) || "—"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── RESERVATIONS TABLE ── */}
              {tab === "reservations" && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Tenant","Room","Move-in Date","Down Payment","Method","Proof","Status","Action"].map((h) => (
                        <th key={h} style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 16px", textAlign: "left", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredR.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 48, fontSize: 14 }}>No reservations found.</td></tr>
                    ) : filteredR.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 14 }}>{s(r.tenantName)}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>Room {s(r.roomNumber)}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(r.moveInDate)}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14 }}>₱{Number(s(r.downPayment)||0).toLocaleString()}</td>
                        <td style={{ padding: "13px 16px", fontSize: 14 }}>{s(r.method)}</td>
                        <td style={{ padding: "13px 16px" }}>
                          {s(r.proofImage) ? (
                            <a href={`${API_URL}/uploads/${s(r.proofImage)}`} target="_blank" rel="noreferrer"
                              style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>View</a>
                          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span className={`badge badge-${s(r.status) === "declined" ? "denied" : s(r.status)}`}>{s(r.status)}</span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          {s(r.status) === "pending" ? (
                            <button className="btn btn-primary btn-sm" onClick={() => { setModal({ item: r, type: "reservation" }); setReason(""); }}>Review</button>
                          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>{s(r.adminNote) || "—"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── REVIEW MODAL ── */}
        {modal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => { setModal(null); setReason(""); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: 520, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>
                  {modal.type === "payment" ? "💳 Payment Review" : "🏠 Reservation Review"}
                </div>
                <button onClick={() => { setModal(null); setReason(""); }}
                  style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ padding: "16px 24px 24px" }}>

                {/* Proof image — full size for verification */}
                {s(modal.type === "payment" ? modal.item.proofImage : modal.item.proofImage) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Proof of Payment</div>
                    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "2px solid var(--border)", background: "#f8faff" }}>
                      <img
                        src={`${API_URL}/uploads/${s(modal.item.proofImage)}`}
                        alt="Proof of payment"
                        style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }}
                      />
                      <a href={`${API_URL}/uploads/${s(modal.item.proofImage)}`} target="_blank" rel="noreferrer"
                        style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, textDecoration: "none" }}>
                        🔍 Open full size
                      </a>
                    </div>
                  </div>
                )}

                {!s(modal.item.proofImage) && (
                  <div style={{ marginBottom: 16, background: "#fef3c7", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                    ⚠️ No proof of payment uploaded by tenant.
                  </div>
                )}

                {/* Payment / Reservation details */}
                <div style={{ background: "var(--bg)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {(modal.type === "payment" ? [
                      ["Tenant",  s(modal.item.tenantName)],
                      ["Room",    s(modal.item.roomNumber)],
                      ["Date",    s(modal.item.date)],
                      ["Amount",  `₱${Number(s(modal.item.amount)||0).toLocaleString()}`],
                      ["Method",  s(modal.item.method)],
                      ["Message", s(modal.item.message) || "—"],
                    ] : [
                      ["Tenant",       s(modal.item.tenantName)],
                      ["Room",         `Room ${s(modal.item.roomNumber)}`],
                      ["Move-in Date", s(modal.item.moveInDate)],
                      ["Down Payment", `₱${Number(s(modal.item.downPayment)||0).toLocaleString()}`],
                      ["Method",       s(modal.item.method)],
                      ["Note",         s(modal.item.note) || "—"],
                    ]).map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Only show actions if still pending */}
                {s(modal.item.status) === "pending" ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        {modal.type === "payment" ? "Denial reason (required if denying)" : "Note for tenant (optional for approve, required for decline)"}
                      </label>
                      <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Receipt appears invalid, please resubmit..."
                        style={{ resize: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-danger" style={{ flex: 1 }} disabled={loading}
                        onClick={() => modal.type === "payment" ? handlePaymentAction("deny") : handleResvAction("decline")}>
                        {loading ? "Processing..." : "❌ Deny / Decline"}
                      </button>
                      <button className="btn btn-success" style={{ flex: 1 }} disabled={loading}
                        onClick={() => modal.type === "payment" ? handlePaymentAction("approve") : handleResvAction("approve")}>
                        {loading ? "Processing..." : "✅ Approve"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    background: s(modal.item.status) === "approved" ? "#dcfce7" : "#fee2e2",
                    color: s(modal.item.status) === "approved" ? "#15803d" : "#b91c1c",
                    borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "center",
                  }}>
                    {s(modal.item.status) === "approved" ? "✅ This payment was approved." : `❌ ${s(modal.item.denialReason) || s(modal.item.adminNote) || "Denied/Declined."}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
