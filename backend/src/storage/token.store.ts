import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(__dirname, '../../tokens.json');

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class TokenStore {
  // Load from file on startup
  private tokens: Map<string, UserTokens> = new Map(
    fs.existsSync(FILE_PATH) 
      ? Object.entries(JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'))) 
      : []
  );

  private save() {
    fs.writeFileSync(FILE_PATH, JSON.stringify(Object.fromEntries(this.tokens)));
  }

  public setToken(userId: string, tokens: UserTokens): void {
    this.tokens.set(userId, tokens);
    this.save(); // Save to disk
  }

  public getToken(userId: string): UserTokens | undefined {
    return this.tokens.get(userId);
  }

  public deleteToken(userId: string): void {
    this.tokens.delete(userId);
    this.save();
  }
}

export default new TokenStore();