import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";
import styles from "./profile.module.css";

export default function UserProfile() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [form, setForm]        = useState({});
  const [roomInfo, setRoomInfo]  = useState(null);
  const [editing, setEditing]   = useState(false);
  const [error, setError]       = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarTs, setAvatarTs] = useState(Date.now());
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    API.get("/api/users/profile").then((r) => setForm(r.data)).catch(() => setForm(user));
    API.get("/api/rooms").then((r) => {
      const room = r.data.find((rm) => String(rm.roomNumber) === String(user.roomNumber));
      if (room) setRoomInfo(room);
    }).catch(() => {});
  }, [user]);

  async function handleSave() {
    setError("");
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName || "");
      fd.append("phone", form.phone || "");
      fd.append("birthday", form.birthday || "");
      fd.append("address", form.address || "");
      fd.append("emergencyContact", form.emergencyContact || "");
      if (avatarFile) fd.append("avatar", avatarFile);
      const r = await API.put("/api/users/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatar = r.data.avatar || form.avatar;
      setForm((f) => ({ ...f, avatar: newAvatar }));
      setAvatarFile(null);
      setAvatarPreview(null);
      if (r.data.avatar) setAvatarTs(Date.now());
      setEditing(false);
      const newToken = r.data.token || localStorage.getItem("token");
      login({ ...user, fullName: form.fullName, avatar: newAvatar }, newToken);
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCancel() {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  if (!user) return null;

  const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));

  const initials = s(form.fullName || user.fullName || "?")
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  const fields = [
    { label: "Full Name",         key: "fullName"         },
    { label: "Phone",             key: "phone"            },
    { label: "Birthday",          key: "birthday"         },
    { label: "Address",           key: "address"          },
    { label: "Emergency Contact", key: "emergencyContact" },
  ];

  return (
    <div className="layout">
      <Sidebar />
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Profile Information</h1>
            <p className={styles.subtitle}>Keep your profile details updated and organized.</p>
          </div>
          <div className={styles.userBadge}>
            {avatarPreview || s(form.avatar) ? (
              <img src={avatarPreview || `http://localhost:5000/uploads/${s(form.avatar)}?t=${avatarTs}`}
                alt="avatar" className={styles.avatar} style={{ objectFit: "cover" }} />
            ) : (
              <div className={styles.avatar}>{initials}</div>
            )}
            <div>
              <div className={styles.userName}>{s(form.fullName || user.fullName).split(" ")[0]}</div>
              <div className={styles.userRole}>User</div>
            </div>
          </div>
        </div>

        {/* Avatar centered */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div className={styles.avatarSection}>
            {avatarPreview || s(form.avatar) ? (
              <img src={avatarPreview || `http://localhost:5000/uploads/${s(form.avatar)}?t=${avatarTs}`}
                alt="avatar" className={styles.avatarLargeImg} />
            ) : (
              <div className={styles.avatarLarge}>{initials}</div>
            )}
            {editing && (
              <>
                <button className={styles.editIconBtn} title="Change photo" onClick={() => fileInputRef.current.click()}>✏️</button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              </>
            )}
          </div>
          {error && <div className={styles.errorMsg} style={{ marginTop: 12 }}>❌ {error}</div>}
        </div>

        {/* Details + Room Info side by side */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>

          {/* Profile Fields */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className={styles.fieldList}>
              {fields.map(({ label, key }) => (
                <div key={key} className={styles.fieldBox}>
                  {editing ? (
                    <input type="text" value={s(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={label} className={styles.fieldInput} />
                  ) : (
                    <div className={styles.fieldValue}>
                      <span className={styles.fieldLabel}>{label}:</span>{" "}{s(form[key]) || "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              {!editing ? (
                <button className={styles.editLink} onClick={() => setEditing(true)}>Edit Details</button>
              ) : (
                <>
                  <button className={styles.editLink} onClick={handleCancel}>Cancel</button>
                  <button className={styles.saveLink} onClick={handleSave}>Save</button>
                </>
              )}
            </div>
          </div>

          {/* Room Information */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(59,79,168,0.08)", padding: "24px 28px" }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 20 }}>Room Information</h2>
              <div className={styles.roomCard}>
                <div className={styles.roomImgWrap}>
                  {roomInfo?.image
                    ? <img src={`http://localhost:5000/uploads/${roomInfo.image}`} alt="Room" className={styles.roomImg} />
                    : <img src="/house1.png" alt="Room" className={styles.roomImg} />
                  }
                  <span className={styles.roomLabel}>Room {s(form.roomNumber) || "—"}</span>
                </div>
                <div className={styles.roomStats} style={{ gap: 8, marginTop: 12 }}>
                  <div className={styles.roomStat} style={{ padding: "8px 0" }}>
                    <span className={styles.roomStatIcon}>🛏</span>
                    <div>
                      <div className={styles.roomStatValue} style={{ color: "#f59e0b", fontSize: 14 }}>Php {s(form.monthlyRent) || "—"}</div>
                      <div className={styles.roomStatLabel}>Monthly Rent</div>
                    </div>
                  </div>
                  <div className={styles.roomStat} style={{ padding: "8px 0" }}>
                    <span className={styles.roomStatIcon}>🏠</span>
                    <div>
                      <div className={styles.roomStatValue} style={{ color: "#3b82f6", fontSize: 14 }}>{s(roomInfo?.type) || "Shared"}</div>
                      <div className={styles.roomStatLabel}>Bedroom Type</div>
                    </div>
                  </div>
                  <div className={styles.roomStat} style={{ padding: "8px 0" }}>
                    <span className={styles.roomStatIcon}>📅</span>
                    <div>
                      <div className={styles.roomStatValue} style={{ color: "#f97316", fontSize: 14 }}>{s(form.moveInDate) || "—"}</div>
                      <div className={styles.roomStatLabel}>Move-in Date</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
