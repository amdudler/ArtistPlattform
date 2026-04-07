import React, { useEffect, useState } from "react";
import { BACKEND, formatNumber } from "./api";

export default function SpotifyCallback() {
  const [phase, setPhase] = useState("loading");
  const [me, setMe] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    const success = url.searchParams.get("success");

    if (error) {
      setErrorMsg(error);
      setPhase("error");
      return;
    }
    if (!success) {
      setErrorMsg("Fehlender Erfolgs-Parameter.");
      setPhase("error");
      return;
    }

    (async () => {
      try {
        const tokenRes = await fetch(`${BACKEND}/spotify/token`, { credentials: "include" });
        if (!tokenRes.ok) {
          const body = await tokenRes.json().catch(() => ({}));
          throw new Error(body?.error || "token_error");
        }
        const token = await tokenRes.json();

        const meRes = await fetch(`${BACKEND}/spotify/me`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
          credentials: "include"
        });
        if (!meRes.ok) {
          const body = await meRes.json().catch(() => ({}));
          throw new Error(body?.error || "me_error");
        }
        const meJson = await meRes.json();
        localStorage.setItem("spotifyUser", JSON.stringify(meJson));
        setMe(meJson);
        setPhase("success");
        setTimeout(() => { window.location.href = "/"; }, 3000);
      } catch (e) {
        setErrorMsg(String(e?.message || e));
        setPhase("error");
      }
    })();
  }, []);

  const containerStyle = {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  };

  const cardStyle = {
    background: "var(--bg-card)",
    backdropFilter: "blur(20px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "48px 40px",
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    color: "var(--text-primary)",
    boxShadow: "var(--shadow-lg)"
  };

  if (phase === "loading") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div className="spinner" style={{ margin: "0 auto 24px" }} />
          <p style={{ color: "var(--text-secondary)" }}>Verbinde mit Spotify...</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--danger-bg)", border: "2px solid var(--danger)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", color: "var(--danger)", margin: "0 auto 20px"
          }}>!</div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: 10, color: "var(--danger)" }}>Login fehlgeschlagen</h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem", marginBottom: 28, wordBreak: "break-word" }}>{errorMsg}</p>
          <a href="/" className="btn btn-secondary">Zurück zur App</a>
        </div>
      </div>
    );
  }

  const name = me?.display_name || "Unbekannt";
  const avatarUrl = me?.images?.[0]?.url;

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, animation: "fadeUp 0.5s ease" }}>
        <div style={{
          width: 64, height: 64, margin: "0 auto 20px",
          borderRadius: "50%", background: "var(--success-bg)",
          border: "2px solid var(--success)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", color: "var(--success)"
        }}>&#10003;</div>

        <h2 style={{
          fontSize: "1.6rem", fontWeight: 700, marginBottom: 28,
          background: "var(--accent-gradient-h)", WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent", backgroundClip: "text"
        }}>Willkommen zurück!</h2>

        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: "28px 24px", marginBottom: 28
        }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }} />
              : <div style={{
                  width: 96, height: 96, borderRadius: "50%",
                  background: "var(--accent-gradient)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "2.4rem", fontWeight: 700, color: "#fff"
                }}>{name[0]?.toUpperCase()}</div>
            }
          </div>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 6 }}>{name}</h3>
          {me?.email && <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginBottom: 14 }}>{me.email}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <span className="tag tag-accent">{me?.product === "premium" ? "Premium" : "Free"}</span>
            {me?.country && <span className="tag tag-accent">{me.country}</span>}
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent-light)" }}>
            {formatNumber(me?.followers?.total ?? 0)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Follower
          </div>
        </div>

        <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginBottom: 20 }}>
          Weiterleitung in wenigen Sekunden...
        </p>
        <a href="/" className="btn btn-primary">Jetzt zur App</a>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
