import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";
import styles from "./dashboard.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function UserDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments]           = useState([]);
  const [roomInfo, setRoomInfo]           = useState(null);
  const [notifications, setNotifications] = useState([]);

  function fetchRooms() {
    if (!user) return;
    API.get("/api/rooms").then((r) => {
      const mine = r.data.find((rm) => String(rm.roomNumber) === String(user.roomNumber));
      if (mine) setRoomInfo(mine);
    }).catch(() => {});
  }

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role === "admin") { router.push("/admin/dashboard"); return; }
    API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
    fetchRooms();
    const socket = connectSocket(localStorage.getItem("token"));
    socket.on("receive_notification", (n) => setNotifications((prev) => [{ ...n, receivedAt: new Date().toISOString() }, ...prev].slice(0, 20)));
    socket.on("rooms_changed", fetchRooms);
    socket.on("reservation_updated", (d) => {
      if (d.tenantId === user.id)
        setNotifications((prev) => [{ message: `Your reservation for Room ${d.roomNumber} was ${d.status}.`, type: "reservation", receivedAt: new Date().toISOString() }, ...prev].slice(0, 20));
    });
    socket.on("payment_status_updated", (d) => {
      if (d.tenantId === user.id) {
        const msg = d.status === "approved"
          ? `✅ Your payment of ₱${Number(d.amount||0).toLocaleString()} was approved.`
          : `❌ Your payment was denied. Reason: ${d.reason || "No reason provided."}`;
        setNotifications((prev) => [{ message: msg, type: "payment", receivedAt: new Date().toISOString() }, ...prev].slice(0, 20));
        API.get("/api/payments").then((r) => setPayments(r.data)).catch(() => {});
      }
    });
    return () => {
      socket.off("receive_notification");
      socket.off("rooms_changed", fetchRooms);
      socket.off("reservation_updated");
      socket.off("payment_status_updated");
      disconnectSocket();
    };
  }, [user]);

  if (!user) return null;

  const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));
  const hasPending = payments.some((p) => p.status === "pending");

  return (
    <div className="layout">
      <Sidebar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>User Dashboard</h1>
            <p className={styles.subtitle}>Your boarding house information at a glance.</p>
          </div>
          <div className={styles.userBadge}>
            <div className={styles.avatar}>
              {s(user.fullName).split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
            </div>
            <div>
              <div className={styles.userName}>{s(user.fullName).split(" ")[0]}</div>
              <div className={styles.userRole}>User</div>
            </div>
          </div>
        </div>

        <div className={styles.body}>

          {/* Room Details */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Rooms Details</h2>
            <div className={styles.roomCard}>
              <div className={styles.roomImgWrap}>
                <img
                  src={roomInfo?.image ? `${API_URL}/uploads/${roomInfo.image}` : "/house1.png"}
                  alt="Room"
                  className={styles.roomImg}
                />
                <span className={styles.roomLabel}>Room {s(user.roomNumber) || "—"}</span>
              </div>
              <div className={styles.roomDetails}>
                <div className={styles.roomStat}>
                  <span className={styles.roomStatIcon}>🛏</span>
                  <div>
                    <div className={styles.roomStatValue} style={{ color: "#f59e0b" }}>Php {s(user.monthlyRent) || "—"}</div>
                    <div className={styles.roomStatLabel}>Monthly Rent</div>
                  </div>
                </div>
                <div className={styles.roomStat}>
                  <span className={styles.roomStatIcon}>🏠</span>
                  <div>
                    <div className={styles.roomStatValue} style={{ color: "#3b82f6" }}>{s(roomInfo?.type) || "—"}</div>
                    <div className={styles.roomStatLabel}>Bedroom Type</div>
                  </div>
                </div>
                <div className={styles.roomStat}>
                  <span className={styles.roomStatIcon}>📅</span>
                  <div>
                    <div className={styles.roomStatValue} style={{ color: "#f97316" }}>
                      {s(user.dueDate) ? `${s(user.dueDate)}th of the Month` : "—"}
                    </div>
                    <div className={styles.roomStatLabel}>Due Date</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Notifications</h2>
            <div className={styles.notifList}>
              {hasPending && (
                <div className={styles.notifItem}>
                  <span className={styles.notifIcon}>🔔</span>
                  <div className={styles.notifBody}>
                    <p className={styles.notifText}>
                      <strong>URGENT!</strong> Your rent is almost due. Please make your payment as soon as possible.
                    </p>
                    <a href="/user/payments" className={styles.notifAction}>Make a payment</a>
                  </div>
                </div>
              )}
              {notifications.map((n, i) => (
                <div key={i} className={styles.notifItem}>
                  <span className={styles.notifIcon}>
                    {n.type === "message" ? "💬" : n.type === "payment" ? "💳" : "🔔"}
                  </span>
                  <div className={styles.notifBody}>
                    <p className={styles.notifText}>{s(n.message)}</p>
                    <span className={styles.notifTime}>
                      {n.receivedAt ? new Date(n.receivedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : s(n.time)}
                    </span>
                    {n.action && <a href={s(n.actionHref) || "#"} className={styles.notifAction}>{s(n.action)}</a>}
                  </div>
                </div>
              ))}
              {!hasPending && notifications.length === 0 && (
                <div className={styles.emptyNotif}>
                  <span>🔔</span>
                  <p>No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Rent History — full width */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>Rent History</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className={styles.empty}>No payment history yet.</td></tr>
                ) : (
                  payments.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.receiverCell}>
                          <span className={styles.receiverAvatar}>🏠</span>
                          Room {s(p.roomNumber) || "—"}
                        </div>
                      </td>
                      <td>
                        <span className={[styles.badge, styles[`badge_${p.status}`]].filter(Boolean).join(" ")}>
                          {s(p.status)}
                        </span>
                      </td>
                      <td>{s(p.date)}</td>
                      <td className={styles.amount}>₱{Number(s(p.amount) || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
