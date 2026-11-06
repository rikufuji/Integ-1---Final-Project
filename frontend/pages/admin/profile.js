import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";
import styles from "../user/profile.module.css";

export default function AdminProfile() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [form, setForm]               = useState({});
  const [editing, setEditing]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [avatarFile, setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarTs, setAvatarTs]       = useState(Date.now());
  const [changePw, setChangePw]       = useState(false);
  const [pwForm, setPwForm]           = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError]         = useState("");
  const [pwSuccess, setPwSuccess]     = useState("");
  const [pwLoading, setPwLoading]     = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/user/profile"); return; }
    API.get("/api/users/profile").then((r) => setForm(r.data)).catch(() => setForm(user));
  }, [user]);

  async function handleSave() {
    setError(""); setSuccess("");
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName || "");
      fd.append("phone", form.phone || "");
      fd.append("birthday", form.birthday || "");
      fd.append("address", form.address || "");
      fd.append("emergencyContact", form.emergencyContact || "");
      if (avatarFile) fd.append("avatar", avatarFile);
      const r = await API.put("/api/users/profile", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const newAvatar = r.data.avatar || form.avatar;
      setForm((f) => ({ ...f, avatar: newAvatar }));
      setAvatarFile(null);
      setAvatarPreview(null);
      if (r.data.avatar) setAvatarTs(Date.now());
      setEditing(false);
      setSuccess("Profile updated successfully.");
      const newToken = r.data.token || localStorage.getItem("token");
      login({ ...user, fullName: form.fullName, avatar: newAvatar }, newToken);
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("New passwords do not match."); return; }
    if (pwForm.newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setPwLoading(true);
    try {
      await API.put("/api/users/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess("Password changed successfully.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangePw(false);
    } catch (err) {
      setPwError(err.response?.data?.error || "Failed to change password");
    } finally { setPwLoading(false); }
  }

  function handleCancel() {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setError("");
    API.get("/api/users/profile").then((r) => setForm(r.data)).catch(() => {});
  }

  if (!user) return null;

  const s = (v) => (v && typeof v === "object" ? "" : String(v ?? ""));
  const initials = s(form.fullName || user.fullName || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

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

        {/* Header — title left, badge right (unchanged) */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Profile</h1>
            <p className={styles.subtitle}>Update your admin account details and credentials.</p>
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
              <div className={styles.userRole}>Admin</div>
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
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} />
              </>
            )}
          </div>
          {error   && <div className={styles.errorMsg} style={{ marginTop: 12 }}>❌ {error}</div>}
          {success && <div style={{ background: "#dcfce7", color: "#15803d", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 12 }}>✅ {success}</div>}
        </div>

        {/* Details + Credentials side by side */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap", maxWidth: 700, margin: "0 auto" }}>

          {/* Admin Details */}
          <div style={{ flex: 1, minWidth: 260 }}>
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
                <button className={styles.editLink} onClick={() => { setEditing(true); setSuccess(""); }}>Edit Details</button>
              ) : (
                <>
                  <button className={styles.editLink} onClick={handleCancel}>Cancel</button>
                  <button className={styles.saveLink} onClick={handleSave}>Save</button>
                </>
              )}
            </div>
          </div>

          {/* Account Credentials */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(59,79,168,0.08)", padding: "20px 24px" }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Account Credentials</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8faff", borderRadius: 8, border: "1px solid #e0e7ff" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Username</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2340" }}>{s(form.username) || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8faff", borderRadius: 8, border: "1px solid #e0e7ff" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Role</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>Admin</span>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 16 }}>
                {!changePw ? (
                  <button className={styles.editLink} onClick={() => { setChangePw(true); setPwError(""); setPwSuccess(""); }}>
                    🔑 Change Password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Current Password", key: "currentPassword" },
                        { label: "New Password",      key: "newPassword"     },
                        { label: "Confirm Password",  key: "confirmPassword" },
                      ].map(({ label, key }) => (
                        <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">{label}</label>
                          <input type="password" value={pwForm[key]} required
                            onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })} />
                        </div>
                      ))}
                      {pwError   && <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, marginTop: 4 }}>❌ {pwError}</div>}
                      {pwSuccess && <div style={{ color: "#15803d", fontSize: 13, fontWeight: 600, marginTop: 4 }}>✅ {pwSuccess}</div>}
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button type="button" className={styles.editLink} onClick={() => { setChangePw(false); setPwError(""); }}>Cancel</button>
                        <button type="submit" className={styles.saveLink} disabled={pwLoading}>
                          {pwLoading ? "Saving..." : "Save Password"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
