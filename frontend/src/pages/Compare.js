import React, { useState } from "react";
import { FiSearch, FiArrowRight } from "react-icons/fi";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { searchTracks, compareTracks } from "../api";

const COLORS_1 = "#8b5cf6";
const COLORS_2 = "#f59e0b";

export default function Compare() {
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [results1, setResults1] = useState([]);
  const [results2, setResults2] = useState([]);
  const [selected1, setSelected1] = useState(null);
  const [selected2, setSelected2] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (q, setter) => {
    if (!q.trim()) return;
    try {
      const data = await searchTracks(q);
      setter(data);
    } catch {}
  };

  const doCompare = async () => {
    if (!selected1 || !selected2) return;
    setLoading(true);
    setError("");
    try {
      const data = await compareTracks(selected1.id, selected2.id);
      setComparison(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const radarData = comparison ? [
    { feature: "Energie", t1: Math.round(comparison.track1.audioFeatures.energy * 100), t2: Math.round(comparison.track2.audioFeatures.energy * 100) },
    { feature: "Tanz", t1: Math.round(comparison.track1.audioFeatures.danceability * 100), t2: Math.round(comparison.track2.audioFeatures.danceability * 100) },
    { feature: "Stimmung", t1: Math.round(comparison.track1.audioFeatures.valence * 100), t2: Math.round(comparison.track2.audioFeatures.valence * 100) },
    { feature: "Akustisch", t1: Math.round(comparison.track1.audioFeatures.acousticness * 100), t2: Math.round(comparison.track2.audioFeatures.acousticness * 100) },
    { feature: "Live", t1: Math.round(comparison.track1.audioFeatures.liveness * 100), t2: Math.round(comparison.track2.audioFeatures.liveness * 100) },
    { feature: "Sprache", t1: Math.round(comparison.track1.audioFeatures.speechiness * 100), t2: Math.round(comparison.track2.audioFeatures.speechiness * 100) },
  ] : [];

  const bpmCompare = comparison ? [
    { name: comparison.track1.name.substring(0, 15), value: comparison.track1.audioFeatures.bpm, fill: COLORS_1 },
    { name: comparison.track2.name.substring(0, 15), value: comparison.track2.audioFeatures.bpm, fill: COLORS_2 },
  ] : [];

  const TrackSelector = ({ query, setQuery, results, setResults, selected, setSelected, label }) => (
    <div className="card" style={{ flex: 1, minWidth: 280 }}>
      <h3 style={{ marginBottom: 12, fontSize: "0.95rem", fontWeight: 700 }}>{label}</h3>
      {!selected ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search(query, setResults)}
              placeholder="Song suchen..."
            />
            <button className="btn btn-sm btn-primary" onClick={() => search(query, setResults)}><FiSearch /></button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {results.map(t => (
              <div key={t.id} className="track-item" onClick={() => { setSelected(t); setResults([]); }}>
                {t.album?.images?.[2]?.url && <img src={t.album.images[2].url} alt="" className="track-img" />}
                <div className="track-info">
                  <div className="track-name">{t.name}</div>
                  <div className="track-meta">{t.artists?.map(a => a.name).join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selected.album?.images?.[2]?.url && <img src={selected.album.images[2].url} alt="" className="track-img" />}
          <div className="track-info">
            <div className="track-name">{selected.name}</div>
            <div className="track-meta">{selected.artists?.map(a => a.name).join(", ")}</div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelected(null)}>Ändern</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Song-Vergleich</h1>
        <p className="page-subtitle">Vergleiche zwei Songs direkt miteinander.</p>
      </div>

      {/* ── Track Selection ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <TrackSelector
          query={query1} setQuery={setQuery1}
          results={results1} setResults={setResults1}
          selected={selected1} setSelected={setSelected1}
          label="Song 1"
        />
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "var(--accent-light)", fontSize: "1.2rem" }}>vs</span>
          </div>
        </div>
        <TrackSelector
          query={query2} setQuery={setQuery2}
          results={results2} setResults={setResults2}
          selected={selected2} setSelected={setSelected2}
          label="Song 2"
        />
      </div>

      {selected1 && selected2 && !comparison && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button className="btn btn-primary" onClick={doCompare} disabled={loading}>
            {loading ? "Vergleiche..." : <><FiArrowRight /> Jetzt vergleichen</>}
          </button>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading-spinner"><div className="spinner" /></div>}

      {/* ── Vergleichsergebnis ── */}
      {comparison && (
        <div>
          {/* Radar Chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="section-title">Audio-Feature Vergleich</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="feature" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                <Radar name={comparison.track1.name} dataKey="t1" stroke={COLORS_1} fill={COLORS_1} fillOpacity={0.15} strokeWidth={2} />
                <Radar name={comparison.track2.name} dataKey="t2" stroke={COLORS_2} fill={COLORS_2} fillOpacity={0.15} strokeWidth={2} />
                <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* BPM + Key */}
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3 className="section-title">BPM Vergleich</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={bpmCompare}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {bpmCompare.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">Tonart & BPM</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginBottom: 4 }}>Song 1</div>
                  <div style={{ fontWeight: 700, color: COLORS_1 }}>{comparison.track1.audioFeatures.key}</div>
                  <div style={{ fontSize: "0.9rem" }}>{comparison.track1.audioFeatures.bpm} BPM</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginBottom: 4 }}>Song 2</div>
                  <div style={{ fontWeight: 700, color: COLORS_2 }}>{comparison.track2.audioFeatures.key}</div>
                  <div style={{ fontSize: "0.9rem" }}>{comparison.track2.audioFeatures.bpm} BPM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Genres Vergleich */}
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3 className="section-title" style={{ color: COLORS_1 }}>Genres: {comparison.track1.name}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {comparison.track1.genres.map((g, i) => (
                  <span key={i} className="genre-pill">{g.micro} <span className="pct">{g.percentage}%</span></span>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="section-title" style={{ color: COLORS_2 }}>Genres: {comparison.track2.name}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {comparison.track2.genres.map((g, i) => (
                  <span key={i} className="genre-pill">{g.micro} <span className="pct">{g.percentage}%</span></span>
                ))}
              </div>
            </div>
          </div>

          {/* Drumkits + Plugins Vergleich */}
          <div className="grid-2">
            <div className="card">
              <h3 className="section-title" style={{ color: COLORS_1 }}>Drumkits: {comparison.track1.name}</h3>
              {comparison.track1.drumkits.map((dk, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div className="equipment-name">{dk.name}</div>
                  <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${dk.confidence}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="section-title" style={{ color: COLORS_2 }}>Drumkits: {comparison.track2.name}</h3>
              {comparison.track2.drumkits.map((dk, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div className="equipment-name">{dk.name}</div>
                  <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${dk.confidence}%`, background: `linear-gradient(90deg, ${COLORS_2}, #d97706)` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => { setComparison(null); setSelected1(null); setSelected2(null); }}>
              Neuer Vergleich
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
