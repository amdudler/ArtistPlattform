import React, { useState } from "react";
import { FiMail, FiLock, FiUser } from "react-icons/fi";
import { register, login } from "../api";

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let user;
      if (mode === "register") {
        user = await register(email, password, displayName);
      } else {
        user = await login(email, password);
      }
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--accent-glow)", border: "2px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: "1.5rem", color: "var(--accent-light)"
          }}>
            <FiUser />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            {mode === "login" ? "Anmelden" : "Registrieren"}
          </h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: 4 }}>
            {mode === "login" ? "Melde dich bei Artist Platform an." : "Erstelle einen neuen Account."}
          </p>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div style={{ position: "relative" }}>
              <FiUser style={{ position: "absolute", left: 14, top: 14, color: "var(--text-tertiary)" }} />
              <input
                className="input"
                style={{ paddingLeft: 40 }}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Anzeigename"
              />
            </div>
          )}
          <div style={{ position: "relative" }}>
            <FiMail style={{ position: "absolute", left: 14, top: 14, color: "var(--text-tertiary)" }} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-Mail"
              required
            />
          </div>
          <div style={{ position: "relative" }}>
            <FiLock style={{ position: "absolute", left: 14, top: 14, color: "var(--text-tertiary)" }} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Passwort (min. 6 Zeichen)"
              required
              minLength={6}
            />
          </div>

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} disabled={loading}>
            {loading ? "Laden..." : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            style={{ background: "none", border: "none", color: "var(--text-accent)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Noch kein Account? Registrieren" : "Bereits registriert? Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}
