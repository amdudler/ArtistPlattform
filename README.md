# Artist Platform

Webanwendung zur Analyse, Visualisierung und Erkundung von Musikern, Alben, Songs und deren musikalischen Merkmalen. Nutzer können sich registrieren, ihren Spotify-Account verknüpfen und tiefe Einblicke in Genres, Subgenres, Drumkits und Plugins erhalten.

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19, React Router 6, Recharts, React Icons |
| Backend | Node.js, Express 4, JWT, bcryptjs |
| Datenbank | PostgreSQL 13 (via Directus), Redis 6 (Cache) |
| Auth | JWT + bcrypt (E-Mail/Passwort), Spotify OAuth 2.0 |
| CMS | Directus 11 |
| Containerisierung | Docker, Docker Compose |
| Design | Dark-Mode-First, Inter Font, Sternenachtblau / Perleffekt-Lila |

## Projektstruktur

```
ArtistPlattform/
├── README.md
├── .gitignore
├── backend/
│   ├── .env                        # Spotify-Credentials (nicht im Repo)
│   ├── docker-compose.yml          # PostgreSQL, Redis, Directus, API, Frontend
│   ├── fetch-artists.js            # Script: Artist-Daten von Spotify holen → artists.json
│   ├── package.json
│   └── spotify-auth/
│       ├── .env / .env.example     # Umgebungsvariablen
│       ├── Dockerfile
│       ├── package.json
│       └── server.js               # Haupt-API: Auth, Spotify, Analyse, Drumkits, Plugins
└── frontend/
    ├── .dockerignore
    ├── Dockerfile
    ├── package.json
    ├── public/index.html
    └── src/
        ├── index.js                # Router-Setup
        ├── index.css               # Design-System (CSS Variables)
        ├── App.js                  # Layout mit Sidebar-Navigation + Routing
        ├── App.css                 # Alle UI-Komponenten
        ├── api.js                  # API-Client mit Token-Management
        ├── SpotifyCallback.js      # OAuth-Callback-Seite
        ├── artists.json            # Statische Beispiel-Künstler
        └── pages/
            ├── Dashboard.js        # Startseite mit Stats + gespeicherten Songs/Künstlern
            ├── Search.js           # Künstlersuche
            ├── ArtistDetail.js     # Künstler-Detailseite (Alben, Singles, Labels, Ähnliche)
            ├── Analyze.js          # Song-Analyse (Genre, Audio-Features, Drumkits, Plugins)
            ├── Compare.js          # Zwei-Song-Vergleich mit Radar-Charts
            ├── AuthPage.js         # Login / Registrierung
            └── Profile.js          # Profilverwaltung, Passwort ändern, Account löschen
```

## Installation & Start

### Voraussetzungen
- Node.js 20+
- Docker & Docker Compose (optional, für Vollbetrieb)
- Spotify Developer Account mit App-Credentials

### Umgebungsvariablen

Erstelle `backend/.env` (oder kopiere `backend/spotify-auth/.env.example`):

```env
SPOTIFY_CLIENT_ID=deine_client_id
SPOTIFY_CLIENT_SECRET=dein_client_secret
```

### Lokaler Start (ohne Docker)

```bash
# Terminal 1: Backend
cd backend/spotify-auth
npm install
npm start
# → API läuft auf http://127.0.0.1:5050

# Terminal 2: Frontend
cd frontend
npm install
npm start
# → App läuft auf http://127.0.0.1:3000
```

### Start mit Docker Compose

```bash
cd backend
docker compose up --build
# → Frontend: http://127.0.0.1:3000
# → API: http://127.0.0.1:5050
# → Directus: http://127.0.0.1:8055 (admin@artistplattform.local / Admin1234!)
```

## Implementierte Features

### Epic 1 — Auth & Account
| User Story | Beschreibung | Status |
|---|---|---|
| US-01 | Registrierung mit E-Mail + Passwort | Fertig |
| US-02 | Login / Logout mit JWT | Fertig |
| US-03 | Passwort ändern (eingeloggt) | Fertig |
| US-04 | Profil bearbeiten (Name, Bio) | Fertig |
| US-05 | Account löschen mit Passwort-Bestätigung | Fertig |

### Epic 2 — Spotify-Integration
| User Story | Beschreibung | Status |
|---|---|---|
| US-06 | Spotify-Account verknüpfen (OAuth 2.0) mit Bestätigungsdialog und Account-Auswahl | Fertig |
| US-07 | Spotify-Verknüpfung trennen (im Profil) | Fertig |
| US-08 | Gespeicherte Tracks, gefolgte Künstler, Playlists importieren | Fertig |
| US-09 | Automatisches Token-Refresh (httpOnly Cookie) | Fertig |

