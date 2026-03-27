const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require('dotenv').config();

const PORT = Number(process.env.PORT || 5050);
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_SCOPES =
  process.env.SPOTIFY_SCOPES ||
  [
    "user-read-email",
    "user-read-private",
    "user-top-read"
  ].join(" ");

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  // Don't crash hard in dev containers; return clear runtime errors instead.
  console.warn("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in env.");
}

function assertSpotifyClientConfigured() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return "missing";
  const bad =
    SPOTIFY_CLIENT_ID.includes("DEINE_CLIENT_ID") ||
    SPOTIFY_CLIENT_SECRET.includes("DEIN_CLIENT_SECRET") ||
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

async function spotifyGet(path, accessToken) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`Spotify API failed: ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/spotify/login", (req, res) => {
  const cfg = assertSpotifyClientConfigured();
  if (cfg) {
    return res.status(500).json({
      error: "spotify_client_not_configured",
      hint:
        cfg === "missing"
          ? "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in backend/.env and restart docker compose."
          : "backend/.env still contains placeholder values. Paste real Client ID/Secret from Spotify Developer Dashboard."
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

app.listen(PORT, () => {
  console.log(`spotify-auth listening on ${PORT}`);
  console.log(`FRONTEND_URL=${FRONTEND_URL}`);
  console.log(`BACKEND_URL=${BACKEND_URL}`);
  console.log(`Redirect URI: ${BACKEND_URL}/spotify/callback`);
});

