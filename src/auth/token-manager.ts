import { promises as fs } from 'fs';
import path from 'path';
import { OAuthManager } from './oauth.js';
import { Credentials } from 'google-auth-library';

export interface TokenData extends Credentials {
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
          access_token: refreshedTokens.access_token || tokens.access_token,
          scope: refreshedTokens.scope || tokens.scope,
          token_type: refreshedTokens.token_type || tokens.token_type,
          expiry_date: refreshedTokens.expiry_date || tokens.expiry_date,
          refresh_token: refreshedTokens.refresh_token || tokens.refresh_token,
          id_token: refreshedTokens.id_token,
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
      this.oauthManager.setCredentials(existingTokens);
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
    const tokenData: TokenData = {
      access_token: tokens.access_token || '',
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
      refresh_token: tokens.refresh_token || undefined,
    };
    await this.saveTokens(tokenData);

    console.log('Authentication successful! Tokens saved.');
    return tokenData;
  }

  async ensureAuthenticated(): Promise<void> {
    const tokens = await this.authenticate();
    this.oauthManager.setCredentials(tokens);
  }
}