### Epic 3 — Künstler & Alben
| User Story | Beschreibung | Status |
|---|---|---|
| US-10 | Künstler per Name suchen | Fertig |
| US-11 | Alben und Singles mit Release-Daten anzeigen | Fertig |
| US-12 | Label-Informationen aus Alben ableiten | Fertig |
| US-13 | Ähnliche Künstler anzeigen (Related Artists) | Fertig |

### Epic 4 — Genre-Analyse
| User Story | Beschreibung | Status |
|---|---|---|
| US-14 | Einzelnen Song analysieren (Genre + Subgenre) | Fertig |
| US-15 | Prozentuale Genre-Aufschlüsselung (Balkendiagramm) | Fertig |
| US-16 | Microgenres erkennen (Hoodtrap, Jerk, Phonk, etc.) | Fertig |
| US-17 | Audio-Features anzeigen (BPM, Energie, Tonart, Radar-Chart) | Fertig |
| US-18 | Zwei Songs vergleichen (Radar-Overlay, BPM, Genres) | Fertig |

### Epic 5 — Drumkit & Plugin-Erkennung
| User Story | Beschreibung | Status |
|---|---|---|
| US-19 | Drumkit-Vorschläge pro Song (pattern-basiert) | Fertig |
| US-20 | Plugin-Vorschläge passend zum Sound | Fertig |
| US-21 | Equipment eines Produzenten einsehen | Teilweise (über Song-Analyse) |
| US-22 | Ähnliche Produzenten entdecken | Teilweise (über Related Artists) |

### Epic 6 — Visualisierung & Dashboard
| User Story | Beschreibung | Status |
|---|---|---|
| US-23 | Dashboard mit gespeicherten Songs und Top-Künstlern | Fertig |
| US-24 | Genre-Entwicklung eines Künstlers über Zeit | Offen |
| US-25 | Heatmap der meistgenutzten Drumkits pro Genre | Offen |
| US-26 | Einheitliches Design (Sternenachtblau/Lila) | Fertig |

## Was noch fehlt / verbessert werden kann

### Fehlend
- **Passwort-Reset per E-Mail** (US-03 erweitert): Aktuell kann man das Passwort nur ändern wenn man eingeloggt ist. "Passwort vergessen" per E-Mail erfordert einen Mail-Service (z.B. Nodemailer + SMTP).
- **Label-Netzwerk-Graph** (US-13 erweitert): Labels und Related Artists sind vorhanden, aber ein visueller Netzwerk-Graph (z.B. mit D3.js oder react-force-graph) fehlt noch.
- **Genre-Entwicklung über Zeit** (US-24): Benötigt historische Daten pro Künstler, die über mehrere Alben/Releases gesammelt und zeitlich dargestellt werden.
- **Drumkit-Heatmap pro Genre** (US-25): Die Daten sind im Backend vorhanden, aber die Heatmap-Visualisierung im Frontend fehlt noch.
- **Produzenten-Profilseite** (US-21, US-22): Dedizierte Seite die alle Songs eines Produzenten zeigt mit aggregierten Equipment-Vorschlägen und ähnlichen Produzenten.
- **Avatar-Upload**: Profil-Avatar kann aktuell nur als URL gesetzt werden, kein Datei-Upload.

### Verbesserungspotenzial
- **Datenbank-Migration**: Auth nutzt aktuell eine `db.json`-Datei. Sollte auf PostgreSQL/Directus migriert werden für Persistenz und Skalierbarkeit.
- **Genre-Analyse mit ML**: Aktuell rule-basiert (BPM + Energie + Spotify-Genres). Könnte durch Essentia (Open-Source Audio ML) oder eigene Klassifikationsmodelle verbessert werden.
- **Drumkit/Plugin-Erkennung mit Audio-Analyse**: Aktuell pattern-basiert auf Audio-Features. Echte Audio-Analyse (Frequenzspektrum, Transient-Detection) würde die Genauigkeit stark verbessern.
- **Offline-Caching**: Analyseergebnisse werden nicht gespeichert — jede Analyse macht neue Spotify-API-Calls.
- **Responsive Design**: Grundlegendes Mobile-Layout vorhanden (Sidebar wird Overlay), aber einige Seiten könnten für kleine Screens optimiert werden.
- **Tests**: Keine Unit- oder Integration-Tests vorhanden.
- **Rate-Limiting**: Backend hat kein Rate-Limiting — wichtig für Produktionsbetrieb.
- **HTTPS**: Docker-Setup läuft auf HTTP — für Produktion muss ein Reverse-Proxy mit SSL eingerichtet werden.

