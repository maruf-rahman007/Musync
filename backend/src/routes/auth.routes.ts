import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUrl, exchangeCodeForToken } from '../services/spotify.service';

const router = Router();

// 1. Start Login Flow
router.get('/login', (req: Request, res: Response) => {
  console.log("[LOGIN] Starting Spotify OAuth flow");
  const userId = uuidv4();
  
  const authUrl = getAuthUrl(userId);
  console.log("[LOGIN] Redirecting to:", authUrl);
  
  res.redirect(authUrl);
});

// 2. Callback from Spotify
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  console.log("[CALLBACK] Received:", { code: !!code, state, error });

  if (error) {
    console.error("[CALLBACK] Spotify error:", error);
    return res.status(400).send(`Spotify login error: ${error}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter');
  }

  const userId = state as string;

  const result = await exchangeCodeForToken(code as string, userId);

  if (!result.success) {
    console.error("[CALLBACK] Token exchange failed");
    return res.status(500).send('Authentication failed - token exchange error');
  }

  console.log(`[CALLBACK] Success - setting cookie for userId: ${userId}`);

  res.cookie('spotify_user_id', userId, { 
    httpOnly: true,
    secure: false,           // localhost = false, production = true + HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',               // ← critical
  });

  console.log('[CALLBACK] Set-Cookie header sent');

  // Clean success page that auto-closes
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Connected</title>
    <style>body{font-family:sans-serif;text-align:center;padding:80px;background:#111;color:#fff;}</style>
  </head>
  <body>
    <h1 style="color:#1ed760">Spotify Connected Successfully</h1>
    <p>Returning to extension... (you can close this tab)</p>
    <script>
      // Give browser 3–4 seconds to store cookie before closing
      setTimeout(() => {
        if (window.close) window.close();
        else alert('You can close this tab now');
      }, 3500);
    </script>
  </body>
  </html>
`);
});

export default router;