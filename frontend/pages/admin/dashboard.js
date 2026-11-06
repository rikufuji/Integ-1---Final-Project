import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import RoomCarousel from "../../components/RoomCarousel";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

/* ── Donut chart via SVG ── */
function Donut({ pct, color, label }) {
  const r = 44, cx = 52, cy = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={12} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill="#374151">{pct}%</text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms]       = useState([]);
  const [tenants, setTenants]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [editPay, setEditPay]   = useState(false);
  const [payForm, setPayForm]   = useState({});
  const [payFile, setPayFile]   = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [qrTs, setQrTs] = useState(Date.now());
  const [logs, setLogs]         = useState([]);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({ fullName: "", username: "", password: "", phone: "", birthday: "", address: "", emergencyContact: "", roomNumber: "", monthlyRent: "1200", dueDate: "6", moveInDate: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState("");

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/user/dashboard"); return; }
    API.get("/api/rooms").then((r) => setRooms(r.data)).catch(() => {});
    API.get("/api/users/tenants").then((r) => setTenants(r.data)).catch(() => {});
    API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
    API.get("/api/settings").then((r) => { setSettings(r.data); setPayForm(r.data); }).catch(() => {});
    API.get("/api/xml/logs").then((r) => setLogs(r.data)).catch(() => {});
    const socket = connectSocket(localStorage.getItem("token"));
    socket.on("payment_notification", () => {
      API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
      API.get("/api/xml/logs").then((r) => setLogs(r.data)).catch(() => {});
    });
    socket.on("reservation_new", () => {
      API.get("/api/xml/logs").then((r) => setLogs(r.data)).catch(() => {});
    });
    socket.on("rooms_changed", () => {
      API.get("/api/rooms").then((r) => setRooms(r.data)).catch(() => {});
    });
    return () => disconnectSocket();
  }, [user]);

  if (!user) return null;

  const approved    = payments.filter((p) => p.status === "approved");
  const pending     = payments.filter((p) => p.status === "pending");
  const approvedPct = payments.length ? Math.round((approved.length / payments.length) * 100) : 0;
  const pendingPct  = payments.length ? 100 - approvedPct : 0;
  const availableRooms = rooms
    .filter((r) => r.status === "available")
    .slice()
    .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));

  async function handleSavePayInfo(e) {
    e.preventDefault(); setPayLoading(true);
    try {
      const fd = new FormData();
      ["gcashName","gcashNumber","bankName","bankAccount","bankHolder","paymentNote"].forEach((k) => fd.append(k, payForm[k] || ""));
      if (payFile) fd.append("gcashQR", payFile);
      const r = await API.put("/api/settings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSettings(r.data.settings); setPayForm(r.data.settings);
      setEditPay(false); setPayFile(null); setQrTs(Date.now());
    } catch (err) { alert(err.response?.data?.error || "Failed to save"); }
    finally { setPayLoading(false); }
  }

  async function handleAddTenant(e) {
    e.preventDefault();
    setAddError(""); setAddLoading(true);
    try {
      await API.post("/api/auth/register", { ...tenantForm, role: "tenant" });
      // assign room if selected
      if (tenantForm.roomNumber) {
        const room = rooms.find((r) => String(r.roomNumber) === String(tenantForm.roomNumber));
        if (room) {
          const newTenants = await API.get("/api/users/tenants");
          const added = newTenants.data.find((t) => t.username === tenantForm.username);
          if (added) await API.post(`/api/rooms/${room.id}/assign`, { tenantId: added.id, monthlyRent: tenantForm.monthlyRent, dueDate: tenantForm.dueDate, moveInDate: tenantForm.moveInDate });
        }
      }
      setShowAddTenant(false);
      setTenantForm({ fullName: "", username: "", password: "", phone: "", birthday: "", address: "", emergencyContact: "", roomNumber: "", monthlyRent: "1200", dueDate: "6", moveInDate: "" });
      API.get("/api/users/tenants").then((r) => setTenants(r.data)).catch(() => {});
      API.get("/api/rooms").then((r) => setRooms(r.data)).catch(() => {});
    } catch (err) { setAddError(err.response?.data?.error || "Failed to add tenant"); }
    finally { setAddLoading(false); }
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: 0 }}>Admin Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>See the latest updates on your boarding house.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowAddTenant(true)}>+ Add Tenant</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--white)", padding: "8px 14px", borderRadius: 12, boxShadow: "var(--shadow)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--primary)", fontSize: 14 }}>
                {String(user.fullName || "A")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{String(user.fullName || "").split(" ")[0]}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{String(user.role || "admin")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid: left + right ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 20,
          alignItems: "start",
        }}>

          {/* ── LEFT: Available Rooms ── */}
          <div style={{
            background: "var(--white)",
            borderRadius: 20,
            boxShadow: "var(--shadow)",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "80vh",
            overflow: "hidden",
            alignSelf: "start",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Available Rooms <span style={{ fontSize: 18 }}>📌</span>
              </h3>
              <a href="/admin/rooms" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>View all →</a>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              paddingRight: 8,
              paddingBottom: 4,
              scrollbarWidth: "thin",
              scrollbarColor: "var(--primary) transparent",
            }}>
              {availableRooms.map((room) => (
                  <div key={room.id} style={{
                    background: "#fafafa", borderRadius: 16,
                    border: "1px solid var(--border)",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    flexWrap: "wrap",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    minHeight: 112,
                  }}>
                    <div style={{
                      width: 112, height: 84, borderRadius: 12, flexShrink: 0,
                      overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}>
                      <RoomCarousel images={room.images || []} height={84} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>Room {String(room.roomNumber)}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", lineHeight: 1.2, whiteSpace: "nowrap" }}>₱{Number(room.monthlyRent || 0).toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>Rent</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", lineHeight: 1.2, whiteSpace: "nowrap" }}>{String(room.type || "Shared")}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>Type</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", lineHeight: 1.2, whiteSpace: "nowrap" }}>Available</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>Status</div>
                        </div>
                      </div>
                    </div>

                    <a href="/admin/rooms" className="btn btn-success btn-sm" style={{ flexShrink: 0, whiteSpace: "nowrap", alignSelf: "center", marginLeft: 12 }}>Assign</a>
                  </div>
              ))}

              {availableRooms.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: 40, fontSize: 14 }}>
                  {rooms.length === 0
                    ? <>No rooms yet. <a href="/admin/rooms" style={{ color: "var(--primary)", fontWeight: 600 }}>Add rooms →</a></>
                    : "No available rooms right now."}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Accounts Receivable */}
            <div style={{ background: "var(--white)", borderRadius: 20, boxShadow: "var(--shadow)", padding: "24px 28px" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Accounts Receivable</h3>
              {payments.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>
                  No payment data yet. Accounts receivable will appear once tenants start making payments.
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                  <Donut pct={approvedPct} color="#22c55e" label="Total Rents paid" />
                  <Donut pct={pendingPct}  color="#ef4444" label="Pending Rents"    />
                </div>
              )}
            </div>

            {/* Payment Info centered */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              {/* Payment Info Card */}
              <div style={{ background: "var(--white)", borderRadius: 20, boxShadow: "var(--shadow)", padding: "20px 24px", width: "50%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>💳 Payment Info</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditPay((v) => !v)}>
                      {editPay ? "Cancel" : "✏️ Edit"}
                    </button>
                  </div>
                  {editPay ? (
                    <form onSubmit={handleSavePayInfo}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {[
                          { label: "GCash Number",        key: "gcashNumber" },
                          { label: "Bank Account Number", key: "bankAccount" },
                          { label: "Account Name",        key: "bankHolder"  },
                        ].map(({ label, key }) => (
                          <div key={key} className="form-group">
                            <label className="form-label">{label}</label>
                            <input value={payForm[key] || ""} onChange={(e) => setPayForm({ ...payForm, [key]: e.target.value })} placeholder={label} />
                          </div>
                        ))}
                        <div className="form-group">
                          <label className="form-label">GCash QR Code</label>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                            {settings?.gcashQR && !payFile
                              ? "✓ A QR code is already uploaded. Upload a new file below to replace it."
                              : "Upload a clear image of your GCash QR code so tenants can scan and pay directly."}
                          </div>
                          <input type="file" accept="image/*" style={{ padding: 8 }} onChange={(e) => setPayFile(e.target.files[0])} />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} disabled={payLoading}>
                        {payLoading ? "Saving..." : "Save Payment Info"}
                      </button>
                    </form>
                  ) : settings?.gcashNumber || settings?.bankAccount ? (
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      {settings.gcashQR && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <img src={`http://localhost:5000/uploads/${settings.gcashQR}?t=${qrTs}`} alt="QR"
                            style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 8, border: "1.5px solid var(--border)" }} />
                          <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 3 }}>GCash QR</div>
                        </div>
                      )}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        {settings.gcashNumber && (
                          <div>
                            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>GCash Number</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e" }}>{settings.gcashNumber}</div>
                          </div>
                        )}
                        {settings.bankAccount && (
                          <div>
                            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Bank Account Number</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>{settings.bankAccount}</div>
                          </div>
                        )}
                        {settings.bankHolder && (
                          <div>
                            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Account Name</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{settings.bankHolder}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, padding: "10px 0" }}>
                      No payment info set yet. Click Edit to add details.
                    </div>
                  )}
                </div>
            </div>

            {/* Notifications — full width, same as Accounts Receivable */}
            <div style={{ background: "var(--white)", borderRadius: 20, boxShadow: "var(--shadow)", padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔔 Notifications</h3>
                <a href="/admin/reports" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>View all logs →</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 340, overflowY: "auto" }}>
                {logs.filter((log) => ["payment", "reservation", "profile", "admin"].includes(String(log.type || ""))).length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No activity yet.</div>
                ) : (
                  logs
                    .filter((log) => ["payment", "reservation", "profile", "admin"].includes(String(log.type || "")))
                    .slice().reverse().slice(0, 20).map((log, i, arr) => {
                    const type = String(log.type || "");
                    const icon = type === "payment" ? "💳" : type === "auth" ? "🔐" : type === "reservation" ? "🏠" : type === "profile" ? "👤" : type === "admin" ? "⚙️" : type === "message" ? "💬" : type === "group" ? "👥" : "📋";
                    const color = type === "payment" ? "#3b82f6" : type === "auth" ? "#8b5cf6" : type === "reservation" ? "#f59e0b" : type === "profile" ? "#22c55e" : type === "admin" ? "#ef4444" : "#6b7280";
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{String(log.detail || "")}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              {log.timestamp ? new Date(String(log.timestamp)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: color + "18", color, flexShrink: 0, textTransform: "uppercase" }}>{type}</span>
                        </div>
                        {i < arr.length - 1 && <div style={{ height: 1, background: "var(--border)" }} />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ADD TENANT MODAL ── */}
        {showAddTenant && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div className="card" style={{ width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Add a new tenant</div>
                <button onClick={() => setShowAddTenant(false)} style={{ fontSize: 20, color: "var(--muted)", cursor: "pointer" }}>✕</button>
              </div>
              <form onSubmit={handleAddTenant} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                {[
                  { label: "Full Name",         key: "fullName",         type: "text",     required: true  },
                  { label: "Username",           key: "username",         type: "text",     required: true  },
                  { label: "Password",           key: "password",         type: "password", required: true  },
                  { label: "Phone",              key: "phone",            type: "text",     required: false },
                  { label: "Birthday",           key: "birthday",         type: "date",     required: false },
                  { label: "Emergency Contact",  key: "emergencyContact", type: "text",     required: false },
                ].map(({ label, key, type, required }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input type={type} value={tenantForm[key]} required={required}
                      onChange={(e) => setTenantForm({ ...tenantForm, [key]: e.target.value })} />
                  </div>
                ))}
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Address</label>
                  <input type="text" value={tenantForm.address} onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Room</label>
                  <select value={tenantForm.roomNumber} onChange={(e) => setTenantForm({ ...tenantForm, roomNumber: e.target.value })}>
                    <option value="">— No room yet —</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.roomNumber}>Room {String(r.roomNumber)} ({String(r.type)})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₱)</label>
                  <input type="number" value={tenantForm.monthlyRent} onChange={(e) => setTenantForm({ ...tenantForm, monthlyRent: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date (day)</label>
                  <input type="number" min="1" max="28" value={tenantForm.dueDate} onChange={(e) => setTenantForm({ ...tenantForm, dueDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Move-in Date</label>
                  <input type="date" value={tenantForm.moveInDate} onChange={(e) => setTenantForm({ ...tenantForm, moveInDate: e.target.value })} />
                </div>
                {addError && <p className="form-error" style={{ gridColumn: "1/-1" }}>{addError}</p>}
                <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddTenant(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>
                    {addLoading ? "Adding..." : "Add Tenant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
