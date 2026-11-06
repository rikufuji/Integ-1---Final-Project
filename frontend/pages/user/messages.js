import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import CreateGroupModal from "../../components/CreateGroupModal";
import { useAuth } from "../_app";
import API from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

function dmRoomId(idA, idB) {
  return "dm-" + [idA, idB].sort().join("_");
}

const ADMIN_ID = "admin1";

export default function UserMessages() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeRoom, setActiveRoom]   = useState("general");
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [imgPreview, setImgPreview]   = useState(null);
  const [socket, setSocket]           = useState(null);
  const [lightbox, setLightbox]       = useState(null);
  const [groups, setGroups]           = useState([]);
  const [allUsers, setAllUsers]       = useState([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [adminId, setAdminId]         = useState(ADMIN_ID);
  const [search, setSearch]           = useState("");
  const [activeName, setActiveName]   = useState("BoardEase GC");
  const [dmRooms, setDmRooms]         = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    const s = connectSocket(localStorage.getItem("token"));
    setSocket(s);
    socketRef.current = s;
    s.emit("join_room", "general");

    // fetch admin ID then join DM room
    API.get("/api/users/admin-id").then((r) => {
      const aid = r.data.id;
      setAdminId(aid);
      const dmRoom = dmRoomId(user.id, aid);
      s.emit("join_room", dmRoom);
    }).catch(() => {
      s.emit("join_room", dmRoomId(user.id, ADMIN_ID));
    });

    s.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id && m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // if a DM arrives that isn't in sidebar yet, add it
      if (String(msg.room).startsWith("dm-") && String(msg.senderId) !== String(user.id)) {
        setDmRooms((prev) => {
          if (prev.some((r) => r.id === msg.room)) return prev;
          return [...prev, { id: msg.room, name: msg.sender }];
        });
        s.emit("join_room", msg.room);
      }
    });

    API.get("/api/groups").then((r) => {
      setGroups(r.data);
      r.data.forEach((g) => s.emit("join_room", g.id));
    }).catch(() => {});

    API.get("/api/users/all").then((r) => {
      setAllUsers(r.data);
      // restore existing DM conversations
      API.get("/api/messages/dms").then((dmRes) => {
        const rooms = [];
        dmRes.data.forEach(({ room, otherId }) => {
          const other = r.data.find((u) => u.id === otherId);
          if (other) {
            rooms.push({ id: room, name: other.fullName });
            s.emit("join_room", room);
          }
        });
        setDmRooms(rooms);
      }).catch(() => {});
    }).catch(() => {});

    return () => { s.off("receive_message"); disconnectSocket(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    API.get(`/api/messages?room=${activeRoom}`).then((r) => {
      setMessages(r.data);
    }).catch(() => {});
  }, [activeRoom, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function pickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!socket || (!input.trim() && !imgPreview)) return;
    const message = {
      room: activeRoom,
      sender: user.fullName,
      senderId: user.id,
      content: input.trim(),
      imageData: imgPreview || null,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
    socket.emit("send_message", message);
    setInput(""); setImgPreview(null);
  }

  async function handleCreateGroup(name, memberIds) {
    const r = await API.post("/api/groups", { name, memberIds });
    const newGroup = r.data;
    setGroups((prev) => [...prev, newGroup]);
    socket?.emit("join_room", newGroup.id);
    setShowCreate(false);
    setActiveName(newGroup.name);
    setActiveRoom(newGroup.id);
  }

  function openDm(targetUser) {
    const roomId = dmRoomId(user.id, targetUser.id);
    if (!dmRooms.some((r) => r.id === roomId)) {
      setDmRooms((prev) => [...prev, { id: roomId, name: targetUser.fullName }]);
      socketRef.current?.emit("join_room", roomId);
    }
    setActiveName(targetUser.fullName);
    setActiveRoom(roomId);
    setSearch("");
  }

  const filteredUsers = search.trim()
    ? allUsers.filter((u) => u.id !== user?.id && u.fullName?.toLowerCase().includes(search.toLowerCase()))
    : [];

  const allRooms = user ? [
    { id: "general", name: "BoardEase GC", desc: "General group chat" },
    { id: dmRoomId(user.id, adminId), name: "Admin", desc: "Direct message with admin" },
    ...dmRooms.filter((d) => d.id !== dmRoomId(user.id, adminId)),
    ...groups.map((g) => ({ id: g.id, name: g.name, desc: `${g.members.length} members`, isGroup: true })),
  ] : [];

  const roomMessages = messages.filter((m) => String(m.room) === activeRoom);
  if (!user) return null;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Messaging Dashboard</h1>
          <p>Stay connected with your co-tenants in real time.</p>
        </div>

        <div className="chat-layout">
          <div className="chat-sidebar">
            <div className="chat-sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>All Messages</span>
              <button
                onClick={() => setShowCreate(true)}
                title="Create group"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 20, lineHeight: 1, padding: "0 2px" }}
              >＋</button>
            </div>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", position: "relative" }}>
              <input
                type="text"
                placeholder="🔍 Search user to message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, outline: "none" }}
              />
              {filteredUsers.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 12, right: 12, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 10, maxHeight: 200, overflowY: "auto" }}>
                  {filteredUsers.map((u) => (
                    <div key={u.id} onClick={() => openDm(u)}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f5f7ff"}
                      onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {String(u.fullName || "?")[0].toUpperCase()}
                      </div>
                      {u.fullName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="chat-contacts">
              {allRooms.map((room) => (
                <div key={room.id}
                  className={`chat-contact${activeRoom === room.id ? " active" : ""}`}
                  onClick={() => { setActiveRoom(room.id); setActiveName(room.name); }}>
                  <div className="chat-contact-avatar">{room.name[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="chat-contact-name">{room.name}</div>
                    <div className="chat-contact-preview">{room.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-main">
            <div className="chat-header">
              <div className="chat-contact-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                {activeName[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{activeName}</div>
                <div style={{ fontSize: 12, color: "var(--success)" }}>● Online</div>
              </div>
            </div>

            <div className="chat-messages">
              {roomMessages.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>No messages yet. Say hello!</p>
              )}
              {roomMessages.map((msg, i) => {
                const mine = String(msg.senderId) === String(user.id);
                return (
                  <div key={msg.id || i} className={`msg-bubble ${mine ? "mine" : "theirs"}`}>
                    {!mine && <div className="msg-sender">{String(msg.sender || "")}</div>}
                    {msg.imageData && (
                      <img src={String(msg.imageData)} alt="shared" className="msg-img"
                        onClick={() => setLightbox(String(msg.imageData))} />
                    )}
                    {msg.content && <div className="msg-text">{String(msg.content)}</div>}
                    <div className="msg-time">
                      {msg.timestamp ? new Date(String(msg.timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar">
              {imgPreview && (
                <div className="chat-img-preview">
                  <img src={imgPreview} alt="preview" />
                  <button onClick={() => setImgPreview(null)}>✕</button>
                </div>
              )}
              <form className="chat-input-row" onSubmit={sendMessage}>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={pickImage} />
                <button type="button" className="img-attach-btn" onClick={() => fileRef.current?.click()} title="Attach image">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>
                <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} />
                <button type="submit" className="btn btn-primary btn-sm">Send</button>
              </form>
            </div>
          </div>
        </div>

        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out"
          }}>
            <img src={lightbox} alt="full" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
          </div>
        )}

        {showCreate && (
          <CreateGroupModal
            key={Date.now()}
            users={allUsers}
            currentUserId={user.id}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateGroup}
          />
        )}
      </main>
    </div>
  );
}
