import "../styles/globals.css";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (stored && token) {
      setUser(JSON.parse(stored));
      // refresh from API so admin-updated fields (roomNumber, monthlyRent) are current
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null).then((data) => {
        if (data) {
          localStorage.setItem("user", JSON.stringify(data));
          setUser(data);
        }
      }).catch(() => {});
    }
    setLoading(false);
  }, []);

  function login(userData, token) {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    disconnectSocket();
    setUser(null);
    router.push("/");
  }

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Component {...pageProps} />
    </AuthContext.Provider>
  );
}
