import { useState } from "react";
import styles from "./CreateGroupModal.module.css";

export default function CreateGroupModal({ users, currentUserId, onClose, onCreate }) {
  const [name, setName]       = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError]     = useState("");

  function toggle(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter a group name."); return; }
    if (selected.length === 0) { setError("Select at least one member."); return; }
    setError("");
    await onCreate(name.trim(), selected);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.overlayLabel}>Create Overlay</p>
        <h2 className={styles.title}>Create new message/group</h2>

        <div className={styles.field}>
          <label className={styles.label}>Name:</label>
          <input
            className={styles.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>To:</label>
          <div className={styles.membersList}>
            {users.filter((u) => u.id !== currentUserId).map((u) => {
              const initials = String(u.fullName || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              const active = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  className={`${styles.memberChip} ${active ? styles.memberChipActive : ""}`}
                  onClick={() => toggle(u.id)}
                  title={u.fullName}
                >
                  {u.avatar
                    ? <img src={`http://localhost:5000/uploads/${u.avatar}`} alt={initials} className={styles.chipAvatar} />
                    : <span className={styles.chipInitials}>{initials}</span>
                  }
                  <span className={styles.chipName}>{String(u.fullName || "").split(" ")[0]}</span>
                </button>
              );
            })}
            {users.filter((u) => u.id !== currentUserId).length === 0 && (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>No other users found.</span>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.createBtn} onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
