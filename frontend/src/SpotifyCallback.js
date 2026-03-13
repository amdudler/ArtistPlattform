import React, { useEffect, useState } from "react";

export default function SpotifyCallback() {
  const [status, setStatus] = useState("Finishing Spotify login...");
  const [me, setMe] = useState(null);

  const backendUrl = process.env.REACT_APP_SPOTIFY_BACKEND_URL || "http://localhost:5050";

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    const success = url.searchParams.get("success");

    if (error) {
      setStatus(`Spotify login failed: ${error}`);
      return;
    }
    if (!success) {
      setStatus("Missing success flag.");
      return;
    }

    (async () => {
      try {
        // Ensure the refresh-token cookie works by calling token endpoint with credentials.
        const tokenRes = await fetch(`${backendUrl}/spotify/token`, {
          credentials: "include"
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.json().catch(() => ({}));
          throw new Error(body?.error || "token_error");
        }

        const token = await tokenRes.json();

        const meRes = await fetch(`${backendUrl}/spotify/me`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
          credentials: "include"
        });
        if (!meRes.ok) {
          const body = await meRes.json().catch(() => ({}));
          throw new Error(body?.error || "me_error");
        }
        const meJson = await meRes.json();
        setMe(meJson);
        setStatus("Logged in with Spotify.");
      } catch (e) {
        setStatus(`Login completed, but fetching profile failed: ${String(e?.message || e)}`);
      }
    })();
  }, [backendUrl]);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Spotify Callback</h1>
      <p>{status}</p>
      {me ? (
        <pre style={{ background: "#111", color: "#eee", padding: 16, borderRadius: 8, overflow: "auto" }}>
          {JSON.stringify(me, null, 2)}
        </pre>
      ) : null}
      <a href="/">Back</a>
    </div>
  );
}

