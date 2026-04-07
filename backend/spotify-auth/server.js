require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// ── Konfiguration ──
const PORT = Number(process.env.PORT || 5050);
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const JWT_SECRET = process.env.JWT_SECRET || "artistplattform-jwt-secret-2024";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_SCOPES =
  process.env.SPOTIFY_SCOPES ||
  [
    "user-read-email",
    "user-read-private",
    "user-top-read",
    "user-library-read",
    "user-follow-read",
    "playlist-read-private"
  ].join(" ");

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in env.");
}

// ── Einfache JSON-Datei als Datenbank (wird später durch PostgreSQL/Directus ersetzt) ──
const DB_PATH = path.join(__dirname, "db.json");

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch {}
  return { users: [], savedArtists: [], analyzedSongs: [] };
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── JWT Helpers ──
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: "30d" });
  return { accessToken, refreshToken };
}

function verifyJWT(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Auth Middleware ──
function authMiddleware(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not_authenticated" });
  try {
    const payload = verifyJWT(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// ── Spotify Helpers ──
function assertSpotifyClientConfigured() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return "missing";
  const bad =
    SPOTIFY_CLIENT_ID.includes("your_client_id_here") ||
    SPOTIFY_CLIENT_SECRET.includes("your_client_secret_here");
  if (bad) return "placeholder";
  return null;
}

const REFRESH_COOKIE = "spotify_refresh_token";

function buildAuthorizeUrl({ state }) {
  const redirectUri = `${BACKEND_URL}/spotify/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID || "",
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const redirectUri = `${BACKEND_URL}/spotify/callback`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`Spotify token exchange failed: ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`Spotify refresh failed: ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function spotifyGet(urlPath, accessToken) {
  const res = await fetch(`https://api.spotify.com/v1${urlPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`Spotify API failed: ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function getSpotifyAccessToken(req) {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) return null;
  const refreshed = await refreshAccessToken(refreshToken);
  return refreshed.access_token;
}

// ── Genre-Analyse-Engine ──
// Mapping von Audio-Features + Spotify-Genres auf detaillierte Subgenres
const GENRE_RULES = [
  // Hip-Hop/Rap Subgenres
  { match: g => /trap|hood/i.test(g), base: "Hip-Hop/Rap", sub: "Trap", micro: "Hoodtrap", bpmRange: [130, 170], energyRange: [0.6, 1.0] },
  { match: g => /drill/i.test(g), base: "Hip-Hop/Rap", sub: "Drill", micro: "UK Drill", bpmRange: [140, 150], energyRange: [0.5, 0.9] },
  { match: g => /phonk/i.test(g), base: "Hip-Hop/Rap", sub: "Phonk", micro: "Drift Phonk", bpmRange: [130, 160], energyRange: [0.7, 1.0] },
  { match: g => /cloud|lo-?fi.*hip|chillhop/i.test(g), base: "Hip-Hop/Rap", sub: "Lo-Fi Hip-Hop", micro: "Cloud Rap", bpmRange: [70, 100], energyRange: [0.1, 0.5] },
  { match: g => /boom.*bap|old.*school.*hip/i.test(g), base: "Hip-Hop/Rap", sub: "Boom Bap", micro: "Classic Boom Bap", bpmRange: [85, 115], energyRange: [0.4, 0.7] },
  { match: g => /conscious|political.*rap/i.test(g), base: "Hip-Hop/Rap", sub: "Conscious Rap", micro: "Conscious Rap", bpmRange: [80, 120], energyRange: [0.3, 0.7] },
  { match: g => /gangsta/i.test(g), base: "Hip-Hop/Rap", sub: "Gangsta Rap", micro: "West Coast Gangsta", bpmRange: [90, 110], energyRange: [0.5, 0.8] },
  { match: g => /crunk/i.test(g), base: "Hip-Hop/Rap", sub: "Crunk", micro: "Crunk", bpmRange: [130, 150], energyRange: [0.7, 1.0] },
  { match: g => /memphis/i.test(g), base: "Hip-Hop/Rap", sub: "Memphis Rap", micro: "Memphis Rap", bpmRange: [130, 160], energyRange: [0.5, 0.9] },
  { match: g => /jersey.*club/i.test(g), base: "Hip-Hop/Rap", sub: "Jersey Club", micro: "Jersey Club", bpmRange: [130, 145], energyRange: [0.7, 1.0] },
  { match: g => /rap|hip.*hop|rapper/i.test(g), base: "Hip-Hop/Rap", sub: "Hip-Hop", micro: "Modern Hip-Hop", bpmRange: [80, 170], energyRange: [0.3, 1.0] },

  // Rock Subgenres
  { match: g => /metal.*death|death.*metal/i.test(g), base: "Rock", sub: "Death Metal", micro: "Death Metal", bpmRange: [140, 250], energyRange: [0.8, 1.0] },
  { match: g => /black.*metal/i.test(g), base: "Rock", sub: "Black Metal", micro: "Black Metal", bpmRange: [120, 250], energyRange: [0.7, 1.0] },
  { match: g => /doom/i.test(g), base: "Rock", sub: "Doom Metal", micro: "Doom Metal", bpmRange: [50, 90], energyRange: [0.4, 0.8] },
  { match: g => /heavy.*metal|metal/i.test(g), base: "Rock", sub: "Heavy Metal", micro: "Heavy Metal", bpmRange: [100, 200], energyRange: [0.7, 1.0] },
  { match: g => /punk|post.*punk/i.test(g), base: "Rock", sub: "Punk", micro: "Post-Punk", bpmRange: [120, 200], energyRange: [0.6, 1.0] },
  { match: g => /emo|screamo/i.test(g), base: "Rock", sub: "Emo", micro: "Screamo", bpmRange: [120, 180], energyRange: [0.5, 0.9] },
  { match: g => /shoegaze/i.test(g), base: "Rock", sub: "Shoegaze", micro: "Shoegaze", bpmRange: [80, 140], energyRange: [0.3, 0.7] },
  { match: g => /grunge/i.test(g), base: "Rock", sub: "Grunge", micro: "Grunge", bpmRange: [90, 150], energyRange: [0.5, 0.9] },
  { match: g => /indie.*rock|alternative/i.test(g), base: "Rock", sub: "Indie Rock", micro: "Alternative Rock", bpmRange: [80, 160], energyRange: [0.3, 0.8] },
  { match: g => /rock|classic.*rock|hard.*rock/i.test(g), base: "Rock", sub: "Rock", micro: "Classic Rock", bpmRange: [80, 180], energyRange: [0.4, 1.0] },

  // Electronic Subgenres
  { match: g => /deep.*house/i.test(g), base: "Electronic", sub: "Deep House", micro: "Deep House", bpmRange: [118, 130], energyRange: [0.4, 0.7] },
  { match: g => /tech.*house/i.test(g), base: "Electronic", sub: "Tech House", micro: "Tech House", bpmRange: [122, 132], energyRange: [0.5, 0.8] },
  { match: g => /house/i.test(g), base: "Electronic", sub: "House", micro: "House", bpmRange: [118, 135], energyRange: [0.5, 0.9] },
  { match: g => /techno/i.test(g), base: "Electronic", sub: "Techno", micro: "Techno", bpmRange: [125, 150], energyRange: [0.5, 0.9] },
  { match: g => /trance/i.test(g), base: "Electronic", sub: "Trance", micro: "Trance", bpmRange: [128, 150], energyRange: [0.5, 0.9] },
  { match: g => /drum.*bass|jungle|dnb/i.test(g), base: "Electronic", sub: "Drum & Bass", micro: "Drum & Bass", bpmRange: [160, 180], energyRange: [0.6, 1.0] },
  { match: g => /dubstep/i.test(g), base: "Electronic", sub: "Dubstep", micro: "Dubstep", bpmRange: [138, 142], energyRange: [0.6, 1.0] },
  { match: g => /future.*bass/i.test(g), base: "Electronic", sub: "Future Bass", micro: "Future Bass", bpmRange: [130, 175], energyRange: [0.5, 0.9] },
  { match: g => /synthwave|retrowave/i.test(g), base: "Electronic", sub: "Synthwave", micro: "Synthwave", bpmRange: [80, 130], energyRange: [0.4, 0.8] },
  { match: g => /ambient/i.test(g), base: "Electronic", sub: "Ambient", micro: "Ambient", bpmRange: [60, 120], energyRange: [0.0, 0.4] },
  { match: g => /idm/i.test(g), base: "Electronic", sub: "IDM", micro: "IDM", bpmRange: [90, 170], energyRange: [0.3, 0.8] },
  { match: g => /hyperpop/i.test(g), base: "Electronic", sub: "Hyperpop", micro: "Hyperpop", bpmRange: [120, 180], energyRange: [0.6, 1.0] },
  { match: g => /electro|edm|electronic/i.test(g), base: "Electronic", sub: "Electronic", micro: "Electronic", bpmRange: [100, 180], energyRange: [0.4, 1.0] },

  // Pop Subgenres
  { match: g => /k-?pop/i.test(g), base: "Pop", sub: "K-Pop", micro: "K-Pop", bpmRange: [90, 160], energyRange: [0.5, 0.9] },
  { match: g => /dream.*pop/i.test(g), base: "Pop", sub: "Dream Pop", micro: "Dream Pop", bpmRange: [70, 130], energyRange: [0.2, 0.6] },
  { match: g => /bedroom.*pop/i.test(g), base: "Pop", sub: "Bedroom Pop", micro: "Bedroom Pop", bpmRange: [70, 120], energyRange: [0.2, 0.5] },
  { match: g => /indie.*pop/i.test(g), base: "Pop", sub: "Indie Pop", micro: "Indie Pop", bpmRange: [80, 140], energyRange: [0.3, 0.7] },
  { match: g => /electro.*pop|synth.*pop/i.test(g), base: "Pop", sub: "Electropop", micro: "Electropop", bpmRange: [100, 140], energyRange: [0.5, 0.9] },
  { match: g => /pop/i.test(g), base: "Pop", sub: "Pop", micro: "Pop", bpmRange: [90, 140], energyRange: [0.4, 0.9] },

  // Jazz
  { match: g => /jazz.*fusion|fusion/i.test(g), base: "Jazz", sub: "Jazz Fusion", micro: "Jazz Fusion", bpmRange: [80, 180], energyRange: [0.3, 0.8] },
  { match: g => /nu.*jazz/i.test(g), base: "Jazz", sub: "Nu-Jazz", micro: "Nu-Jazz", bpmRange: [80, 140], energyRange: [0.3, 0.7] },
  { match: g => /bebop/i.test(g), base: "Jazz", sub: "Bebop", micro: "Bebop", bpmRange: [120, 300], energyRange: [0.4, 0.8] },
  { match: g => /jazz/i.test(g), base: "Jazz", sub: "Jazz", micro: "Jazz", bpmRange: [60, 200], energyRange: [0.2, 0.8] },

  // R&B / Soul
  { match: g => /neo.*soul/i.test(g), base: "R&B/Soul", sub: "Neo-Soul", micro: "Neo-Soul", bpmRange: [70, 110], energyRange: [0.3, 0.6] },
  { match: g => /funk/i.test(g), base: "R&B/Soul", sub: "Funk", micro: "Modern Funk", bpmRange: [90, 130], energyRange: [0.5, 0.9] },
  { match: g => /r&b|rnb|soul|rhythm/i.test(g), base: "R&B/Soul", sub: "R&B", micro: "Contemporary R&B", bpmRange: [60, 120], energyRange: [0.2, 0.7] },

  // Andere
  { match: g => /reggae|dancehall/i.test(g), base: "Reggae", sub: "Reggae", micro: "Reggae", bpmRange: [60, 110], energyRange: [0.3, 0.7] },
  { match: g => /afrobeat/i.test(g), base: "Afrobeats", sub: "Afrobeats", micro: "Afrobeats", bpmRange: [95, 130], energyRange: [0.5, 0.9] },
  { match: g => /latin|reggaeton|salsa/i.test(g), base: "Latin", sub: "Latin", micro: "Reggaeton", bpmRange: [80, 130], energyRange: [0.5, 0.9] },
  { match: g => /classical|orchestra/i.test(g), base: "Classical", sub: "Classical", micro: "Classical", bpmRange: [40, 200], energyRange: [0.1, 0.8] },
  { match: g => /gospel/i.test(g), base: "R&B/Soul", sub: "Gospel", micro: "Gospel", bpmRange: [60, 140], energyRange: [0.3, 0.8] },
];

// Analysiert einen Song basierend auf Spotify-Audio-Features und Künstler-Genres
function analyzeGenres(audioFeatures, artistGenres) {
  const bpm = audioFeatures.tempo || 120;
  const energy = audioFeatures.energy || 0.5;
  const genreStr = (artistGenres || []).join(" ");

  const scores = [];

  for (const rule of GENRE_RULES) {
    let score = 0;

    // Genre-Name-Match
    if (rule.match(genreStr)) {
      score += 50;
    }

    // BPM-Match
    if (bpm >= rule.bpmRange[0] && bpm <= rule.bpmRange[1]) {
      score += 20;
    }

    // Energie-Match
    if (energy >= rule.energyRange[0] && energy <= rule.energyRange[1]) {
      score += 15;
    }

    // Valence (Stimmung) als Bonus
    if (audioFeatures.valence !== undefined) {
      if (rule.sub.includes("Lo-Fi") || rule.sub.includes("Ambient") || rule.sub.includes("Dream")) {
        if (audioFeatures.valence < 0.4) score += 10;
      }
      if (rule.sub.includes("Crunk") || rule.sub.includes("Jersey") || rule.sub.includes("Funk")) {
        if (audioFeatures.valence > 0.6) score += 10;
      }
    }

    // Danceability Bonus
    if (audioFeatures.danceability !== undefined) {
      if (rule.base === "Electronic" || rule.sub === "Funk" || rule.sub === "Afrobeats") {
        if (audioFeatures.danceability > 0.7) score += 10;
      }
    }

    // Instrumentalness Bonus
    if (audioFeatures.instrumentalness !== undefined) {
      if (rule.base === "Electronic" || rule.base === "Jazz" || rule.base === "Classical") {
        if (audioFeatures.instrumentalness > 0.5) score += 10;
      }
    }

    if (score > 0) {
      scores.push({ ...rule, score });
    }
  }

  // Sortieren nach Score, Top-Genres nehmen
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, 5);
  const totalScore = topScores.reduce((sum, s) => sum + s.score, 0);

  const genres = topScores.map(s => ({
    base: s.base,
    sub: s.sub,
    micro: s.micro,
    percentage: totalScore > 0 ? Math.round((s.score / totalScore) * 100) : 0
  }));

  // Sicherstellen, dass Prozente 100% ergeben
  if (genres.length > 0) {
    const diff = 100 - genres.reduce((sum, g) => sum + g.percentage, 0);
    genres[0].percentage += diff;
  }

  return genres;
}

// ── Drumkit & Plugin Erkennung ──
const DRUMKIT_DB = [
  { name: "808 Mafia Kit", tags: ["trap", "808", "hard-hitting"], bpmRange: [130, 170], energyRange: [0.6, 1.0], genres: ["trap", "hoodtrap", "drill"] },
  { name: "Southside Drums", tags: ["trap", "dark", "808"], bpmRange: [130, 160], energyRange: [0.6, 1.0], genres: ["trap", "hoodtrap"] },
  { name: "Metro Boomin Kit", tags: ["trap", "melodic", "808"], bpmRange: [130, 165], energyRange: [0.5, 0.9], genres: ["trap", "melodic trap"] },
  { name: "Nick Mira Kit", tags: ["melodic", "guitar", "piano"], bpmRange: [120, 165], energyRange: [0.4, 0.8], genres: ["hip-hop", "melodic rap"] },
  { name: "Pierre Bourne Kit", tags: ["spacey", "playful", "synth"], bpmRange: [140, 175], energyRange: [0.5, 0.9], genres: ["trap", "cloud rap"] },
  { name: "Cxdy Drums", tags: ["phonk", "dark", "memphis"], bpmRange: [130, 160], energyRange: [0.6, 1.0], genres: ["phonk", "memphis rap"] },
  { name: "DECAP Drums That Knock", tags: ["hard", "punchy", "versatile"], bpmRange: [80, 170], energyRange: [0.5, 1.0], genres: ["hip-hop", "trap", "boom bap"] },
  { name: "J Dilla Drum Kit", tags: ["boom bap", "soulful", "swing"], bpmRange: [80, 110], energyRange: [0.3, 0.7], genres: ["boom bap", "lo-fi hip-hop"] },
  { name: "Timbaland Kit", tags: ["bouncy", "experimental", "r&b"], bpmRange: [90, 130], energyRange: [0.5, 0.9], genres: ["r&b", "pop", "hip-hop"] },
  { name: "Pharrell/Neptunes Kit", tags: ["minimal", "funky", "pop"], bpmRange: [90, 140], energyRange: [0.5, 0.9], genres: ["pop", "r&b", "hip-hop"] },
  { name: "Classic House Kit", tags: ["house", "four-on-floor", "clap"], bpmRange: [118, 135], energyRange: [0.5, 0.9], genres: ["house", "deep house", "tech house"] },
  { name: "Techno Industrial Kit", tags: ["techno", "industrial", "dark"], bpmRange: [125, 150], energyRange: [0.6, 1.0], genres: ["techno"] },
  { name: "DnB Breaks Kit", tags: ["breakbeat", "amen", "fast"], bpmRange: [160, 180], energyRange: [0.7, 1.0], genres: ["drum & bass", "jungle"] },
  { name: "Acoustic Rock Kit", tags: ["rock", "live", "organic"], bpmRange: [80, 180], energyRange: [0.4, 1.0], genres: ["rock", "indie rock", "alternative"] },
  { name: "Jazz Brush Kit", tags: ["jazz", "brush", "swing"], bpmRange: [60, 200], energyRange: [0.2, 0.6], genres: ["jazz", "nu-jazz", "jazz fusion"] },
  { name: "Lo-Fi Dusty Kit", tags: ["lo-fi", "vinyl", "chill"], bpmRange: [70, 100], energyRange: [0.1, 0.5], genres: ["lo-fi hip-hop", "chillhop"] },
  { name: "Latin Percussion Kit", tags: ["latin", "congas", "timbales"], bpmRange: [80, 130], energyRange: [0.5, 0.9], genres: ["latin", "reggaeton", "afrobeats"] },
  { name: "Afrobeats Kit", tags: ["afro", "percussion", "bounce"], bpmRange: [95, 130], energyRange: [0.5, 0.9], genres: ["afrobeats"] },
];

const PLUGIN_DB = [
  { name: "Serum (Xfer)", type: "Synthesizer", tags: ["wavetable", "bass", "lead"], genres: ["electronic", "dubstep", "future bass", "trap", "hyperpop"] },
  { name: "Omnisphere (Spectrasonics)", type: "Synthesizer", tags: ["pad", "atmospheric", "keys"], genres: ["hip-hop", "r&b", "pop", "trap", "ambient"] },
  { name: "Nexus (reFX)", type: "Synthesizer", tags: ["preset", "lead", "pluck"], genres: ["house", "trance", "edm", "pop", "eurodance"] },
  { name: "Kontakt (Native Instruments)", type: "Sampler", tags: ["orchestral", "keys", "versatile"], genres: ["classical", "hip-hop", "jazz", "pop", "rock"] },
  { name: "Sylenth1 (LennarDigital)", type: "Synthesizer", tags: ["warm", "analog", "lead"], genres: ["trance", "house", "progressive", "edm"] },
  { name: "Massive X (Native Instruments)", type: "Synthesizer", tags: ["bass", "growl", "wavetable"], genres: ["dubstep", "drum & bass", "electronic", "trap"] },
  { name: "Vital (Matt Tytel)", type: "Synthesizer", tags: ["wavetable", "free", "modern"], genres: ["electronic", "hyperpop", "future bass", "trap"] },
  { name: "FM8 (Native Instruments)", type: "Synthesizer", tags: ["fm", "bell", "metallic"], genres: ["electronic", "idm", "techno", "house"] },
  { name: "Diva (u-he)", type: "Synthesizer", tags: ["analog", "warm", "classic"], genres: ["synthwave", "techno", "house", "pop"] },
  { name: "Pigments (Arturia)", type: "Synthesizer", tags: ["wavetable", "granular", "modern"], genres: ["electronic", "ambient", "experimental"] },
  { name: "ElectraX / Electra2", type: "Synthesizer", tags: ["trap", "lead", "brass"], genres: ["trap", "hip-hop", "r&b"] },
  { name: "RC-20 Retro Color", type: "Effect", tags: ["vinyl", "lofi", "texture"], genres: ["lo-fi hip-hop", "boom bap", "neo-soul"] },
  { name: "Valhalla Reverb", type: "Effect", tags: ["reverb", "space", "lush"], genres: ["shoegaze", "ambient", "dream pop", "electronic"] },
  { name: "Soundtoys Decapitator", type: "Effect", tags: ["saturation", "distortion", "warmth"], genres: ["rock", "hip-hop", "electronic"] },
  { name: "CamelCrusher", type: "Effect", tags: ["distortion", "compression", "free"], genres: ["trap", "dubstep", "electronic"] },
  { name: "Gross Beat (Image-Line)", type: "Effect", tags: ["glitch", "halftime", "stutter"], genres: ["trap", "hip-hop", "phonk"] },
  { name: "OTT (Xfer)", type: "Effect", tags: ["compression", "brightness", "punch"], genres: ["dubstep", "future bass", "electronic", "trap"] },
  { name: "Keyscape (Spectrasonics)", type: "Keys", tags: ["piano", "rhodes", "wurlitzer"], genres: ["r&b", "jazz", "neo-soul", "pop", "gospel"] },
  { name: "Addictive Drums 2", type: "Drums", tags: ["realistic", "rock", "pop"], genres: ["rock", "pop", "indie", "alternative"] },
  { name: "Superior Drummer 3", type: "Drums", tags: ["realistic", "metal", "rock"], genres: ["metal", "rock", "jazz"] },
];

function suggestDrumkits(audioFeatures, genreResults) {
  const bpm = audioFeatures.tempo || 120;
  const energy = audioFeatures.energy || 0.5;
  const detectedGenres = genreResults.map(g => g.sub.toLowerCase());

  return DRUMKIT_DB
    .map(kit => {
      let score = 0;
      if (bpm >= kit.bpmRange[0] && bpm <= kit.bpmRange[1]) score += 30;
      if (energy >= kit.energyRange[0] && energy <= kit.energyRange[1]) score += 20;
      for (const g of detectedGenres) {
        if (kit.genres.some(kg => g.includes(kg) || kg.includes(g))) score += 25;
      }
      return { ...kit, score };
    })
    .filter(k => k.score > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ name, tags, score }) => ({ name, tags, confidence: Math.min(Math.round(score * 1.2), 100) }));
}

