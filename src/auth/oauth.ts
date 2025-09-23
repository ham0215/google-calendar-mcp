import { OAuth2Client } from 'google-auth-library';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import crypto from 'crypto';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export class OAuthManager {
  private oauth2Client: OAuth2Client;
  private config: AuthConfig;
  private server: any;
  private codeVerifier?: string;
  private state?: string;

  constructor(config: AuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly',
      ],
    };

    this.oauth2Client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
  }

  private generatePKCE(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  private generateState(): string {
    return crypto.randomBytes(16).toString('base64url');
  }

  getAuthUrl(): string {
    const { verifier, challenge } = this.generatePKCE();
    this.codeVerifier = verifier;
    this.state = this.generateState();

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      state: this.state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'consent',
    });

    return authUrl;
  }

  async startAuthServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const urlObj = new URL(req.url!, `http://${req.headers.host}`);

        if (urlObj.pathname === '/oauth/callback') {
          const code = urlObj.searchParams.get('code');
          const state = urlObj.searchParams.get('state');
          const error = urlObj.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
            this.server.close();
            reject(new Error(`Authentication failed: ${error}`));
            return;
          }

          if (state !== this.state) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>Invalid state parameter</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
            this.server.close();
            reject(new Error('Invalid state parameter - possible CSRF attack'));
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Successful!</h1>
                  <p>You can now close this window.</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
            this.server.close();
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>No authorization code received</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
            this.server.close();
            reject(new Error('No authorization code received'));
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      const port = new URL(this.config.redirectUri).port || 3901;
      this.server.listen(port, () => {
        console.log(`OAuth callback server listening on port ${port}`);
      });
    });
  }

  async getTokensFromCode(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken({
      code,
      codeVerifier: this.codeVerifier,
    });

    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  setCredentials(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }

  getClient(): OAuth2Client {
    return this.oauth2Client;
  }

  isTokenExpired(expiryDate: number): boolean {
    return Date.now() >= expiryDate;
  }

  stopAuthServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}