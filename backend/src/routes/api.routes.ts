// src/routes/api.routes.ts
import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { getUserPlaylists, searchTrack, addTrackToPlaylist } from '../services/spotify.service';
import { SpotifyUserProfile } from '../types/auth.types';
import axios from 'axios';
const router = Router();

// GET /api/playlists - Returns user's playlists
router.get('/playlists', isAuthenticated, async (req: Request, res: Response) => {
    console.log("Request received for user playlists");
    console.log("All params:", req.query);
  try {
    const playlists = await getUserPlaylists(req.user!.accessToken);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// GET /api/search - Search for a track
router.get('/search', isAuthenticated, async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

  try {
    const track = await searchTrack(req.user!.accessToken, q as string);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/playlist/add - Add track to playlist
router.post('/playlist/add', isAuthenticated, async (req: Request, res: Response) => {
  const { playlistId, trackUri } = req.body;
  
  if (!playlistId || !trackUri) {
    return res.status(400).json({ error: 'Missing playlistId or trackUri' });
  }

  try {
    await addTrackToPlaylist(req.user!.accessToken, playlistId, trackUri);
    res.json({ success: true, message: 'Track added!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add track' });
  }
});


// src/routes/api.routes.ts or directly in app
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const response = await axios.get<SpotifyUserProfile>('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${req.user!.accessToken}` },
    });

    const profile = response.data;

    res.json({
      display_name: profile.display_name || profile.id,
      email: profile.email,           // optional
      id: profile.id,
      images: profile.images,         // profile picture if you want later
      product: profile.product,       // premium/free
      connected: true
    });
  } catch (error: any) {
    console.error('Failed to fetch /me:', error?.response?.data || error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

export default router;