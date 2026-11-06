import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../pages/_app";

const icons = {
  rooms:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  messages:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  payments:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  reports:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  profile:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);

  // close sidebar on route change
  useEffect(() => { setOpen(false); }, [router.pathname]);

  // prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navItems = isAdmin ? [
    { label: "Dashboard", icon: "dashboard", href: "/admin/dashboard" },
    { label: "Rooms",     icon: "rooms",     href: "/admin/rooms"     },
    { label: "Messages",  icon: "messages",  href: "/admin/messages"  },
    { label: "Payments",  icon: "payments",  href: "/admin/payments"  },
    { label: "Reports",   icon: "reports",   href: "/admin/reports"   },
    { label: "Profile",   icon: "profile",   href: "/admin/profile"   },
  ] : [
    { label: "Dashboard", icon: "dashboard", href: "/user/dashboard" },
    { label: "Rooms",     icon: "rooms",     href: "/user/rooms"     },
    { label: "Messages",  icon: "messages",  href: "/user/messages"  },
    { label: "Payments",  icon: "payments",  href: "/user/payments"  },
    { label: "Profile",   icon: "profile",   href: "/user/profile"   },
  ];

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="mobile-brand">
          <img src="/logo.png" alt="BoardEase" onError={(e) => { e.target.style.display = "none"; }} />
          <span>BoardEase</span>
        </div>
        <button className="hamburger" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? icons.close : icons.menu}
        </button>
      </div>

      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="BoardEase" onError={(e) => { e.target.style.display = "none"; }} />
          <span>BoardEase</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}
              className={`nav-item${router.pathname === item.href ? " active" : ""}`}>
              {icons[item.icon]}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.fullName || "User"}</div>
              <div className="sidebar-user-role">{user?.role || "tenant"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            {icons.logout}
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