function suggestPlugins(genreResults) {
  const detectedGenres = genreResults.map(g => g.sub.toLowerCase());

  return PLUGIN_DB
    .map(plugin => {
      let score = 0;
      for (const g of detectedGenres) {
        if (plugin.genres.some(pg => g.includes(pg) || pg.includes(g))) score += 30;
      }
      return { ...plugin, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ name, type, tags, score }) => ({ name, type, tags, confidence: Math.min(Math.round(score * 1.5), 100) }));
}

// ── Tonart-Mapping ──
const KEY_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];

function getKeyString(key, mode) {
  if (key === undefined || key < 0) return "Unbekannt";
  const keyName = KEY_NAMES[key] || "?";
  const modeName = mode === 1 ? "Dur" : "Moll";
  return `${keyName} ${modeName}`;
}

// ══════════════════════════════════════
// ── Express App ──
// ══════════════════════════════════════
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

// ── Health ──
app.get("/health", (_req, res) => res.json({ ok: true }));

// ══════════════════════════════════════
// ── AUTH ROUTES (US-01 bis US-05) ──
// ══════════════════════════════════════

// US-01: Registrierung
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email und Passwort erforderlich." });
    if (password.length < 6) return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben." });

    const db = loadDB();
    if (db.users.find(u => u.email === email.toLowerCase())) {
      return res.status(409).json({ error: "E-Mail bereits registriert." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName || email.split("@")[0],
      avatar: null,
      bio: "",
      spotifyLinked: false,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    saveDB(db);

    const tokens = generateTokens(user.id);
    const { password: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, ...tokens });
  } catch (e) {
    res.status(500).json({ error: "Registrierung fehlgeschlagen.", details: String(e?.message) });
  }
});

