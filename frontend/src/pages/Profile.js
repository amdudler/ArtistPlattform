import React, { useState } from "react";
import { FiUser, FiLock, FiTrash2, FiSave } from "react-icons/fi";
import { updateProfile, changePassword, deleteAccount, clearAuth } from "../api";

export default function Profile({ user, setUser, onLogout }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Passwort ändern
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

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
        <p className="page-subtitle">Verwalte deinen Account. (US-04)</p>
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
