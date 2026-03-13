import React, { useMemo, useState } from "react";
import artists from "./artists.json";
import "./App.css";

function App() {
  const backendUrl = process.env.REACT_APP_SPOTIFY_BACKEND_URL || "http://localhost:5050";
  const [query, setQuery] = useState("");

  const login = () => {
    window.location.href = `${backendUrl}/spotify/login`;
  };

  const allArtists = artists.artists || [];
  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allArtists;
    return allArtists.filter((a) => {
      const name = String(a?.name || "").toLowerCase();
      const id = String(a?.spotify_id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [allArtists, query]);

  return (
    <div className="page">
      <div className="container">
        <div className="card">
          <div className="titleRow">
            <div>
              <h1 className="title">Artists</h1>
              <p className="subtitle">Kleines Test-UI mit Spotify Login.</p>
            </div>

            <button onClick={login} className="button">
              Login with Spotify
            </button>
          </div>

          <div className="toolbar">
            <div className="searchWrap">
              <input
                className="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artists…"
                aria-label="Search artists"
              />
              {query ? (
                <button className="clear" onClick={() => setQuery("")} aria-label="Clear search">
                  Clear
                </button>
              ) : null}
            </div>

            <div className="count">
              Showing <b>{filteredArtists.length}</b> / {allArtists.length}
            </div>
          </div>

          <ul className="list">
            {filteredArtists.length ? (
              filteredArtists.map((artist) => (
                <li key={artist.spotify_id} className="listItem">
                  <span className="artistName">{artist.name}</span>
                  <span className="artistMeta">{artist.spotify_id}</span>
                </li>
              ))
            ) : (
              <li className="empty">No artists found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;