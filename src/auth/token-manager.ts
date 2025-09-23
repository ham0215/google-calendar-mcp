import { promises as fs } from 'fs';
import path from 'path';
import { OAuthManager } from './oauth.js';

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class TokenManager {
  private tokenPath: string;
  private oauthManager: OAuthManager;

  constructor(tokenPath: string, oauthManager: OAuthManager) {
    this.tokenPath = tokenPath;
    this.oauthManager = oauthManager;
  }

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.tokenPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async saveTokens(tokens: TokenData): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
  }

  async loadTokens(): Promise<TokenData | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async deleteTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getValidTokens(): Promise<TokenData | null> {
    const tokens = await this.loadTokens();

    if (!tokens) {
      return null;
    }

    if (this.oauthManager.isTokenExpired(tokens.expiry_date)) {
      if (!tokens.refresh_token) {
        await this.deleteTokens();
        return null;
      }

      try {
        const refreshedTokens = await this.oauthManager.refreshAccessToken(tokens.refresh_token);

        const updatedTokens: TokenData = {
          ...tokens,
          ...refreshedTokens,
          refresh_token: (refreshedTokens.refresh_token as string | undefined) || tokens.refresh_token,
        };

        await this.saveTokens(updatedTokens);
        return updatedTokens;
      } catch (error) {
        console.error('Failed to refresh tokens:', error);
        await this.deleteTokens();
        return null;
      }
    }

    return tokens;
  }

  async authenticate(): Promise<TokenData> {
    const existingTokens = await this.getValidTokens();

    if (existingTokens) {
      this.oauthManager.setCredentials(existingTokens as unknown as Record<string, unknown>);
      return existingTokens;
    }

    console.log('No valid tokens found. Starting authentication flow...');
    const authUrl = this.oauthManager.getAuthUrl();

    console.log('\n=================================================');
    console.log('Please visit the following URL to authenticate:');
    console.log(authUrl);
    console.log('=================================================\n');

    const authCode = await this.oauthManager.startAuthServer();
    console.log('Authorization code received. Exchanging for tokens...');

    const tokens = await this.oauthManager.getTokensFromCode(authCode);
    const tokenData = tokens as unknown as TokenData;
    await this.saveTokens(tokenData);

    console.log('Authentication successful! Tokens saved.');
    return tokenData;
  }

  async ensureAuthenticated(): Promise<void> {
    const tokens = await this.authenticate();
    this.oauthManager.setCredentials(tokens as unknown as Record<string, unknown>);
  }
}