// US-02: Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email und Passwort erforderlich." });

    const db = loadDB();
    const user = db.users.find(u => u.email === email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Ungültige Anmeldedaten." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Ungültige Anmeldedaten." });

    const tokens = generateTokens(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, ...tokens });
  } catch (e) {
    res.status(500).json({ error: "Login fehlgeschlagen.", details: String(e?.message) });
  }
});

// US-02: Token Refresh
app.post("/auth/refresh", (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh-Token erforderlich." });

    const payload = verifyJWT(refreshToken);
    if (payload.type !== "refresh") return res.status(401).json({ error: "Ungültiger Token-Typ." });

    const tokens = generateTokens(payload.userId);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Token abgelaufen oder ungültig." });
  }
});

// US-04: Profil abrufen
app.get("/auth/me", authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden." });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// US-04: Profil bearbeiten
app.put("/auth/me", authMiddleware, (req, res) => {
  const { displayName, avatar, bio } = req.body;
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.userId);
  if (idx === -1) return res.status(404).json({ error: "Benutzer nicht gefunden." });

  if (displayName !== undefined) db.users[idx].displayName = displayName;
  if (avatar !== undefined) db.users[idx].avatar = avatar;
  if (bio !== undefined) db.users[idx].bio = bio;

  saveDB(db);
  const { password: _, ...safeUser } = db.users[idx];
  res.json(safeUser);
});

