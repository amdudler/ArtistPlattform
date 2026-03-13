import React from "react";
import artists from "./artists.json";

function App() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Artist Test Page</h1>

      <ul>
        {artists.artists.map((artist) => (
          <li key={artist.spotify_id}>
            {artist.name}
          </li>
        ))}
      </ul>

    </div>
  );
}

export default App;