const BACKEND = process.env.REACT_APP_SPOTIFY_BACKEND_URL || "http://127.0.0.1:5050";

// ── Auth Token Management ──
let accessToken = localStorage.getItem("authToken");
let refreshToken = localStorage.getItem("authRefreshToken");

export function setAuthTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem("authToken", access);
  else localStorage.removeItem("authToken");
  if (refresh) localStorage.setItem("authRefreshToken", refresh);
  else localStorage.removeItem("authRefreshToken");
}

export function getAuthToken() {
  return accessToken;
}

export function clearAuth() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("authRefreshToken");
  localStorage.removeItem("authUser");
  localStorage.removeItem("spotifyUser");
}

async function refreshAuthToken() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BACKEND}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAuthTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── API Fetch mit Auth ──
export async function apiFetch(path, options = {}) {
  const url = `${BACKEND}${path}`;
  const headers = { ...options.headers };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });

  // Token abgelaufen → refresh versuchen
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      return fetch(url, { ...options, headers, credentials: "include" });
    }
  }

  return res;
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Auth API ──
export async function register(email, password, displayName) {
  const res = await fetch(`${BACKEND}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  setAuthTokens(data.accessToken, data.refreshToken);
  localStorage.setItem("authUser", JSON.stringify(data.user));
  return data.user;
}

export async function login(email, password) {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  setAuthTokens(data.accessToken, data.refreshToken);
  localStorage.setItem("authUser", JSON.stringify(data.user));
  return data.user;
}

export async function getMe() {
  return apiJson("/auth/me");
}

export async function updateProfile(updates) {
  return apiJson("/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
}

export async function changePassword(currentPassword, newPassword) {
  return apiJson("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export async function deleteAccount(password) {
  return apiJson("/auth/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
}

// ── Spotify API ──
export function spotifyLoginUrl() {
  return `${BACKEND}/spotify/login`;
}

export async function spotifyLogout() {
  await apiFetch("/spotify/logout", { method: "POST" });
  localStorage.removeItem("spotifyUser");
}

export async function searchArtists(q) {
  return apiJson(`/spotify/search?q=${encodeURIComponent(q)}`);
}

export async function searchTracks(q) {
  return apiJson(`/spotify/search-tracks?q=${encodeURIComponent(q)}`);
}

export async function getArtistDetail(id) {
  return apiJson(`/spotify/artist/${id}`);
}

export async function getArtistTopTracks(id) {
  return apiJson(`/spotify/artist/${id}/top-tracks`);
}

export async function getSavedTracks() {
  return apiJson("/spotify/saved-tracks");
}

export async function getFollowedArtists() {
  return apiJson("/spotify/followed-artists");
}

export async function getPlaylists() {
  return apiJson("/spotify/playlists");
}

// ── Analyse API ──
export async function analyzeTrack(trackId) {
  return apiJson(`/analyze/track/${trackId}`);
}

export async function compareTracks(trackId1, trackId2) {
  return apiJson(`/analyze/compare?track1=${trackId1}&track2=${trackId2}`);
}

// ── Helpers ──
export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function formatDuration(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export { BACKEND };