// US-03: Passwort ändern
app.post("/auth/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Beide Passwörter erforderlich." });
  if (newPassword.length < 6) return res.status(400).json({ error: "Neues Passwort muss mindestens 6 Zeichen haben." });

  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.userId);
  if (idx === -1) return res.status(404).json({ error: "Benutzer nicht gefunden." });

  const valid = await bcrypt.compare(currentPassword, db.users[idx].password);
  if (!valid) return res.status(401).json({ error: "Aktuelles Passwort falsch." });

  db.users[idx].password = await bcrypt.hash(newPassword, 12);
  saveDB(db);
  res.json({ ok: true });
});

// US-05: Account löschen
app.delete("/auth/me", authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Passwort zur Bestätigung erforderlich." });

  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.userId);
  if (idx === -1) return res.status(404).json({ error: "Benutzer nicht gefunden." });

  const valid = await bcrypt.compare(password, db.users[idx].password);
  if (!valid) return res.status(401).json({ error: "Passwort falsch." });

  db.users.splice(idx, 1);
  db.savedArtists = db.savedArtists.filter(a => a.userId !== req.userId);
  db.analyzedSongs = db.analyzedSongs.filter(s => s.userId !== req.userId);
  saveDB(db);
  res.json({ ok: true });
});

// ══════════════════════════════════════
// ── SPOTIFY ROUTES (US-06 bis US-09) ──
// ══════════════════════════════════════

