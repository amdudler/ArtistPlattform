import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiSearch, FiMusic, FiBarChart2, FiUser, FiLogOut, FiLogIn } from "react-icons/fi";
import { clearAuth, getAuthToken, spotifyLoginUrl, spotifyLogout } from "./api";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Analyze from "./pages/Analyze";
import Compare from "./pages/Compare";
import ArtistDetail from "./pages/ArtistDetail";
import AuthPage from "./pages/AuthPage";
import Profile from "./pages/Profile";
import "./App.css";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) setAuthUser(JSON.parse(stored));
    } catch {}
    try {
      const stored = localStorage.getItem("spotifyUser");
      if (stored) setSpotifyUser(JSON.parse(stored));
    } catch {}
  }, []);

  const handleLogout = async () => {
    try { await spotifyLogout(); } catch {}
    clearAuth();
    setAuthUser(null);
    setSpotifyUser(null);
    navigate("/");
  };

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    navigate("/");
  };

  const isLoggedIn = !!authUser || !!getAuthToken();

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <nav className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="15" stroke="url(#logoGrad)" strokeWidth="2" fill="none" />
              <path d="M10 20 Q16 8 22 20" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="16" cy="12" r="2" fill="#8b5cf6" />
            </svg>
          </div>
          <span className="sidebar-title">Artist Platform</span>
        </div>

        <div className="sidebar-nav">
          <NavLink to="/" end className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FiHome /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/search" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FiSearch /> <span>Suche</span>
          </NavLink>
          <NavLink to="/analyze" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FiMusic /> <span>Analyse</span>
          </NavLink>
          <NavLink to="/compare" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FiBarChart2 /> <span>Vergleich</span>
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          {isLoggedIn && !spotifyUser && (
            <button onClick={() => setShowSpotifyModal(true)} className="spotify-connect-btn" style={{ border: "none", cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify verbinden
            </button>
          )}
          {spotifyUser && (
            <div className="spotify-connected">
              <div className="spotify-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z"/>
                </svg>
                <span>{spotifyUser.display_name}</span>
              </div>
            </div>
          )}

          <div className="sidebar-divider" />

          {isLoggedIn ? (
            <>
              <NavLink to="/profile" className="nav-item" onClick={() => setSidebarOpen(false)}>
                <FiUser /> <span>{authUser?.displayName || "Profil"}</span>
              </NavLink>
              <button onClick={handleLogout} className="nav-item nav-btn">
                <FiLogOut /> <span>Logout</span>
              </button>
            </>
          ) : (
            <NavLink to="/auth" className="nav-item" onClick={() => setSidebarOpen(false)}>
              <FiLogIn /> <span>Anmelden</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* ── Mobile Header ── */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
        <span /><span /><span />
      </button>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main Content ── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard spotifyUser={spotifyUser} isLoggedIn={isLoggedIn} onSpotifyConnect={() => setShowSpotifyModal(true)} />} />
          <Route path="/search" element={<Search />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/auth" element={<AuthPage onSuccess={handleAuthSuccess} />} />
          <Route path="/profile" element={<Profile user={authUser} setUser={setAuthUser} onLogout={handleLogout} spotifyUser={spotifyUser} setSpotifyUser={setSpotifyUser} />} />
        </Routes>
      </main>

      {/* ── Spotify Connect Modal ── */}
      {showSpotifyModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowSpotifyModal(false)} />
          <div className="modal">
            <div className="modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h2 className="modal-title">Spotify verbinden</h2>
            <p className="modal-text">
              Du wirst zu Spotify weitergeleitet, um deinen Account zu verknüpfen. Dort kannst du dich mit deinem bestehenden Spotify-Konto anmelden oder einen anderen Account verwenden.
            </p>
            <div className="modal-actions">
              <a href={spotifyLoginUrl()} className="btn btn-spotify" style={{ flex: 1, justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z"/>
                </svg>
                Verbinden
              </a>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowSpotifyModal(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
