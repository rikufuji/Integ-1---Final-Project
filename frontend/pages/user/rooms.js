import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import RoomCarousel from "../../components/RoomCarousel";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));

export default function UserRooms() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms]             = useState([]);
  const [filter, setFilter]           = useState("all");
  const [selected, setSelected]       = useState(null);
  const [myResvs, setMyResvs]         = useState([]);
  const [lightbox, setLightbox]       = useState(null);
  const [resvForm, setResvForm]       = useState({ moveInDate: "", downPayment: "", method: "GCash", note: "" });
  const [resvFile, setResvFile]       = useState(null);
  const [resvLoading, setResvLoading] = useState(false);
  const [resvSuccess, setResvSuccess] = useState("");
  const [resvError, setResvError]     = useState("");

  function fetchRooms() {
    API.get("/api/rooms").then((r) => setRooms(r.data)).catch(() => {});
  }

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    fetchRooms();
    API.get("/api/reservations").then((r) => setMyResvs(r.data)).catch(() => {});
    const socket = connectSocket(localStorage.getItem("token"));
    socket.on("rooms_changed", fetchRooms);
    socket.on("reservation_updated", () => {
      API.get("/api/reservations").then((r) => setMyResvs(r.data)).catch(() => {});
    });
    return () => {
      socket.off("rooms_changed", fetchRooms);
      socket.off("reservation_updated");
      disconnectSocket();
    };
  }, [user]);

  function openModal(room) {
    setSelected(room);
    setResvForm({ moveInDate: "", downPayment: "", method: "GCash", note: "" });
    setResvFile(null); setResvSuccess(""); setResvError("");
  }

  if (!user) return null;

  const available = rooms.filter((r) => r.status === "available");
  const occupied  = rooms.filter((r) => r.status === "occupied");
  const partial   = rooms.filter((r) => r.status === "partial");
  const filtered  = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);
  const hasRoom   = s(user.roomNumber) !== "";

  async function handleReserve(e) {
    e.preventDefault();
    setResvError(""); setResvSuccess(""); setResvLoading(true);
    try {
      const fd = new FormData();
      fd.append("roomId",      selected.id);
      fd.append("roomNumber",  selected.roomNumber);
      fd.append("moveInDate",  resvForm.moveInDate);
      fd.append("downPayment", resvForm.downPayment || "0");
      fd.append("method",      resvForm.method || "GCash");
      fd.append("note",        resvForm.note);
      fd.append("type",        hasRoom ? "transfer" : "reservation");
      if (resvFile) fd.append("proofImage", resvFile);
      await API.post("/api/reservations", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResvSuccess(hasRoom ? "Transfer request submitted! The admin will review your request." : "Reservation submitted! The admin will review your request.");
      API.get("/api/reservations").then((r) => setMyResvs(r.data)).catch(() => {});
    } catch (err) {
      setResvError(err.response?.data?.error || "Submission failed.");
    } finally { setResvLoading(false); }
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <h1>Rooms</h1>
            <p>Browse all rooms. Click an available room to reserve it.</p>
          </div>

          <div style={{ display: "flex", gap: 6, borderBottom: "2px solid var(--border)" }}>
            {[
              { key: "all",       label: `All (${rooms.length})`                    },
              { key: "available", label: `Available (${available.length})`          },
              { key: "partial",   label: `Partially Occupied (${partial.length})`   },
              { key: "occupied",  label: `Occupied (${occupied.length})`            },
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
        </div>

        {/* Room grid */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {filtered.map((room) => {
              const isOccupied = room.status === "occupied";
              const isPartial  = room.status === "partial";
              const isMyRoom   = hasRoom && String(room.roomNumber) === String(user.roomNumber);
              const images     = Array.isArray(room.images) ? room.images : (room.images ? String(room.images).split(",").filter(Boolean) : []);
              const hasPending = myResvs.some((r) => r.roomId === room.id && r.status === "pending");
              const capacity   = Number(room.capacity) || 1;
              const tenantCount = room.tenants?.length || (isOccupied ? capacity : isPartial ? 1 : 0);
              const spotsLeft  = capacity - tenantCount;

              return (
                <div key={room.id} style={{
                  background: "var(--white)", borderRadius: 16,
                  boxShadow: "var(--shadow)", overflow: "hidden",
                  border: `2px solid ${isMyRoom ? "#bfdbfe" : isOccupied ? "#fde68a" : isPartial ? "#fed7aa" : "#bbf7d0"}`,
                  transition: "transform 0.18s, box-shadow 0.18s",
                  cursor: "pointer",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(59,79,168,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                  onClick={() => openModal(room)}
                >
                  {/* Carousel — stop propagation so swiping doesn't open modal */}
                  <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                    <RoomCarousel
                      images={images}
                      height={180}
                      onLightbox={setLightbox}
                    />
                    {/* Status badge */}
                    <div style={{
                      position: "absolute", top: 12, right: 12, zIndex: 3,
                      fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                      background: isMyRoom ? "rgba(219,234,254,0.95)" : isOccupied ? "rgba(254,243,199,0.95)" : isPartial ? "rgba(255,237,213,0.95)" : "rgba(220,252,231,0.95)",
                      color: isMyRoom ? "#1d4ed8" : isOccupied ? "#b45309" : isPartial ? "#c2410c" : "#15803d",
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                      {isMyRoom ? "Your Room" : isOccupied ? "Occupied" : isPartial ? "Partially Occupied" : "Available"}
                    </div>
                    {hasPending && (
                      <div style={{
                        position: "absolute", top: 12, left: 12, zIndex: 3,
                        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                        background: "rgba(254,243,199,0.95)", color: "#b45309",
                      }}>⏳ Reserved</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Room {s(room.roomNumber)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s(room.type)} · Capacity: {s(room.capacity)}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", textAlign: "right" }}>
                        ₱{Number(room.monthlyRent || 0).toLocaleString()}
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>/month</div>
                      </div>
                    </div>
                    {room.description && (
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 10 }}>{s(room.description)}</div>
                    )}
                    {/* Occupancy indicator — always render to keep consistent height */}
                    <div style={{ fontSize: 12, color: isOccupied ? "#ef4444" : isPartial ? "#f59e0b" : "#22c55e", fontWeight: 600, marginBottom: 6, minHeight: 18 }}>
                      {capacity > 1 && (
                        <>
                          👥 {tenantCount}/{capacity} occupants
                          {spotsLeft > 0 && !isMyRoom && <span style={{ color: "#22c55e" }}> · {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} available</span>}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, textAlign: "center", padding: "6px 0" }}>
                      {isMyRoom ? "🏠 Your current room" : isOccupied ? "🔍 Click to view details" : hasRoom ? "🔄 Click to request transfer" : "🔍 Click to view & reserve"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "zoom-out",
          }}>
            <img src={lightbox} alt="Room" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} />
          </div>
        )}

        {/* Reservation Modal */}
        {selected && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setSelected(null)}>
            <div style={{ background: "#fff", borderRadius: 20, width: 460, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
              onClick={(e) => e.stopPropagation()}>

              {/* Carousel in modal */}
              <div style={{ position: "relative", borderRadius: "20px 20px 0 0", overflow: "hidden" }}>
                <RoomCarousel images={Array.isArray(selected.images) ? selected.images : (selected.images ? String(selected.images).split(",").filter(Boolean) : [])} height={220} onLightbox={setLightbox} />
                <button onClick={() => setSelected(null)} style={{
                  position: "absolute", top: 12, right: 14, zIndex: 4,
                  background: "rgba(0,0,0,0.4)", border: "none", color: "#fff",
                  width: 30, height: 30, borderRadius: "50%", fontSize: 14,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
                <span style={{
                  position: "absolute", bottom: 12, left: 14, zIndex: 4,
                  background: selected.status === "occupied" ? "rgba(254,243,199,0.95)" : selected.status === "partial" ? "rgba(255,237,213,0.95)" : "rgba(220,252,231,0.95)",
                  color: selected.status === "occupied" ? "#b45309" : selected.status === "partial" ? "#c2410c" : "#15803d",
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                  textTransform: "uppercase",
                }}>{selected.status === "occupied" ? "Occupied" : selected.status === "partial" ? "Partially Occupied" : "Available"}</span>
              </div>

              <div style={{ padding: "20px 24px 24px" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e2340", marginBottom: 4 }}>Room {s(selected.roomNumber)}</h2>
                {selected.description && <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14, lineHeight: 1.5 }}>{s(selected.description)}</p>}

                {/* Room stats */}
                <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                  {[
                    { icon: "💰", val: `₱${Number(selected.monthlyRent || 0).toLocaleString()}`, label: "Monthly Rent" },
                    { icon: "🏠", val: s(selected.type),                                          label: "Room Type"   },
                    { icon: "👥", val: s(selected.capacity),                                      label: "Capacity"    },
                  ].map((st, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRight: i < 2 ? "1.5px solid #e2e8f0" : "none" }}>
                      <span style={{ fontSize: 18 }}>{st.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e2340" }}>{st.val}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{st.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reservation form or status */}
                {(() => {
                  const isOccupied = selected.status === "occupied";
                  const isPartial  = selected.status === "partial";
                  const isMyRoom   = hasRoom && String(selected.roomNumber) === String(user.roomNumber);
                  const selCapacity = Number(selected.capacity) || 1;
                  const selTenants  = selected.tenants?.length || (isOccupied ? selCapacity : isPartial ? 1 : 0);
                  const selSpots    = selCapacity - selTenants;

                  if (isMyRoom) return (
                    <div style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      🏠 This is your current room.
                    </div>
                  );
                  if (isOccupied) return (
                    <div style={{ background: "#fef3c7", color: "#b45309", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      🔒 This room is fully occupied.
                    </div>
                  );
                  const existing = myResvs.find((r) => r.roomId === selected.id && r.status === "pending");
                  if (existing) return (
                    <div style={{ background: "#fef3c7", color: "#b45309", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      ⏳ You already have a pending {existing.type === "transfer" ? "transfer request" : "reservation"} for this room.
                    </div>
                  );
                  if (resvSuccess) return (
                    <div style={{ background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      ✅ {resvSuccess}
                    </div>
                  );

                  // Transfer request form (user already has a room)
                  if (hasRoom) return (
                    <form onSubmit={handleReserve}>
                      <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#1d4ed8" }}>
                        🔄 You are requesting to transfer from Room {s(user.roomNumber)} to Room {s(selected.roomNumber)}.
                        {selCapacity > 1 && <div style={{ marginTop: 4, fontWeight: 700 }}>👥 {selTenants}/{selCapacity} occupants · {selSpots} spot{selSpots > 1 ? "s" : ""} available</div>}
                      </div>
                      <input type="hidden" value="transfer" name="type" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div style={{ gridColumn: "1/-1" }}>
                          <label className="form-label">Preferred Move-in Date</label>
                          <input type="date" required value={resvForm.moveInDate}
                            onChange={(e) => setResvForm({ ...resvForm, moveInDate: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: "1/-1" }}>
                          <label className="form-label">Reason for Transfer (Optional)</label>
                          <textarea rows={2} placeholder="Why do you want to transfer?..."
                            value={resvForm.note} onChange={(e) => setResvForm({ ...resvForm, note: e.target.value })}
                            style={{ resize: "none" }} />
                        </div>
                      </div>
                      {resvError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{resvError}</p>}
                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={resvLoading}>
                        {resvLoading ? "Submitting..." : "🔄 Request Transfer"}
                      </button>
                    </form>
                  );

                  // Regular reservation form (unassigned user)
                  return (
                    <form onSubmit={handleReserve}>
                      {selCapacity > 1 && (
                        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                          👥 {selTenants}/{selCapacity} occupants · {selSpots} spot{selSpots > 1 ? "s" : ""} available
                        </div>
                      )}
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e2340", marginBottom: 12 }}>Reserve this Room</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label className="form-label">Preferred Move-in Date</label>
                          <input type="date" required value={resvForm.moveInDate}
                            onChange={(e) => setResvForm({ ...resvForm, moveInDate: e.target.value })} />
                        </div>
                        <div>
                          <label className="form-label">Down Payment (₱)</label>
                          <input type="number" required placeholder="e.g. 500" value={resvForm.downPayment}
                            onChange={(e) => setResvForm({ ...resvForm, downPayment: e.target.value })} />
                        </div>
                        <div>
                          <label className="form-label">Payment Method</label>
                          <select value={resvForm.method} onChange={(e) => setResvForm({ ...resvForm, method: e.target.value })}>
                            <option>GCash</option>
                            <option>Cash</option>
                            <option>Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Proof of Down Payment</label>
                          <input type="file" accept="image/*" style={{ padding: "8px" }}
                            onChange={(e) => setResvFile(e.target.files[0])} />
                        </div>
                        <div style={{ gridColumn: "1/-1" }}>
                          <label className="form-label">Note (Optional)</label>
                          <textarea rows={2} placeholder="Any message for the admin..."
                            value={resvForm.note} onChange={(e) => setResvForm({ ...resvForm, note: e.target.value })}
                            style={{ resize: "none" }} />
                        </div>
                      </div>
                      {resvError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{resvError}</p>}
                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={resvLoading}>
                        {resvLoading ? "Submitting..." : "📋 Submit Reservation"}
                      </button>
                    </form>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
