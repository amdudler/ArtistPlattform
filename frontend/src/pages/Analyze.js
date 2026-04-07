import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiSearch, FiMusic, FiDisc, FiCpu } from "react-icons/fi";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { searchTracks, analyzeTrack, formatDuration } from "../api";

const COLORS = ["#8b5cf6", "#a78bfa", "#6366f1", "#c4b5fd", "#818cf8"];

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Wenn ein Track per URL-Parameter kommt, direkt analysieren
  useEffect(() => {
    const trackId = searchParams.get("track");
    if (trackId) {
      doAnalyze(trackId);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const data = await searchTracks(q);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const doAnalyze = async (trackId) => {
    setAnalyzing(true);
    setError("");
    try {
      const data = await analyzeTrack(trackId);
      setAnalysis(data);
      setResults([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Radar-Daten für Audio-Features
  const radarData = analysis ? [
    { feature: "Energie", value: Math.round(analysis.audioFeatures.energy * 100) },
    { feature: "Tanz", value: Math.round(analysis.audioFeatures.danceability * 100) },
    { feature: "Stimmung", value: Math.round(analysis.audioFeatures.valence * 100) },
    { feature: "Akustisch", value: Math.round(analysis.audioFeatures.acousticness * 100) },
    { feature: "Live", value: Math.round(analysis.audioFeatures.liveness * 100) },
    { feature: "Sprache", value: Math.round(analysis.audioFeatures.speechiness * 100) },
    { feature: "Instrumental", value: Math.round(analysis.audioFeatures.instrumentalness * 100) },
  ] : [];

  // Genre-Bar-Daten
  const genreBarData = analysis ? analysis.genres.map(g => ({
    name: g.micro,
    value: g.percentage
  })) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Song-Analyse</h1>
        <p className="page-subtitle">Analysiere einen Song: Genre, Subgenre, Audio-Features, Drumkits & Plugins. (US-14 bis US-17)</p>
      </div>

      {/* ── Suche ── */}
      <div className="search-row">
        <input
          className="input input-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="Song suchen..."
        />
        <button onClick={doSearch} className="btn btn-primary">
          <FiSearch /> Suchen
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading-spinner"><div className="spinner" /></div>}

      {/* ── Suchergebnisse ── */}
      {results.length > 0 && !analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {results.map(t => (
            <div key={t.id} className="track-item" onClick={() => doAnalyze(t.id)}>
              {t.album?.images?.[2]?.url && <img src={t.album.images[2].url} alt="" className="track-img" />}
              <div className="track-info">
                <div className="track-name">{t.name}</div>
                <div className="track-meta">{t.artists?.map(a => a.name).join(", ")} — {t.album?.name}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); doAnalyze(t.id); }}>
                Analysieren
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Analyse-Ergebnis ── */}
      {analyzing && (
        <div className="loading-spinner" style={{ flexDirection: "column", gap: 12 }}>
          <div className="spinner" />
          <p style={{ color: "var(--text-secondary)" }}>Song wird analysiert...</p>
        </div>
      )}

      {analysis && (
        <div>
          {/* Song Header */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              {analysis.track.album.image && (
                <img src={analysis.track.album.image} alt="" style={{ width: 120, height: 120, borderRadius: 12 }} />
              )}
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>{analysis.track.name}</h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
                  {analysis.track.artists.map(a => a.name).join(", ")} — {analysis.track.album.name}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="tag tag-accent">{analysis.audioFeatures.bpm} BPM</span>
                  <span className="tag tag-accent">{analysis.audioFeatures.key}</span>
                  <span className="tag tag-accent">{formatDuration(analysis.track.durationMs)}</span>
                  <span className="tag tag-accent">{analysis.audioFeatures.timeSignature}/4 Takt</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* ── Genre-Analyse (US-14, US-15, US-16) ── */}
            <div className="card">
              <h3 className="section-title"><FiMusic /> Genre-Analyse</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {analysis.genres.map((g, i) => (
                  <span key={i} className="genre-pill">
                    {g.micro} <span className="pct">{g.percentage}%</span>
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={genreBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                    formatter={(v) => [`${v}%`, "Anteil"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {genreBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Audio-Features Radar (US-17) ── */}
            <div className="card">
              <h3 className="section-title">Audio-Features</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="feature" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                  <Radar
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="rgba(139,92,246,0.2)"
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Audio Feature Bars ── */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="section-title">Detaillierte Audio-Features</h3>
            {[
              { label: "Energie", value: analysis.audioFeatures.energy },
              { label: "Tanzbarkeit", value: analysis.audioFeatures.danceability },
              { label: "Stimmung (Valence)", value: analysis.audioFeatures.valence },
              { label: "Akustisch", value: analysis.audioFeatures.acousticness },
              { label: "Instrumental", value: analysis.audioFeatures.instrumentalness },
              { label: "Liveness", value: analysis.audioFeatures.liveness },
              { label: "Speechiness", value: analysis.audioFeatures.speechiness },
            ].map(f => (
              <div key={f.label} className="feature-bar">
                <span className="feature-label">{f.label}</span>
                <div className="feature-track">
                  <div className="feature-fill" style={{ width: `${Math.round(f.value * 100)}%` }} />
                </div>
                <span className="feature-value">{Math.round(f.value * 100)}%</span>
              </div>
            ))}
          </div>

          {/* ── Drumkits (US-19) ── */}
          <div className="section" style={{ marginTop: 24 }}>
            <h2 className="section-title"><FiDisc /> Drumkit-Vorschläge</h2>
            <div className="grid-3">
              {analysis.drumkits.map((dk, i) => (
                <div key={i} className="equipment-card">
                  <div className="equipment-name">{dk.name}</div>
                  <div className="equipment-tags">
                    {dk.tags.map(t => <span key={t} className="equipment-tag">{t}</span>)}
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${dk.confidence}%` }} />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: 4 }}>{dk.confidence}% Übereinstimmung</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Plugins (US-20) ── */}
          <div className="section">
            <h2 className="section-title"><FiCpu /> Plugin-Vorschläge</h2>
            <div className="grid-3">
              {analysis.plugins.map((p, i) => (
                <div key={i} className="equipment-card">
                  <div className="equipment-name">{p.name}</div>
                  <div className="equipment-type">{p.type}</div>
                  <div className="equipment-tags">
                    {p.tags.map(t => <span key={t} className="equipment-tag">{t}</span>)}
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${p.confidence}%` }} />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: 4 }}>{p.confidence}% Übereinstimmung</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Neuen Song analysieren ── */}
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => { setAnalysis(null); setResults([]); navigate("/analyze"); }}>
            Neuen Song analysieren
          </button>
        </div>
      )}
    </div>
  );
}
