import React, { useState, useCallback } from "react";
import "./App.css";

const BACKEND = process.env.REACT_APP_SPOTIFY_BACKEND_URL || "http://localhost:5050";

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = () => {
    window.location.href = `${BACKEND}/spotify/login`;
  };

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const res = await fetch(
        `${BACKEND}/spotify/search?q=${encodeURIComponent(q)}`,
        { credentials: "include" }
      );
      if (res.status === 401) {
        setError("Bitte zuerst mit Spotify einloggen.");
        setArtists([]);
        return;
      }
      const data = await res.json();
      setArtists(data);
    } catch (e) {
      setError("Suche fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const openArtist = async (artist) => {
    setSelected(artist);
    setTracks([]);
    try {
      const res = await fetch(
        `${BACKEND}/spotify/artist/${artist.id}/top-tracks`,
        { credentials: "include" }
      );
      const data = await res.json();
      setTracks(data.slice(0, 5));
    } catch (e) { }
  };

  return (
    <div className="page">
      <div className="container">

        <div className="header">
          <h1 className="title">🎵 Artist Search</h1>
          <button onClick={login} className="loginBtn">Login with Spotify</button>
        </div>

        <div className="searchRow">
          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Künstler suchen..."
          />
          <button onClick={search} className="searchBtn">Suchen</button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">⏳ Lädt...</p>}

        {selected && (
          <div className="detail">
            <button className="backBtn" onClick={() => setSelected(null)}>← Zurück</button>
            <div className="detailHeader">
              {selected.images[0]
                ? <img src={selected.images[0].url} alt={selected.name} className="detailImg" />
                : <div className="noImg">🎤</div>
              }
              <div className="detailInfo">
                <h2>{selected.name}</h2>
                <span className="stat">👥 {formatNumber(selected.followers.total)} Follower</span>
                <span className="stat">📊 {selected.popularity}/100</span>
                <div className="popularityBar">
                  <div className="popularityFill" style={{ width: `${selected.popularity}%` }} />
                </div>
                <div className="genres">
                  {selected.genres.map((g) => <span key={g} className="genreTag">{g}</span>)}
                </div>
                <a href={selected.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="spotifyLink">
                  Auf Spotify öffnen →
                </a>
              </div>
            </div>

            {tracks.length > 0 && (
              <div className="topTracks">
                <h3>🔥 Top Tracks</h3>
                {tracks.map((track, i) => (
                  <div key={track.id} className="track">
                    <span className="trackNum">{i + 1}</span>
                    <img src={track.album.images[2]?.url} alt="" className="trackImg" />
                    <div className="trackInfo">
                      <div className="trackName">{track.name}</div>
                      <div className="trackAlbum">{track.album.name}</div>
                    </div>
                    {track.preview_url
                      ? <audio controls src={track.preview_url} />
                      : <span className="noPreview">Keine Vorschau</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selected && (
          <div className="grid">
            {artists.map((artist) => (
              <div key={artist.id} className="card" onClick={() => openArtist(artist)}>
                {artist.images[0]
                  ? <img src={artist.images[0].url} alt={artist.name} className="cardImg" />
                  : <div className="noImg">🎤</div>
                }
                <h3>{artist.name}</h3>
                <p className="followers">{formatNumber(artist.followers.total)} Follower</p>
                <p className="genres2">{artist.genres.slice(0, 2).join(", ") || "—"}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}