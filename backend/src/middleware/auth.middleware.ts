import { Request, Response, NextFunction } from 'express';
import TokenStore from '../storage/token.store';
import { refreshAccessToken } from '../services/spotify.service';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    console.log("Authentication middleware triggered");
    console.log("Request cookies:", req.cookies);
  // Get userId from cookie
  const userId = req.cookies['spotify_user_id'];

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let tokens = TokenStore.getToken(userId);

  if (!tokens) {
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