## Sicherheitshinweise
- CORS erlaubt sowohl `http://127.0.0.1:3000` als auch `http://localhost:3000` als Origins
- Spotify-Verknüpfung erfordert einen eingeloggten Account (kein anonymes Verknüpfen möglich)
- Spotify OAuth nutzt `show_dialog=true` — Nutzer kann bei jedem Verbinden den Account wählen

## API-Endpoints

### Auth
| Method | Route | Beschreibung |
|---|---|---|
| POST | `/auth/register` | Neuen Account erstellen |
| POST | `/auth/login` | Einloggen (gibt JWT zurück) |
| POST | `/auth/refresh` | JWT erneuern |
| GET | `/auth/me` | Eigenes Profil abrufen |
| PUT | `/auth/me` | Profil bearbeiten |
| POST | `/auth/change-password` | Passwort ändern |
| DELETE | `/auth/me` | Account löschen |

### Spotify
| Method | Route | Beschreibung |
|---|---|---|
| GET | `/spotify/login` | OAuth-Login starten |
| GET | `/spotify/callback` | OAuth-Callback |
| GET | `/spotify/token` | Access-Token erneuern |
| POST | `/spotify/logout` | Spotify-Session beenden |
| POST | `/spotify/disconnect` | Spotify-Verknüpfung trennen |
| GET | `/spotify/me` | Spotify-Profil |
| GET | `/spotify/search?q=` | Künstler suchen |
| GET | `/spotify/search-tracks?q=` | Songs suchen |
| GET | `/spotify/artist/:id` | Künstler-Detail (Alben, Related) |
| GET | `/spotify/artist/:id/top-tracks` | Top Tracks |
| GET | `/spotify/saved-tracks` | Gespeicherte Tracks |
| GET | `/spotify/followed-artists` | Gefolgte Künstler |
| GET | `/spotify/playlists` | Playlists |

### Analyse
| Method | Route | Beschreibung |
|---|---|---|
| GET | `/analyze/track/:id` | Song analysieren (Genre, Features, Drumkits, Plugins) |
| GET | `/analyze/compare?track1=&track2=` | Zwei Songs vergleichen |

## Notion-Protokoll

[Notion Scrumboard](https://ambitious-nymphea-ede.notion.site/314791778aa9800480d8fc3c0c6c42b4?v=314791778aa980b49ec1000c93f43d19)

## Changelog

- **18.02.2026**: README erstellt und Notion-Link eingefügt
- **26.03.2026**: Spotify API funktioniert, ClientID/ClientSecret konfiguriert, Server-Start mit 2 Terminals dokumentiert
- **07.04.2026**: Vollständiger Ausbau der Plattform:
  - Auth-System mit JWT (Register, Login, Profil, Passwort ändern, Account löschen)
  - Design-Overhaul: Sternenachtblau / Perleffekt-Lila Farbschema, Inter Font, Dark-Mode
  - Sidebar-Navigation mit allen Seiten
  - Erweiterte Spotify-Integration (Saved Tracks, Followed Artists, Playlists)
  - Künstler-Detailseite mit Alben, Singles, Labels, ähnliche Künstler
  - Genre- & Subgenre-Analyse-Engine (50+ Regeln, prozentuale Verteilung, Radar-/Balkendiagramme)
  - Drumkit-Erkennung (18 Kits, pattern-basiert)
  - Plugin-Erkennung (20 Plugins, genre-basiert)
  - Song-Vergleichsmodus mit überlagerten Radar-Charts
  - Dashboard mit Stats und importierten Spotify-Daten
  - Bugfixes: .env.example, doppeltes dotenv, tote Dateien entfernt, Root .gitignore
- **08.04.2026**: UX-Verbesserungen und Bugfixes:
  - User-Story-Codes (US-XX) aus sichtbaren UI-Texten entfernt
  - Spotify-Verbindung: Bestätigungsdialog vor OAuth-Weiterleitung hinzugefügt
  - Spotify-Verbindung: `show_dialog=true` — Nutzer kann Account wählen statt Auto-Connect
  - Spotify trennen: Button im Profil hinzugefügt (US-07 Frontend)
  - Spotify-Verknüpfung nur für eingeloggte Nutzer möglich (Account-Pflicht)
  - Dashboard zeigt "Jetzt registrieren" wenn nicht eingeloggt statt Spotify-Button
  - CORS-Fix: `localhost:3000` und `127.0.0.1:3000` beide als Origins erlaubt
