import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiMusic, FiUsers, FiDisc, FiTrendingUp, FiArrowRight } from "react-icons/fi";
import { getSavedTracks, getFollowedArtists, formatNumber, spotifyLoginUrl } from "../api";

export default function Dashboard({ spotifyUser }) {
  const [savedTracks, setSavedTracks] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!spotifyUser) return;
    setLoading(true);
    Promise.all([
      getSavedTracks().catch(() => []),
      getFollowedArtists().catch(() => [])
    ]).then(([tracks, artists]) => {
      setSavedTracks(tracks.slice(0, 8));
      setFollowedArtists(artists.slice(0, 8));
    }).finally(() => setLoading(false));
  }, [spotifyUser]);

  if (!spotifyUser) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Willkommen bei Artist Platform</h1>
          <p className="page-subtitle">Analysiere Musik, entdecke Genres und finde die Tools hinter dem Sound.</p>
        </div>

        <div className="hero-card">
          <div className="hero-content">
            <h2>Verbinde Spotify um zu starten</h2>
            <p>Verknüpfe deinen Spotify-Account um auf deine Musik zuzugreifen, Songs zu analysieren und Genres zu entdecken.</p>
            <a href={spotifyLoginUrl()} className="btn btn-spotify" style={{ marginTop: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Mit Spotify verbinden
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 32 }}>
            {[
              { icon: <FiMusic />, title: "Song-Analyse", desc: "Genre, Subgenre, Audio-Features pro Song" },
              { icon: <FiUsers />, title: "Künstler-Datenbank", desc: "Alben, Labels, Netzwerke erkunden" },
              { icon: <FiDisc />, title: "Drumkit-Erkennung", desc: "Welche Kits & Plugins stecken im Sound?" },
              { icon: <FiTrendingUp />, title: "Vergleichsmodus", desc: "Zwei Songs direkt gegenüberstellen" },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .hero-card {
            background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.05));
            border: 1px solid var(--border-accent);
            border-radius: var(--radius-xl);
            padding: 40px;
          }
          .hero-content h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
          .hero-content p { color: var(--text-secondary); max-width: 500px; }
          .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 20px;
          }
          .feature-card h4 { font-size: 0.95rem; margin-bottom: 4px; }
          .feature-card p { font-size: 0.82rem; color: var(--text-tertiary); }
          .feature-icon {
            width: 36px; height: 36px;
            background: var(--accent-glow);
            border-radius: var(--radius-sm);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent-light);
            margin-bottom: 12px;
          }
          @media (max-width: 600px) {
            .hero-card > div { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Hallo, {spotifyUser.display_name}! Hier ist deine Übersicht.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Gespeicherte Songs</div>
          <div className="stat-value accent">{savedTracks.length}+</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gefolgte Künstler</div>
          <div className="stat-value accent">{followedArtists.length}+</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spotify Plan</div>
          <div className="stat-value">{spotifyUser.product === "premium" ? "Premium" : "Free"}</div>
        </div>
      </div>

      {loading && <div className="loading-spinner"><div className="spinner" /></div>}

      {!loading && followedArtists.length > 0 && (
        <div className="section">
          <h2 className="section-title"><FiUsers /> Deine Künstler</h2>
          <div className="grid-4">
            {followedArtists.map(a => (
              <div key={a.id} className="artist-card" onClick={() => navigate(`/artist/${a.id}`)}>
                {a.images?.[0]?.url
                  ? <img src={a.images[0].url} alt={a.name} className="artist-card-img" />
                  : <div className="artist-card-placeholder">?</div>
                }
                <div className="artist-card-name">{a.name}</div>
                <div className="artist-card-followers">{formatNumber(a.followers?.total || 0)} Follower</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && savedTracks.length > 0 && (
        <div className="section">
          <h2 className="section-title"><FiMusic /> Zuletzt gespeicherte Songs</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedTracks.map((item, i) => {
              const t = item.track;
              return (
                <div key={t.id} className="track-item" onClick={() => navigate(`/analyze?track=${t.id}`)}>
                  <span className="track-num">{i + 1}</span>
                  {t.album?.images?.[2]?.url && <img src={t.album.images[2].url} alt="" className="track-img" />}
                  <div className="track-info">
                    <div className="track-name">{t.name}</div>
                    <div className="track-meta">{t.artists?.map(a => a.name).join(", ")} — {t.album?.name}</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); navigate(`/analyze?track=${t.id}`); }}>
                    Analysieren <FiArrowRight />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
