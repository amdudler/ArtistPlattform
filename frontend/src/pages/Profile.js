import React, { useState } from "react";
import { FiUser, FiLock, FiTrash2, FiSave, FiLink, FiXCircle } from "react-icons/fi";
import { updateProfile, changePassword, deleteAccount, clearAuth, spotifyDisconnect } from "../api";

export default function Profile({ user, setUser, onLogout, spotifyUser, setSpotifyUser }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Passwort ändern
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Spotify trennen
  const [disconnecting, setDisconnecting] = useState(false);
  const [spotifyMsg, setSpotifyMsg] = useState("");

  // Account löschen
  const [deletePw, setDeletePw] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  const saveProfile = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await updateProfile({ displayName, bio });
      setUser(updated);
      localStorage.setItem("authUser", JSON.stringify(updated));
      setMsg("Profil gespeichert!");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwMsg("");
    try {
      await changePassword(currentPw, newPw);
      setPwMsg("Passwort geändert!");
      setCurrentPw("");
      setNewPw("");
    } catch (e) {
      setPwMsg(e.message);
    }
  };

  const handleSpotifyDisconnect = async () => {
    setDisconnecting(true);
    setSpotifyMsg("");
    try {
      await spotifyDisconnect();
      setSpotifyUser(null);
      setSpotifyMsg("Spotify-Verknüpfung getrennt!");
    } catch (e) {
      setSpotifyMsg(e.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteMsg("");
    try {
      await deleteAccount(deletePw);
      clearAuth();
      onLogout();
    } catch (e) {
      setDeleteMsg(e.message);
    }
  };

  if (!user) {
    return (
      <div className="empty-state">
        <h3>Nicht angemeldet</h3>
        <p>Bitte melde dich an, um dein Profil zu sehen.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">Profil</h1>
        <p className="page-subtitle">Verwalte deinen Account.</p>
      </div>

      {/* ── Profil bearbeiten ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title"><FiUser /> Profil bearbeiten</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Anzeigename</label>
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Bio</label>
            <textarea
              className="input"
              style={{ minHeight: 80, resize: "vertical" }}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Erzähle etwas über dich..."
            />
          </div>
          <div>
            <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>E-Mail</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.5 }} />
          </div>
        </div>

        {msg && <p style={{ color: msg.includes("gespeichert") ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{msg}</p>}

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveProfile} disabled={saving}>
          <FiSave /> {saving ? "Speichern..." : "Speichern"}
        </button>
      </div>

      {/* ── Spotify-Verknüpfung ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title"><FiLink /> Spotify-Verknüpfung</h3>
        {spotifyUser ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(29,185,84,0.15)", border: "2px solid #1DB954",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{spotifyUser.display_name}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-tertiary)" }}>
                  {spotifyUser.email || "Spotify verbunden"}
                  {spotifyUser.product && <span> · {spotifyUser.product === "premium" ? "Premium" : "Free"}</span>}
                </div>
              </div>
            </div>
            {spotifyMsg && <p style={{ color: spotifyMsg.includes("getrennt") ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", marginBottom: 8 }}>{spotifyMsg}</p>}
            <button className="btn btn-danger" onClick={handleSpotifyDisconnect} disabled={disconnecting}>
              <FiXCircle /> {disconnecting ? "Trennen..." : "Spotify trennen"}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
              Kein Spotify-Account verknüpft.
            </p>
            {spotifyMsg && <p style={{ color: "var(--success)", fontSize: "0.85rem", marginBottom: 8 }}>{spotifyMsg}</p>}
          </div>
        )}
      </div>

      {/* ── Passwort ändern (US-03) ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title"><FiLock /> Passwort ändern</h3>
        <form onSubmit={handleChangePw} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="input"
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="Aktuelles Passwort"
            required
          />
          <input
            className="input"
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Neues Passwort (min. 6 Zeichen)"
            required
            minLength={6}
          />
          {pwMsg && <p style={{ color: pwMsg.includes("geändert") ? "var(--success)" : "var(--danger)", fontSize: "0.85rem" }}>{pwMsg}</p>}
          <button className="btn btn-secondary" type="submit"><FiLock /> Passwort ändern</button>
        </form>
      </div>

      {/* ── Account löschen (US-05) ── */}
      <div className="card" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <h3 className="section-title" style={{ color: "var(--danger)" }}><FiTrash2 /> Gefahrenzone</h3>
        {!showDelete ? (
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
            <FiTrash2 /> Account löschen
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>
              Diese Aktion ist unwiderruflich. Alle deine Daten werden gelöscht.
            </p>
            <input
              className="input"
              type="password"
              value={deletePw}
              onChange={e => setDeletePw(e.target.value)}
              placeholder="Passwort zur Bestätigung"
            />
            {deleteMsg && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{deleteMsg}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> Endgültig löschen</button>
              <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
