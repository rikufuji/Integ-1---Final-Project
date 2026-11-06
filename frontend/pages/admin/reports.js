import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../_app";
import API from "../../lib/api";

const TABS = [
  { id: "payments-html", label: "💳 Payments Report",  icon: "💳" },
  { id: "users-html",    label: "👥 Tenants Report",   icon: "👥" },
  { id: "payments-json", label: "{ } Payments JSON",   icon: "{}" },
  { id: "users-json",    label: "{ } Tenants JSON",    icon: "{}" },
  { id: "logs",          label: "📋 Activity Logs",    icon: "📋" },
];

export default function AdminReports() {
  const { user } = useAuth();
  const router   = useRouter();
  const [activeTab,    setActiveTab]    = useState("payments-html");
  const [htmlContent,  setHtmlContent]  = useState("");
  const [jsonContent,  setJsonContent]  = useState(null);
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(false);

  function fetchReport() {
    if (!user) return;
    setLoading(true);
    setHtmlContent(""); setJsonContent(null); setLogs([]);
    const ep = {
      "payments-html": () => API.get("/api/xml/payments/html").then((r) => setHtmlContent(r.data)),
      "users-html":    () => API.get("/api/xml/users/html").then((r) => setHtmlContent(r.data)),
      "payments-json": () => API.get("/api/xml/payments/json").then((r) => setJsonContent(r.data)),
      "users-json":    () => API.get("/api/xml/users/json").then((r) => setJsonContent(r.data)),
      "logs":          () => API.get("/api/xml/logs").then((r) => setLogs(r.data)),
    };
    ep[activeTab]?.().catch(() => {
      if (activeTab.includes("html")) setHtmlContent("<p style='padding:20px;color:#ef4444'>Error loading report.</p>");
      if (activeTab.includes("json")) setJsonContent({ error: "Failed to load" });
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/user/dashboard"); return; }
  }, [user]);

  useEffect(() => { fetchReport(); }, [activeTab, user]);

  if (!user) return null;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 0 }}>

        {/* ── Header ── */}
        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div className="page-header" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>Reports Dashboard</h1>
              <p>XSLT-transformed XML reports — HTML and JSON views.</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={fetchReport}
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? "⏳ Generating..." : "🔄 Generate Report"}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: "none", background: "none", fontFamily: "inherit",
                color: activeTab === t.id ? "var(--primary)" : "var(--muted)",
                borderBottom: activeTab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.18s",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Loading report...</div>
              </div>
            </div>
          )}

          {/* HTML iframe — fills all remaining height */}
          {!loading && htmlContent && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", background: "#dcfce7", padding: "3px 10px", borderRadius: 20 }}>✅ XSLT → HTML</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>XML transformed via XSLT stylesheet</span>
              </div>
              <iframe srcDoc={htmlContent} style={{ flex: 1, border: "none", width: "100%" }} title="XSLT Report" />
            </div>
          )}

          {/* JSON — fills all remaining height */}
          {!loading && jsonContent && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "3px 10px", borderRadius: 20 }}>{ } JSON</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>XML parsed via DOM → JSON</span>
              </div>
              <pre style={{ flex: 1, margin: 0, padding: 24, fontSize: 13, overflow: "auto", color: "var(--text)", lineHeight: 1.7, background: "#f8faff" }}>
                {JSON.stringify(jsonContent, null, 2)}
              </pre>
            </div>
          )}

          {/* Logs table — fills all remaining height */}
          {!loading && activeTab === "logs" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "3px 10px", borderRadius: 20 }}>📋 LOGS</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Activity logs from logs.xml</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{logs.length} entries</span>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <th style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 20px", textAlign: "left", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>Timestamp</th>
                      <th style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 20px", textAlign: "left", borderBottom: "2px solid var(--border)" }}>Type</th>
                      <th style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 20px", textAlign: "left", borderBottom: "2px solid var(--border)", width: "100%" }}>Detail</th>
                      <th style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 20px", textAlign: "left", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>No logs found.</td></tr>
                    ) : (
                      logs.slice().reverse().map((log, i) => {
                        const type = String(log.type || "");
                        const badgeClass = type === "auth" ? "badge-tenant" : type === "payment" ? "badge-approved" : "badge-warning";
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                              {log.timestamp ? new Date(String(log.timestamp)).toLocaleString() : ""}
                            </td>
                            <td style={{ padding: "12px 20px" }}>
                              <span className={`badge ${badgeClass}`}>{type}</span>
                            </td>
                            <td style={{ padding: "12px 20px", fontSize: 13 }}>{String(log.detail || "")}</td>
                            <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{String(log.ref || "")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
