import { Request, Response, NextFunction } from 'express';
import TokenStore from '../storage/token.store';
import { refreshAccessToken } from '../services/spotify.service';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Authentication middleware triggered");

  // 1. Try to get ID from Cookie (Browser Web Flow)
  let userId = req.cookies['spotify_user_id'];

  // 2. If no cookie, try to get ID from Custom Header (Extension Flow)
  if (!userId) {
    userId = req.headers['x-user-id'] as string;
    console.log("No cookie found, checking headers. Found X-User-ID:", userId);
  }

  if (!userId) {
    console.log("Authentication failed: No ID found in cookies or headers.");
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let tokens = TokenStore.getToken(userId);

  if (!tokens) {
    console.log("Authentication failed: Tokens not found in store for ID:", userId);
    return res.status(401).json({ error: 'Tokens not found, please login again' });
  }

  // Check if Access Token is expired
  if (Date.now() >= tokens.expiresAt) {
    console.log('Token expired, refreshing...');
    const newToken = await refreshAccessToken(userId);
    if (!newToken) {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
    tokens = TokenStore.getToken(userId); // Get updated tokens
  }

  // Attach user info to request object for next handlers
  req.user = {
    id: userId,
    accessToken: tokens!.accessToken,
  };

  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        accessToken: string;
      };
    }
  }
}