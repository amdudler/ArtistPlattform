import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiExternalLink, FiDisc, FiUsers, FiMusic } from "react-icons/fi";
import { getArtistDetail, getArtistTopTracks, formatNumber, formatDuration } from "../api";

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getArtistDetail(id),
      getArtistTopTracks(id)
    ]).then(([a, t]) => {
      setArtist(a);
      setTracks(t || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!artist) return <div className="error-msg">Künstler nicht gefunden.</div>;

  const albums = (artist.albums || []).filter(a => a.album_type === "album");
  const singles = (artist.albums || []).filter(a => a.album_type === "single");
  const related = artist.relatedArtists || [];

  // Label aus Alben ableiten
  const labels = [...new Set((artist.albums || []).map(a => a.label).filter(Boolean))];

  return (
    <div>
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Zurück
      </button>

      {/* ── Artist Header ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap" }}>
          {artist.images?.[0]?.url
            ? <img src={artist.images[0].url} alt={artist.name} style={{ width: 180, height: 180, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }} />
            : <div className="artist-card-placeholder" style={{ width: 180, height: 180, fontSize: "4rem" }}>?</div>
          }
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 8 }}>{artist.name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span className="tag tag-accent"><FiUsers style={{ verticalAlign: "middle" }} /> {formatNumber(artist.followers?.total || 0)} Follower</span>
              <span className="tag tag-accent">Popularität: {artist.popularity}/100</span>
              {labels[0] && <span className="tag tag-spotify"><FiDisc style={{ verticalAlign: "middle" }} /> {labels[0]}</span>}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ width: 200, height: 6, background: "var(--bg-input)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${artist.popularity}%`, height: "100%", background: "var(--accent-gradient)", borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {(artist.genres || []).map(g => <span key={g} className="genre-pill">{g}</span>)}
            </div>
            {artist.external_urls?.spotify && (
              <a href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-spotify">
                <FiExternalLink /> Auf Spotify
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        <button className={`tab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Übersicht</button>
        <button className={`tab ${tab === "albums" ? "active" : ""}`} onClick={() => setTab("albums")}>Alben ({albums.length})</button>
        <button className={`tab ${tab === "singles" ? "active" : ""}`} onClick={() => setTab("singles")}>Singles ({singles.length})</button>
        <button className={`tab ${tab === "related" ? "active" : ""}`} onClick={() => setTab("related")}>Ähnliche</button>
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Alben</div>
              <div className="stat-value accent">{albums.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Singles</div>
              <div className="stat-value accent">{singles.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Genres</div>
              <div className="stat-value accent">{(artist.genres || []).length}</div>
            </div>
            {labels.length > 0 && (
              <div className="stat-card">
                <div className="stat-label">Labels</div>
                <div className="stat-value accent">{labels.length}</div>
              </div>
            )}
          </div>

          {/* Labels — US-12 */}
          {labels.length > 0 && (
            <div className="section">
              <h2 className="section-title"><FiDisc /> Labels</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {labels.map(l => <span key={l} className="tag tag-accent">{l}</span>)}
              </div>
            </div>
          )}

          {/* Top Tracks */}
          {tracks.length > 0 && (
            <div className="section">
              <h2 className="section-title"><FiMusic /> Top Tracks</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tracks.slice(0, 10).map((t, i) => (
                  <div key={t.id} className="track-item" onClick={() => navigate(`/analyze?track=${t.id}`)}>
                    <span className="track-num">{i + 1}</span>
                    {t.album?.images?.[2]?.url && <img src={t.album.images[2].url} alt="" className="track-img" />}
                    <div className="track-info">
                      <div className="track-name">{t.name}</div>
                      <div className="track-meta">{t.album?.name}</div>
                    </div>
                    <span className="track-duration">{formatDuration(t.duration_ms)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Albums Tab — US-11 ── */}
      {tab === "albums" && (
        <div className="grid-3">
          {albums.map(a => (
            <div key={a.id} className="card">
              {a.images?.[0]?.url && <img src={a.images[0].url} alt={a.name} style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />}
              <h4 style={{ marginBottom: 4 }}>{a.name}</h4>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.82rem" }}>
                {a.release_date} · {a.total_tracks} Tracks
              </p>
              {a.label && <span className="tag tag-accent" style={{ marginTop: 8 }}>{a.label}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Singles Tab ── */}
      {tab === "singles" && (
        <div className="grid-3">
          {singles.map(a => (
            <div key={a.id} className="card">
              {a.images?.[0]?.url && <img src={a.images[0].url} alt={a.name} style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />}
              <h4 style={{ marginBottom: 4 }}>{a.name}</h4>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.82rem" }}>{a.release_date}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Related Artists Tab — US-13 ── */}
      {tab === "related" && (
        <div className="grid-4">
          {related.map(a => (
            <div key={a.id} className="artist-card" onClick={() => navigate(`/artist/${a.id}`)}>
              {a.images?.[0]?.url
                ? <img src={a.images[0].url} alt={a.name} className="artist-card-img" />
                : <div className="artist-card-placeholder">?</div>
              }
              <div className="artist-card-name">{a.name}</div>
              <div className="artist-card-followers">{formatNumber(a.followers?.total || 0)} Follower</div>
              <div className="artist-card-genres">
                {(a.genres || []).slice(0, 2).map(g => <span key={g} className="tag tag-accent">{g}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
