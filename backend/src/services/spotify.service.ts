import axios from 'axios';
import TokenStore from '../storage/token.store';
import { SpotifyPlaylistsResponse, SpotifySearchResponse, SpotifyTokenResponse } from '../types/auth.types';


const getConfig = () => ({
  clientId: process.env.SPOTIFY_CLIENT_ID!,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
});
// Basic Auth header for Spotify API requests
const getAuthHeader = () => {
    const config = getConfig();
  return 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
};

export const getAuthUrl = (state: string): string => {
    const config = getConfig();
    console.log("Redirect URI:", config.redirectUri);
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',      // ← add this
    'user-read-email',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId!,
    scope: scopes,
    redirect_uri: config.redirectUri!,
    state: state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string, userId: string) => {
    const config = getConfig();
  try {
    const response = await axios.post<SpotifyTokenResponse>('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri!,
      }), 
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    
    // Store tokens associated with the user
    TokenStore.setToken(userId, {
      accessToken: access_token,
      refreshToken: refresh_token || "",
      expiresAt: Date.now() + (expires_in * 1000),
    });

    return { success: true };
  } catch (error) {
    console.error('Error exchanging code:', error);
    return { success: false };
  }
};


/**
 * Get current user's playlists
 */
export const getUserPlaylists = async (accessToken: string) => {
  const response = await axios.get<SpotifyPlaylistsResponse>('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { limit: 50 }, // Get up to 50 playlists
    timeout: 10000,
  });
  
  return response.data.items;
};

/**
 * Search for a track on Spotify
 */
export const searchTrack = async (accessToken: string, query: string) => {
  const response = await axios.get<SpotifySearchResponse>('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: query,
      type: 'track',
      limit: 1 // We only need the top result
    }
  });
  
  const items = response.data.tracks.items;
  if (items.length > 0) {
    return {
      id: items[0].id,
      uri: items[0].uri,
      name: items[0].name,
      artists: items[0].artists.map((a: any) => a.name).join(', ')
    };
  }
  return null;
};

/**
 * Add a track to a specific playlist
 */
export const addTrackToPlaylist = async (accessToken: string, playlistId: string, trackUri: string) => {
  try {
    // Added timeout: 10000 (10 seconds) to prevent hanging
    const res = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: [trackUri] },
      { 
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000 
      }
    );
    
    console.log("Response from add track:", res.data);
    return { success: true };
    
  } catch (error) {
    // This will tell us if it's a timeout or a permission error
    console.error("Error adding track:", error);
    throw error; // Throw it so the route handler knows it failed
  }
};

export const refreshAccessToken = async (userId: string): Promise<string | null> => {
    const userTokens = TokenStore.getToken(userId);
    if (!userTokens) return null;

    try {
        const response = await axios.post<SpotifyTokenResponse>('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: userTokens.refreshToken,
            }),
            {
                headers: {
                    'Authorization': getAuthHeader(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, expires_in } = response.data;
        
        TokenStore.setToken(userId, {
            ...userTokens, // Keep existing refresh token
            accessToken: access_token,
            expiresAt: Date.now() + (expires_in * 1000),
        });

        return access_token;
    } catch (error) {
        console.error('Error refreshing token', error);
        return null;
    }
};

