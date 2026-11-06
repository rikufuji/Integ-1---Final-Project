import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import RoomCarousel from "../../components/RoomCarousel";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ── Multi-image uploader (up to 5) ── */
function ImageUploader({ files, onChange }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(incoming) {
    const valid = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const merged = [...files, ...valid].slice(0, 5);
    onChange(merged);
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false);
    handleFiles(e.dataTransfer.files);
  }

  function remove(i) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${drag ? "var(--primary)" : "var(--border)"}`,
          borderRadius: 12, cursor: "pointer",
          background: drag ? "var(--primary-light)" : "#fafafa",
          padding: "20px 16px", textAlign: "center",
          transition: "all 0.18s",
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
          {drag ? "Drop images here" : "Click or drag up to 5 photos"}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>PNG, JPG, WEBP · Max 5MB each · {files.length}/5 selected</div>
      </div>
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={URL.createObjectURL(f)} alt=""
                style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 8, display: "block", border: "2px solid var(--border)" }} />
              <button onClick={() => remove(i)} style={{
                position: "absolute", top: -6, right: -6,
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--danger)", color: "#fff",
                border: "none", fontSize: 10, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminRooms() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms,    setRooms]    = useState([]);
  const [tenants,  setTenants]  = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [tab,      setTab]      = useState("rooms");
  const [filter,   setFilter]   = useState("all");
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [trModal,  setTrModal]  = useState(null);
  const [trReason, setTrReason] = useState("");
  const [trLoading, setTrLoading] = useState(false);

  const [editTenantModal, setEditTenantModal] = useState(null);
  const [editTenantForm,  setEditTenantForm]  = useState({ monthlyRent: "", dueDate: "", moveInDate: "" });
  const [editTenantLoading, setEditTenantLoading] = useState(false);

  const emptyRoom = { roomNumber: "", type: "Shared", monthlyRent: "1200", capacity: "2", description: "", status: "available" };
  const [roomForm,   setRoomForm]   = useState(emptyRoom);
  const [imageFiles, setImageFiles] = useState([]);
  const [assignForm, setAssignForm] = useState({ tenantId: "", monthlyRent: "", dueDate: "6", moveInDate: "" });

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/user/dashboard"); return; }
    fetchAll();
    const socket = connectSocket(localStorage.getItem("token"));
    socket.on("rooms_changed", fetchAll);
    socket.on("reservation_updated", fetchAll);
    return () => { socket.off("rooms_changed", fetchAll); socket.off("reservation_updated", fetchAll); disconnectSocket(); };
  }, [user]);

  function fetchAll() {
    API.get("/api/rooms").then((r) => setRooms(r.data)).catch(() => {});
    API.get("/api/users/tenants").then((r) => setTenants(r.data)).catch(() => {});
    API.get("/api/reservations").then((r) => setTransfers(r.data.filter((x) => x.type === "transfer"))).catch(() => {});
  }

  function openAdd() { setRoomForm(emptyRoom); setImageFiles([]); setModal("add"); }

  function openEdit(room) {
    setSelected(room);
    setRoomForm({ roomNumber: room.roomNumber, type: room.type, monthlyRent: room.monthlyRent, capacity: room.capacity, description: room.description || "", status: room.status || "available" });
    setImageFiles([]);
    setModal("edit");
  }

  function openAssign(room) {
    setSelected(room);
    setAssignForm({ tenantId: "", monthlyRent: room.monthlyRent, dueDate: "6", moveInDate: new Date().toISOString().split("T")[0] });
    setModal("assign");
  }

  async function handleAddRoom(e) {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(roomForm).forEach(([k, v]) => fd.append(k, v));
      imageFiles.forEach((f) => fd.append("images", f));
      await API.post("/api/rooms", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setModal(null); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleEditRoom(e) {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(roomForm).forEach(([k, v]) => fd.append(k, v));
      imageFiles.forEach((f) => fd.append("images", f));
      await API.put(`/api/rooms/${selected.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setModal(null); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleAssign(e) {
    e.preventDefault(); setLoading(true);
    try {
      await API.post(`/api/rooms/${selected.id}/assign`, assignForm);
      setModal(null); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleUnassign(room) {
    if (!confirm(`Unassign tenant from Room ${room.roomNumber}?`)) return;
    await API.post(`/api/rooms/${room.id}/unassign`).catch(() => {});
    fetchAll();
  }

  function openEditTenant(tenant) {
    setEditTenantForm({ monthlyRent: tenant.monthlyRent || "", dueDate: tenant.dueDate || "6", moveInDate: tenant.moveInDate || "" });
    setEditTenantModal(tenant);
  }

  async function handleEditTenant(e) {
    e.preventDefault(); setEditTenantLoading(true);
    try {
      await API.put(`/api/users/tenants/${editTenantModal.id}`, editTenantForm);
      setEditTenantModal(null); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
    finally { setEditTenantLoading(false); }
  }

  async function handleTransferAction(action) {
    setTrLoading(true);
    try {
      if (action === "approve") {
        await API.put(`/api/reservations/${trModal.id}/approve`, { note: trReason });
      } else {
        if (!trReason.trim()) { alert("Please provide a reason."); setTrLoading(false); return; }
        await API.put(`/api/reservations/${trModal.id}/decline`, { note: trReason });
      }
      setTrModal(null); setTrReason(""); fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Action failed"); }
    finally { setTrLoading(false); }
  }

  if (!user) return null;

  const available  = rooms.filter((r) => r.status === "available");
  const occupied   = rooms.filter((r) => r.status === "occupied");
  const partial    = rooms.filter((r) => r.status === "partial");
  const filtered   = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);
  const unassigned = tenants.filter((t) => !t.roomNumber || String(t.roomNumber).trim() === "");
  const pendingTransfers = transfers.filter((t) => t.status === "pending");

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 0 }}>

        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1>Room Management</h1>
              <p>Manage all boarding house rooms and tenant assignments.</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Room</button>
          </div>

          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              { label: "Total Rooms",        value: rooms.length,      color: "var(--primary)", sub: "All rooms"        },
              { label: "Available",          value: available.length,  color: "var(--success)", sub: "Ready to rent"    },
              { label: "Occupied",           value: occupied.length,   color: "var(--warning)", sub: "Fully rented"     },
              { label: "Unassigned Tenants", value: unassigned.length, color: "var(--danger)",  sub: "Need a room"      },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <span className="stat-label">{s.label}</span>
                <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 0 }}>
            {[
              { key: "rooms",     label: "🏠 Rooms"                                                                },
              { key: "transfers", label: "🔄 Transfer Requests", badge: pendingTransfers.length },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
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
        </div>

        {/* ── ROOMS TAB ── */}
        {tab === "rooms" && (
        <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 6, borderBottom: "2px solid var(--border)", marginBottom: 16 }}>
            {[
              { key: "all",       label: `All (${rooms.length})`           },
              { key: "available", label: `Available (${available.length})` },
              { key: "partial",   label: `Partial (${partial.length})`     },
              { key: "occupied",  label: `Occupied (${occupied.length})`   },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: "none", background: "none", fontFamily: "inherit",
                color: filter === f.key ? "var(--primary)" : "var(--muted)",
                borderBottom: filter === f.key ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.18s",
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {filtered.map((room) => {
              const isOccupied = room.status === "occupied";
              const isPartial  = room.status === "partial";
              const tenant     = room.tenant;
              const images     = room.images || [];
              const statusColor = isOccupied ? "#fde68a" : isPartial ? "#fed7aa" : "#bbf7d0";
              const badgeBg    = isOccupied ? "rgba(254,243,199,0.95)" : isPartial ? "rgba(255,237,213,0.95)" : "rgba(220,252,231,0.95)";
              const badgeColor = isOccupied ? "#b45309" : isPartial ? "#c2410c" : "#15803d";
              const badgeText  = isOccupied ? "Occupied" : isPartial ? "Partially Occupied" : "Available";

              return (
                <div key={room.id} style={{
                  background: "var(--white)", borderRadius: 16,
                  boxShadow: "var(--shadow)", overflow: "hidden",
                  border: `2px solid ${statusColor}`,
                  transition: "transform 0.18s, box-shadow 0.18s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(59,79,168,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                >
                  {/* Carousel */}
                  <div style={{ position: "relative" }}>
                    <RoomCarousel images={images} height={180} onLightbox={setLightbox} />
                    <div style={{
                      position: "absolute", top: 12, right: 12, zIndex: 3,
                      fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                      background: badgeBg,
                      color: badgeColor,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>{badgeText}</div>
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Room {String(room.roomNumber)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{String(room.type)} · Capacity: {String(room.capacity)}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", textAlign: "right" }}>
                        ₱{Number(room.monthlyRent || 0).toLocaleString()}
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>/month</div>
                      </div>
                    </div>

                    {room.description && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>{String(room.description)}</div>
                    )}

                    {isOccupied && tenant ? (
                      <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--primary)", fontSize: 12, flexShrink: 0 }}>
                          {String(tenant.fullName || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{String(tenant.fullName || "")}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>Since {String(tenant.moveInDate || "—")}</div>
                        </div>
                      </div>
                    ) : !isOccupied ? (
                      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 14px", marginBottom: 12, fontSize: 12, color: "#15803d", fontWeight: 600, textAlign: "center" }}>
                        🟢 Ready to assign
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(room)}>✏️ Edit</button>
                      {isOccupied ? (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openEditTenant(tenant)}>👤 Edit Tenant</button>
                          <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleUnassign(room)}>Unassign</button>
                        </>
                      ) : isPartial ? (
                        <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => openAssign(room)}>Assign Tenant</button>
                      ) : (
                        <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => openAssign(room)}>Assign Tenant</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── TRANSFER REQUESTS TAB ── */}
        {tab === "transfers" && (
          <div style={{ flex: 1, padding: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Tenant","From Room","To Room","Move-in Date","Reason","Status","Action"].map((h) => (
                        <th key={h} style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 16px", textAlign: "left", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 48, fontSize: 14 }}>No transfer requests yet.</td></tr>
                    ) : transfers.map((t) => {
                      const fromRoom = tenants.find((tn) => tn.id === t.tenantId)?.roomNumber || "—";
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 14 }}>{t.tenantName}</td>
                          <td style={{ padding: "13px 16px", fontSize: 14 }}>Room {fromRoom}</td>
                          <td style={{ padding: "13px 16px", fontSize: 14 }}>Room {t.roomNumber}</td>
                          <td style={{ padding: "13px 16px", fontSize: 14 }}>{t.moveInDate}</td>
                          <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--muted)", maxWidth: 180 }}>{t.note || "—"}</td>
                          <td style={{ padding: "13px 16px" }}>
                            <span className={`badge badge-${t.status === "declined" ? "denied" : t.status}`}>{t.status}</span>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            {t.status === "pending" ? (
                              <button className="btn btn-primary btn-sm" onClick={() => { setTrModal(t); setTrReason(""); }}>Review</button>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.adminNote || "—"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TRANSFER REVIEW MODAL */}
        {trModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => { setTrModal(null); setTrReason(""); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: 460, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "24px" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>🔄 Transfer Request Review</div>
                <button onClick={() => { setTrModal(null); setTrReason(""); }} style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ background: "var(--bg)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                  {[
                    ["Tenant",      trModal.tenantName],
                    ["From Room",   `Room ${tenants.find((tn) => tn.id === trModal.tenantId)?.roomNumber || "—"}`],
                    ["To Room",     `Room ${trModal.roomNumber}`],
                    ["Move-in Date", trModal.moveInDate],
                    ["Reason",      trModal.note || "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Note for tenant (optional for approve, required for decline)</label>
                <textarea rows={3} value={trReason} onChange={(e) => setTrReason(e.target.value)}
                  placeholder="e.g. Transfer approved, please proceed to move in..."
                  style={{ resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={trLoading}
                  onClick={() => handleTransferAction("decline")}>
                  {trLoading ? "Processing..." : "❌ Decline"}
                </button>
                <button className="btn btn-success" style={{ flex: 1 }} disabled={trLoading}
                  onClick={() => handleTransferAction("approve")}>
                  {trLoading ? "Processing..." : "✅ Approve"}
                </button>
              </div>
            </div>
          </div>
        )}
        {modal === "add" && (
          <Modal title="🏠 Add New Room" onClose={() => setModal(null)}>
            <form onSubmit={handleAddRoom}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="form-group">
                  <label className="form-label">Room Number *</label>
                  <input placeholder="e.g. 121" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}>
                    <option>Shared</option><option>Single</option><option>Double</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₱) *</label>
                  <input type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input type="number" min="1" max="10" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Description</label>
                  <input placeholder="e.g. Ground floor with window view" value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Room Photos (up to 5)</label>
                  <ImageUploader files={imageFiles} onChange={setImageFiles} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Adding..." : "Add Room"}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT ROOM MODAL */}
        {modal === "edit" && selected && (
          <Modal title={`✏️ Edit Room ${selected.roomNumber}`} onClose={() => setModal(null)}>
            <form onSubmit={handleEditRoom}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}>
                    <option>Shared</option><option>Single</option><option>Double</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₱)</label>
                  <input type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Description</label>
                  <input value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">
                    Room Photos (up to 5)
                    {selected.images?.length > 0 && !imageFiles.length && (
                      <span style={{ fontSize: 11, color: "var(--success)", marginLeft: 8 }}>✓ {selected.images.length} current photo(s)</span>
                    )}
                  </label>
                  {selected.images?.length > 0 && !imageFiles.length && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {selected.images.map((img, i) => (
                        <img key={i} src={`${API_URL}/uploads/${img}`} alt=""
                          style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 8, border: "2px solid var(--border)" }} />
                      ))}
                    </div>
                  )}
                  <ImageUploader files={imageFiles} onChange={setImageFiles} />
                  {imageFiles.length > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>New photos will replace all current ones.</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* ASSIGN TENANT MODAL */}
        {modal === "assign" && selected && (
          <Modal title={`👤 Assign Tenant — Room ${selected.roomNumber}`} onClose={() => setModal(null)}>
            <form onSubmit={handleAssign}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Select Tenant *</label>
                  <select value={assignForm.tenantId} onChange={(e) => setAssignForm({ ...assignForm, tenantId: e.target.value })} required>
                    <option value="">— Choose tenant —</option>
                    {tenants
                      .slice()
                      .sort((a, b) => {
                        const aUnassigned = !a.roomNumber || String(a.roomNumber).trim() === "";
                        const bUnassigned = !b.roomNumber || String(b.roomNumber).trim() === "";
                        if (aUnassigned && !bUnassigned) return -1;
                        if (!aUnassigned && bUnassigned) return 1;
                        return 0;
                      })
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {String(t.fullName || "")} {t.roomNumber ? `(Room ${t.roomNumber})` : "(Unassigned)"}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₱) *</label>
                  <input type="number" value={assignForm.monthlyRent} onChange={(e) => setAssignForm({ ...assignForm, monthlyRent: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date (day)</label>
                  <input type="number" min="1" max="28" value={assignForm.dueDate} onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Move-in Date *</label>
                  <input type="date" value={assignForm.moveInDate} onChange={(e) => setAssignForm({ ...assignForm, moveInDate: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm" disabled={loading}>{loading ? "Assigning..." : "Assign Tenant"}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT TENANT MODAL */}
        {editTenantModal && (
          <Modal title={`👤 Edit Tenant — ${editTenantModal.fullName}`} onClose={() => setEditTenantModal(null)}>
            <form onSubmit={handleEditTenant}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₱)</label>
                  <input type="number" value={editTenantForm.monthlyRent} onChange={(e) => setEditTenantForm({ ...editTenantForm, monthlyRent: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date (day of month)</label>
                  <input type="number" min="1" max="28" value={editTenantForm.dueDate} onChange={(e) => setEditTenantForm({ ...editTenantForm, dueDate: e.target.value })} required />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Move-in Date</label>
                  <input type="date" value={editTenantForm.moveInDate} onChange={(e) => setEditTenantForm({ ...editTenantForm, moveInDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditTenantModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={editTenantLoading}>{editTenantLoading ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "zoom-out",
          }}>
            <img src={lightbox} alt="Room" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} />
            <button onClick={() => setLightbox(null)} style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
              fontSize: 24, width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        )}
      </main>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="card" style={{ width: 500, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
