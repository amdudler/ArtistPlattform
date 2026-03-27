require("dotenv").config({ path: "./spotify-auth/.env" });
const fetch = require("node-fetch");
const fs = require("fs");

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  return data.access_token;
}

async function getArtistData(token, artistId) {
  // Artist Info
  const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const artist = await artistRes.json();

  // Alben holen
  const albumsRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&market=DE&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const albumsData = await albumsRes.json();
  const albums = albumsData.items || [];

  // Nach Datum sortieren
  albums.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

  const firstAlbum = albums[0] || null;
  const lastAlbum = albums[albums.length - 1] || null;

  return {
    spotify_id: artistId,
    name: artist.name,
    genres: artist.genres,
    followers: artist.followers?.total || 0,
    popularity: artist.popularity,
    profile_image: artist.images?.[0]?.url || null,
    spotify_url: artist.external_urls?.spotify || null,
    verified: artist.followers?.total > 10000,
    first_album: firstAlbum ? {
      name: firstAlbum.name,
      year: firstAlbum.release_date?.split("-")[0]
    } : null,
    latest_album: lastAlbum ? {
      name: lastAlbum.name,
      year: lastAlbum.release_date?.split("-")[0]
    } : null,
    total_albums: albums.length,
    // Manuell ausfüllen
    active: true,
    country: "",
    biography: "",
    label: "",
    is_solo: true
  };
}

async function main() {
  console.log("Token holen...");
  const token = await getToken();

  const raw = fs.readFileSync("../frontend/src/artists.json", "utf-8");
  const json = JSON.parse(raw);
  const artists = json.artists;

  console.log(`${artists.length} Künstler werden verarbeitet...`);

  const updated = [];
  for (const artist of artists) {
    console.log(`Hole Daten für: ${artist.name}`);
    try {
      const data = await getArtistData(token, artist.spotify_id);
      // Manuelle Felder behalten falls schon vorhanden
      updated.push({
        ...data,
        active: artist.active ?? true,
        country: artist.country || "",
        biography: artist.biography || "",
        label: artist.label || "",
        is_solo: artist.is_solo ?? true
      });
    } catch (e) {
      console.error(`Fehler bei ${artist.name}:`, e.message);
      updated.push(artist);
    }
  }

  fs.writeFileSync(
    "../frontend/src/artists.json",
    JSON.stringify({ artists: updated }, null, 2)
  );
  console.log("✅ artists.json erfolgreich aktualisiert!");
}

main();