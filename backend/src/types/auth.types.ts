

// Spotify token response types
export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: { total: number };
  [key: string]: any;
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
}

export interface SpotifySearchResponse {
  tracks: { items: SpotifyTrack[] };
}

export interface SpotifyUserProfile {
  display_name: string;
  email: string;
  id: string;
  product: string;
  images: {
    url: string;
    height: number | null;
    width: number | null;
  }[];
}
