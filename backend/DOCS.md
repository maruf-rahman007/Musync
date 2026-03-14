### Complete API Specification
Authentication Endpoints
| Endpoint             | Method | Description             | Request                                 | Response                       |
| -------------------- | ------ | ----------------------- | --------------------------------------- | ------------------------------ |
| `GET /auth/login`    | GET    | Initiates Spotify OAuth | Query: `?extension_id=xyz`              | `302 Redirect` to Spotify auth |
| `GET /auth/callback` | GET    | OAuth callback handler  | Query: `?code=xxx&state=yyy`            | `200 OK` + HTML (auto-close)   |
| `POST /auth/refresh` | POST   | Refresh access token    | Body: `{ refresh_token }`               | `{ access_token, expires_in }` |
| `GET /auth/session`  | GET    | Validate session        | Header: `Authorization: Bearer {token}` | `{ valid: boolean, user }`     |
User & Playlist Endpoints
| Endpoint                    | Method | Description              | Auth         | Response          |
| --------------------------- | ------ | ------------------------ | ------------ | ----------------- |
| `GET /user/profile`         | GET    | Get current user profile | Bearer Token | `UserProfile`     |
| `GET /user/playlists`       | GET    | List user's playlists    | Bearer Token | `Playlist[]`      |
| `GET /playlists/:id`        | GET    | Get playlist details     | Bearer Token | `PlaylistDetail`  |
| `GET /playlists/:id/tracks` | GET    | Get tracks in playlist   | Bearer Token | `PlaylistTrack[]` |
Track Management Endpoints
| Endpoint                       | Method | Description                | Auth         | Response       |
| ------------------------------ | ------ | -------------------------- | ------------ | -------------- |
| `GET /tracks/search`           | GET    | Search Spotify for track   | Bearer Token | `SearchResult` |
| `POST /playlists/:id/tracks`   | POST   | Add track to playlist      | Bearer Token | `AddResult`    |
| `DELETE /playlists/:id/tracks` | DELETE | Remove track from playlist | Bearer Token | `DeleteResult` |

### Data Flow Diagrams
Flow 1: Initial Authentication
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Extension│────▶│ Backend API │────▶│ Spotify Auth │     │             │
│         │     │ /auth/login │     │   Server     │     │             │
│         │◄────│             │◄────│              │     │             │
│         │     │ 302 Redirect│     │              │     │             │
└─────────┘     └─────────────┘     └──────────────┘     │             │
     │                                                    │   Spotify   │
     │ User approves in browser                           │   Accounts  │
     │                                                    │             │
     ▼                                                    │             │
┌─────────┐     ┌─────────────┐     ┌──────────────┐     │             │
│  Popup  │────▶│ /auth/callback│───▶│  Token       │────▶│             │
│  Window │     │             │     │  Exchange    │     │             │
│         │◄────│ HTML+Script │◄────│              │◄────│             │
│         │     │ (auto-close)│     │              │     │             │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
     │
     │ postMessage({ type: 'AUTH_SUCCESS', token })
     ▼
┌─────────┐
│ Service │
│ Worker  │ ──▶ Store tokens in chrome.storage.local
│         │
└─────────┘
Flow 2: Detect & Add Song
┌─────────────┐
│ User watches │
│ YouTube video│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│ Content     │────▶│ 1. Parse DOM: document.title            │
│ Script      │     │ 2. Extract: "Artist - Song Title"       │
│ (youtube.js)│     │ 3. Clean: Remove "Official", "HD", etc. │
└──────┬──────┘     └─────────────────────────────────────────┘
       │
       │ message: { type: 'VIDEO_DETECTED', artist, title, videoId }
       ▼
┌─────────────┐
│ Service     │
│ Worker      │
│ (background)│
└──────┬──────┘
       │
       ├──▶ Check if user is authenticated (chrome.storage.local)
       │
       ├──▶ [If not] Show login prompt in content script
       │
       └──▶ [If yes] Fetch /user/playlists
              │
              ▼
       ┌─────────────┐
       │ Inject popup│────▶ Floating UI on YouTube page
       │ UI into DOM │        "Add to Spotify Playlist?"
       └──────┬──────┘
              │
              │ User selects playlist
              ▼
       POST /playlists/{id}/tracks
       Body: { uris: [searched_track_uri] }
              │
              ▼
       ┌─────────────┐
       │ Show success│────▶ Toast notification + Update local stats
       │ notification│        (for recommendation engine)
       └─────────────┘
Flow 3: Smart Recommendation
┌─────────────┐
│ Extension   │
│ initialized │
│ on YouTube  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────────────────────────────┐
│ Service     │────▶│ 1. Get recent_additions from storage │
│ Worker      │     │ 2. Find most frequent playlist ID    │
│             │     │ 3. Fetch /playlists/{id}/tracks      │
└──────┬──────┘     │ 4. Filter: Not recently suggested    │
       │            │ 5. Score: Based on add frequency     │
       │            └─────────────────────────────────────┘
       │
       │ message: { type: 'SHOW_RECOMMENDATION', track, playlist }
       ▼
┌─────────────┐
│ Content     │────▶ Inject suggestion card (YouTube-style info card)
│ Script      │        "From your playlist 'Bangla Music'"
│             │        Shows: Album art, Track name, Artist
└──────┬──────┘
       │
       │ User clicks
       ▼
┌─────────────┐
│ Open new tab│────▶ https://youtube.com/results?search_query=Artist+Title
│ or redirect │     (No YouTube API needed - just URL construction)
└─────────────┘
