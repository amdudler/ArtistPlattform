# Projektname: Musiker-IDs Analyse

## Projektziel
Das Ziel dieses Projekts ist es, Musiker:innen, ihre Alben, Labels und weitere Metadaten zu sammeln, zu analysieren und zu visualisieren.  
Wir wollen z. B. Spotify- oder Discography-Daten nutzen, um Beziehungen zwischen Künstler:innen, Labels und Releases darzustellen.

## Projektbeschreibung
Dieses Projekt soll eine Übersicht über verschiedene Musiker:innen bieten.
Noch weitere Künstler werden in Zukunft folgen.

Geplant ist:
- Sammlung von Künstler:innen-IDs (z. B. Spotify oder andere APIs)
- Zuordnung von Alben und Release-Daten
- Speicherung der Daten in einer strukturierten Form (JSON, CSV, Datenbank)
- Visualisierung von Beziehungen, Veröffentlichungen oder Labels

## Notion-Protokoll
Hier ist unser aktuelles Notion-Protokoll: [Notion-Link](https://ambitious-nymphea-ede.notion.site/314791778aa9800480d8fc3c0c6c42b4?v=314791778aa980b49ec1000c93f43d19)

## Geplante Features / To-Do
- [ ] Alle Künstler:innen mit Spotify-IDs erfassen
- [ ] Alben und Release-Daten sammeln
- [ ] Label-Informationen zuordnen
- [ ] Übersicht in Tabellen / Diagrammen erstellen
- [ ] README und Protokoll regelmäßig aktualisieren

## Changelog
- 18.02.2026: README erstellt und Notion-Link eingefügt

## Changelog
- 26.03.2026: API funktioniert, Fehler wurden behoben. ClientID, ClientSecret und Backlog für unsere Website und zu unserer Spotify App (Spotify for Developer) funktionieren können kommunizieren. Um den Server richtig zu starten, muss man 2 Terminals offen haben. Ein Terminal muss unter '\frontend' mit 'npm start' und das andere Terminal unter '\backend\spotify-auth' mit 'npm start' bedient werden.


# ArtistPlattform 🎨

## 📌 Projektbeschreibung

Dieses Projekt ist eine Plattform für Künstler.
Das Backend basiert auf Directus.

---

## ⚙️ Setup (Directus)

### 1. Repository klonen

```bash
git clone https://github.com/amdudler/ArtistPlattform.git
cd ArtistPlattform/directus
```

---

### 2. Dependencies installieren

```bash
npm install
```

---

### 3. .env Datei erstellen

Erstelle eine `.env` Datei im `directus` Ordner.

Beispiel:

```env
KEY=your-secret-key
SECRET=your-secret

DB_CLIENT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=directus
DB_USER=user
DB_PASSWORD=password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin
```

---

### 4. Directus starten

```bash
npx directus start
```

---

## 🐳 Optional: Docker starten

Falls Docker verwendet wird:

```bash
docker compose up
```

---

## 👥 Team Hinweis

* `.env` Dateien werden **nicht** ins Repository hochgeladen
* Jeder Entwickler verwendet eigene Zugangsdaten
* Bei Fragen einfach im Team nachfragen

---

## 🚀 Technologien

* Directus
* Node.js
* (optional: Docker)