app.get("/spotify/login", (req, res) => {
  const cfg = assertSpotifyClientConfigured();
  if (cfg) {
    return res.status(500).json({
      error: "spotify_client_not_configured",
      hint: cfg === "missing"
        ? "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in backend/.env"
        : "backend/.env still contains placeholder values."
    });
  }
  const state = Buffer.from(String(Date.now())).toString("base64url");
  res.redirect(buildAuthorizeUrl({ state }));
});

app.get("/spotify/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.redirect(`${FRONTEND_URL}/spotify/callback?error=${encodeURIComponent(error)}`);
    if (!code) return res.redirect(`${FRONTEND_URL}/spotify/callback?error=missing_code`);

    const tokens = await exchangeCodeForTokens(String(code));
    if (tokens.refresh_token) {
      res.cookie(REFRESH_COOKIE, tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/"
      });
    }
    return res.redirect(`${FRONTEND_URL}/spotify/callback?success=1`);
  } catch (e) {
    const msg = e?.data ? JSON.stringify(e.data) : String(e?.message || e);
    return res.redirect(`${FRONTEND_URL}/spotify/callback?error=${encodeURIComponent(msg)}`);
  }
});

app.get("/spotify/token", async (req, res) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (!refreshToken) return res.status(401).json({ error: "missing_refresh_token" });
    const refreshed = await refreshAccessToken(refreshToken);
    return res.json({
      access_token: refreshed.access_token,
      token_type: refreshed.token_type,
      expires_in: refreshed.expires_in,
      scope: refreshed.scope
    });
  } catch (e) {
    return res.status(500).json({ error: "refresh_failed", details: e?.data || String(e?.message || e) });
  }
});

