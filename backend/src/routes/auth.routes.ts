import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUrl, exchangeCodeForToken } from '../services/spotify.service';

const router = Router();

// 1. Start Login Flow
router.get('/login', (req: Request, res: Response) => {
    console.log("Running login flow");
  // Generate a unique ID for this user/session
  // In production, this should be tied to a database user ID
  const userId = uuidv4();
  
  // Generate the Spotify Authorization URL
  const authUrl = getAuthUrl(userId);
  
  // Redirect the user to Spotify
  res.redirect(authUrl);
});

// 2. Callback from Spotify
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
    console.log("Callback received:", { code, state, error });
  if (error) {
    return res.status(400).send(`Error: ${error}`);
  }

  // 'state' contains the userId we sent earlier
  const userId = state as string;

  if (!code || !userId) {
    return res.status(400).send('Missing code or state');
  }

  const result = await exchangeCodeForToken(code as string, userId);

  if (!result.success) {
    return res.status(500).send('Authentication failed');
  }

  // SUCCESS
  // Set an HTTP-only cookie with the userId (Session approach)
  res.cookie('spotify_user_id', userId, { 
    httpOnly: true, 
    secure: false, // Set to true if you are on HTTPS (Production)
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  // Redirect to a success page or close the window
  res.send(`
    <html>
      <body>
        <h1>Login Successful!</h1>
        <p>Connecting to extension...</p>
        <script>
          // The ID of your extension (you can get this from chrome://extensions)
          // We will use a wildcard or check if the API exists
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
             // Attempt to send message to the extension ID
             // You need to replace YOUR_EXTENSION_ID with the actual ID from chrome://extensions
             // Or leave it open for localhost testing
          } else {
             // Fallback for when extension ID isn't known directly
             document.body.innerHTML = '<h1>Login Successful!</h1><p>You can close this window and click the extension icon again.</p>';
          }
          
          // A simple trick for local development:
          // We set a flag in localStorage that the extension can check if needed
          // But strictly, we just rely on cookies for the API calls.
          window.close();
        </script>
      </body>
    </html>
  `);
});

export default router;