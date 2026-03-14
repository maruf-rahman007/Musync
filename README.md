# Musync
A Chrome/Browser extension that integrates YouTube listening with Spotify playlist management and smart music suggestions

### Project Overview:
    The extension will run in the user's browser and detect when the user is watching or listening to music videos on YouTube. When a music video is detected, the extension should show a small popup asking the user if they want to add the currently playing song to one of their Spotify playlists.
    If the user chooses a playlist, the extension will search the song on Spotify and add it to the selected playlist using the Spotify Web API.
    Later, the extension will also suggest songs from the user's Spotify playlists while they are watching YouTube. For example, if a user frequently adds Bangla songs to a playlist called "Bangla Music", the extension can suggest another song from that playlist as the next video to play on YouTube.

## System Architecture
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BROWSER EXTENSION (Manifest V3)                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Content Script│  │  Popup UI    │  │ Service Worker│              │   │
│  │  │ (YouTube DOM)│  │ (Playlist UI)│  │ (Background) │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ • DOM Parsing│  │ • Playlist   │  │ • API Calls  │              │   │
│  │  │ • Title Clean│  │   Selection  │  │ • Auth State │              │   │
│  │  │ • Inject UI  │  │ • Suggestions│  │ • Messaging  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                    ┌─────────────────────────┐                              │
│                    │   Node.js + Express     │                              │
│                    │      (TypeScript)       │                              │
│                    │                         │                              │
│                    │  ┌─────────────────┐   │                              │
│                    │  │  Auth Router    │   │  /auth/*                     │
│                    │  │  Spotify OAuth  │   │                              │
│                    │  └─────────────────┘   │                              │
│                    │  ┌─────────────────┐   │                              │
│                    │  │  User Router    │   │  /user/*                     │
│                    │  │  Playlists, etc │   │                              │
│                    │  └─────────────────┘   │                              │
│                    │  ┌─────────────────┐   │                              │
│                    │  │  Tracks Router  │   │  /tracks/*                   │
│                    │  │  Search, Add    │   │                              │
│                    │  └─────────────────┘   │                              │
│                    └─────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ OAuth 2.0 + REST
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │    Spotify Web API      │    │           YouTube (DOM scraping)        │ │
│  │  • OAuth 2.0 PKCE       │    │  • No API needed (content script)       │ │
│  │  • Playlist management  │    │  • Video title extraction               │ │
│  │  • Search               │    │  • Search URL generation                │ │
│  │  • User profile         │    │                                         │ │
│  └─────────────────────────┘    └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

```