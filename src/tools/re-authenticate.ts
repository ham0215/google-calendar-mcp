import { OAuthManager } from '../auth/oauth.js';
import { TokenManager } from '../auth/token-manager.js';
import { getValidatedConfig } from '../config/settings.js';
import open from 'open';

interface ReAuthenticateResult {
  success: boolean;
  message: string;
  tokenInfo?: {
    hasRefreshToken: boolean;
    expiryDate?: number;
    scopes?: string;
  };
}

/**
 * Re-authenticate with Google Calendar API
 * This tool will:
 * 1. Check current token status
 * 2. Clear existing tokens
 * 3. Open browser for authentication
 * 4. Wait for OAuth callback
 * 5. Save new tokens
 */
async function reAuthenticate(): Promise<ReAuthenticateResult> {
  try {
    const config = getValidatedConfig();

    const oauthManager = new OAuthManager({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUri,
      scopes: config.google.scopes,
    });

    const tokenManager = new TokenManager(config.storage.tokenPath, oauthManager);

    // Check existing tokens
    const existingTokens = await tokenManager.loadTokens();
    if (existingTokens) {
      console.log('🔍 Found existing tokens. Clearing...');
      await tokenManager.deleteTokens();
    }

    // Generate authentication URL
    const authUrl = oauthManager.getAuthUrl();
    console.log('🔗 Generated authentication URL');

    // Open browser automatically
    console.log('🌐 Opening browser for authentication...');
    await open(authUrl);

    const port = new URL(config.google.redirectUri).port || '3901';
    console.log(`⏳ Waiting for authorization callback on port ${port}...`);

    // Start OAuth callback server and wait for auth code
    const authCode = await oauthManager.startAuthServer();
    console.log('✅ Authorization code received. Exchanging for tokens...');

    // Exchange auth code for tokens
    const tokens = await oauthManager.getTokensFromCode(authCode);
    const tokenData = {
      access_token: tokens.access_token || '',
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
      refresh_token: tokens.refresh_token || undefined,
    };

    // Save tokens
    await tokenManager.saveTokens(tokenData);
    console.log('💾 Tokens saved successfully');

    return {
      success: true,
      message: 'Successfully re-authenticated with Google Calendar API',
      tokenInfo: {
        hasRefreshToken: !!tokenData.refresh_token,
        expiryDate: tokenData.expiry_date,
        scopes: tokenData.scope,
      },
    };
  } catch (error) {
    console.error('❌ Re-authentication failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Re-authentication failed: ${errorMessage}`,
    };
  }
}

/**
 * Tool schema definition for MCP
 */
export function reAuthenticateTool() {
  return {
    name: 'Re-authenticate',
    description:
      'Re-authenticate with Google Calendar API',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  };
}

/**
 * Execute the reAuthenticate tool
 */
export async function executeReAuthenticateTool(): Promise<{
  type: string;
  text: string;
}> {
  try {
    const result = await reAuthenticate();

    return {
      type: 'text',
      text: JSON.stringify(result, null, 2),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      type: 'text',
      text: JSON.stringify(
        {
          success: false,
          message: errorMessage,
        },
        null,
        2
      ),
    };
  }
}
