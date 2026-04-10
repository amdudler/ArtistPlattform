import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { searchArtists, formatNumber } from "../api";

export default function Search() {
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      const data = await searchArtists(q);
      setArtists(data);
    } catch (e) {
      setError(e.message || "Suche fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Künstler suchen</h1>
        <p className="page-subtitle">Finde Künstler und erkunde ihre Musik, Alben und Labels.</p>
      </div>

      <div className="search-row">
        <input
          className="input input-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="Künstler suchen..."
        />
        <button onClick={doSearch} className="btn btn-primary">
          <FiSearch /> Suchen
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading-spinner"><div className="spinner" /></div>}

      {!loading && artists.length === 0 && query && !error && (
        <div className="empty-state">
          <div className="empty-state-icon"><FiSearch /></div>
          <h3>Keine Ergebnisse</h3>
          <p>Versuche einen anderen Suchbegriff.</p>
        </div>
      )}

      <div className="grid-4">
        {artists.map(a => (
          <div key={a.id} className="artist-card" onClick={() => navigate(`/artist/${a.id}`)}>
            {a.images?.[0]?.url
              ? <img src={a.images[0].url} alt={a.name} className="artist-card-img" />
              : <div className="artist-card-placeholder">?</div>
            }
            <div className="artist-card-name">{a.name}</div>
            <div className="artist-card-followers">{formatNumber(a.followers?.total || 0)} Follower</div>
            <div className="artist-card-genres">
              {(a.genres || []).slice(0, 3).map(g => (
                <span key={g} className="tag tag-accent">{g}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