app.post("/spotify/logout", (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// US-07: Spotify-Verknüpfung trennen
app.post("/spotify/disconnect", (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.json({ ok: true, message: "Spotify-Verknüpfung getrennt." });
});

app.get("/spotify/me", async (req, res) => {
  try {
    const header = req.get("authorization") || "";
    const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;
    let accessToken = bearer;
    if (!accessToken) {
      const refreshToken = req.cookies[REFRESH_COOKIE];
      if (!refreshToken) return res.status(401).json({ error: "not_logged_in" });
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
    }
    const me = await spotifyGet("/me", accessToken);
    res.json(me);
  } catch (e) {
    res.status(500).json({ error: "spotify_me_failed", details: e?.data || String(e?.message || e) });
  }
});

// ── Suche ──
app.get("/spotify/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "missing_query" });
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=artist&limit=12`, accessToken);
    res.json(data.artists.items);
  } catch (e) {
    res.status(500).json({ error: "search_failed", details: String(e?.message || e) });
  }
});

// ── Artist Top Tracks ──
app.get("/spotify/artist/:id/top-tracks", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet(`/artists/${req.params.id}/top-tracks?market=DE`, accessToken);
    res.json(data.tracks);
  } catch (e) {
    res.status(500).json({ error: "tracks_failed", details: String(e?.message || e) });
  }
});

// ── Artist Details (Alben, Label etc.) — US-11, US-12 ──
app.get("/spotify/artist/:id", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });

    const [artist, albums, relatedArtists] = await Promise.all([
      spotifyGet(`/artists/${req.params.id}`, accessToken),
      spotifyGet(`/artists/${req.params.id}/albums?include_groups=album,single&market=DE&limit=50`, accessToken),
      spotifyGet(`/artists/${req.params.id}/related-artists`, accessToken)
    ]);

    res.json({
      ...artist,
      albums: albums.items || [],
      relatedArtists: (relatedArtists.artists || []).slice(0, 10)
    });
  } catch (e) {
    res.status(500).json({ error: "artist_detail_failed", details: String(e?.message || e) });
  }
});

// US-08: Gespeicherte Tracks importieren
app.get("/spotify/saved-tracks", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet("/me/tracks?limit=50", accessToken);
    res.json(data.items || []);
  } catch (e) {
    res.status(500).json({ error: "saved_tracks_failed", details: String(e?.message || e) });
  }
});

// US-08: Gefolgte Künstler importieren
app.get("/spotify/followed-artists", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet("/me/following?type=artist&limit=50", accessToken);
    res.json(data.artists?.items || []);
  } catch (e) {
    res.status(500).json({ error: "followed_artists_failed", details: String(e?.message || e) });
  }
});

// US-08: Playlists importieren
app.get("/spotify/playlists", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet("/me/playlists?limit=50", accessToken);
    res.json(data.items || []);
  } catch (e) {
    res.status(500).json({ error: "playlists_failed", details: String(e?.message || e) });
  }
});

// ══════════════════════════════════════
// ── GENRE-ANALYSE ROUTES (US-14 bis US-18) ──
// ══════════════════════════════════════

// US-14, US-15, US-16, US-17: Song analysieren
app.get("/analyze/track/:id", async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });

    const [track, audioFeatures] = await Promise.all([
      spotifyGet(`/tracks/${req.params.id}`, accessToken),
      spotifyGet(`/audio-features/${req.params.id}`, accessToken)
    ]);

    // Künstler-Genres holen
    const artistId = track.artists?.[0]?.id;
    let artistGenres = [];
    if (artistId) {
      const artist = await spotifyGet(`/artists/${artistId}`, accessToken);
      artistGenres = artist.genres || [];
    }

    const genreAnalysis = analyzeGenres(audioFeatures, artistGenres);
    const drumkits = suggestDrumkits(audioFeatures, genreAnalysis);
    const plugins = suggestPlugins(genreAnalysis);

    const result = {
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: {
          id: track.album.id,
          name: track.album.name,
          image: track.album.images?.[0]?.url || null,
          releaseDate: track.album.release_date
        },
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls?.spotify
      },
      audioFeatures: {
        bpm: Math.round(audioFeatures.tempo),
        energy: audioFeatures.energy,
        danceability: audioFeatures.danceability,
        valence: audioFeatures.valence,
        instrumentalness: audioFeatures.instrumentalness,
        acousticness: audioFeatures.acousticness,
        liveness: audioFeatures.liveness,
        speechiness: audioFeatures.speechiness,
        loudness: audioFeatures.loudness,
        key: getKeyString(audioFeatures.key, audioFeatures.mode),
        timeSignature: audioFeatures.time_signature
      },
      genres: genreAnalysis,
      drumkits,
      plugins,
      artistGenres
    };

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "analysis_failed", details: String(e?.message || e) });
  }
});

// US-18: Zwei Songs vergleichen
app.get("/analyze/compare", async (req, res) => {
  try {
    const { track1, track2 } = req.query;
    if (!track1 || !track2) return res.status(400).json({ error: "Zwei Track-IDs erforderlich (?track1=...&track2=...)" });

    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });

    const [t1, t2, af1, af2] = await Promise.all([
      spotifyGet(`/tracks/${track1}`, accessToken),
      spotifyGet(`/tracks/${track2}`, accessToken),
      spotifyGet(`/audio-features/${track1}`, accessToken),
      spotifyGet(`/audio-features/${track2}`, accessToken)
    ]);

    // Genres für beide
    const getGenres = async (track) => {
      const artistId = track.artists?.[0]?.id;
      if (!artistId) return [];
      const artist = await spotifyGet(`/artists/${artistId}`, accessToken);
      return artist.genres || [];
    };

    const [g1, g2] = await Promise.all([getGenres(t1), getGenres(t2)]);
    const genres1 = analyzeGenres(af1, g1);
    const genres2 = analyzeGenres(af2, g2);

    res.json({
      track1: {
        id: t1.id, name: t1.name,
        artists: t1.artists.map(a => a.name).join(", "),
        image: t1.album.images?.[0]?.url,
        audioFeatures: {
          bpm: Math.round(af1.tempo), energy: af1.energy, danceability: af1.danceability,
          valence: af1.valence, instrumentalness: af1.instrumentalness, acousticness: af1.acousticness,
          liveness: af1.liveness, speechiness: af1.speechiness,
          key: getKeyString(af1.key, af1.mode)
        },
        genres: genres1,
        drumkits: suggestDrumkits(af1, genres1),
        plugins: suggestPlugins(genres1)
      },
      track2: {
        id: t2.id, name: t2.name,
        artists: t2.artists.map(a => a.name).join(", "),
        image: t2.album.images?.[0]?.url,
        audioFeatures: {
          bpm: Math.round(af2.tempo), energy: af2.energy, danceability: af2.danceability,
          valence: af2.valence, instrumentalness: af2.instrumentalness, acousticness: af2.acousticness,
          liveness: af2.liveness, speechiness: af2.speechiness,
          key: getKeyString(af2.key, af2.mode)
        },
        genres: genres2,
        drumkits: suggestDrumkits(af2, genres2),
        plugins: suggestPlugins(genres2)
      }
    });
  } catch (e) {
    res.status(500).json({ error: "compare_failed", details: String(e?.message || e) });
  }
});

// ── Track-Suche für Analyse ──
app.get("/spotify/search-tracks", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "missing_query" });
    const accessToken = await getSpotifyAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: "not_logged_in" });
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=track&limit=10`, accessToken);
    res.json(data.tracks.items);
  } catch (e) {
    res.status(500).json({ error: "search_tracks_failed", details: String(e?.message || e) });
  }
});

// ══════════════════════════════════════
// ── Start ──
// ══════════════════════════════════════
app.listen(PORT, () => {
  console.log(`Artist Platform API listening on ${PORT}`);
  console.log(`FRONTEND_URL=${FRONTEND_URL}`);
  console.log(`BACKEND_URL=${BACKEND_URL}`);
  console.log(`Redirect URI: ${BACKEND_URL}/spotify/callback`);
});
