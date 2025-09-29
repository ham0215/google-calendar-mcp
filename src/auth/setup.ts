#!/usr/bin/env node

import 'dotenv/config';
import { OAuthManager } from './oauth.js';
import { TokenManager } from './token-manager.js';
import { getConfig } from '../config/settings.js';
import readline from 'readline/promises';

async function setup(): Promise<void> {
  console.log('🔐 Google Calendar MCP - Authentication Setup\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let config;
    try {
      config = getConfig();
    } catch {
      console.error('❌ Missing OAuth credentials!');
      console.log('\nPlease set the following environment variables:');
      console.log('  - GOOGLE_CLIENT_ID');
      console.log('  - GOOGLE_CLIENT_SECRET');
      console.log('\nYou can set them in a .env file in the project root.');
      console.log('\nExample .env file:');
      console.log('  GOOGLE_CLIENT_ID=your-client-id');
      console.log('  GOOGLE_CLIENT_SECRET=your-client-secret');
      process.exit(1);
    }

    const clientId = config.google.clientId;
    const clientSecret = config.google.clientSecret;

    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAuth credentials!');
      console.log('\nPlease set the following environment variables:');
      console.log('  - GOOGLE_CLIENT_ID');
      console.log('  - GOOGLE_CLIENT_SECRET');
      console.log('\nYou can set them in a .env file in the project root.');
      process.exit(1);
    }

    const authManager = new OAuthManager({
      clientId,
      clientSecret,
      redirectUri: config.google.redirectUri,
      scopes: config.google.scopes,
    });

    const tokenManager = new TokenManager(config.storage.tokenPath, authManager);

    const existingToken = await tokenManager.loadTokens();
    if (existingToken) {
      const answer = await rl.question(
        '⚠️  Existing authentication found. Do you want to re-authenticate? (y/n): '
      );
      if (answer.toLowerCase() !== 'y') {
        console.log('✅ Using existing authentication.');
        process.exit(0);
      }
    }

    const authUrl = authManager.getAuthUrl();
    console.log('\n📋 Please visit this URL to authorize the application:');
    console.log(`\n${authUrl}\n`);

    const port = new URL(config.google.redirectUri).port || '3901';
    console.log(`⏳ Waiting for authorization callback on port ${port}...`);

    const authCode = await authManager.startAuthServer();
    console.log('Authorization code received. Exchanging for tokens...');

    const tokens = await authManager.getTokensFromCode(authCode);
    const tokenData = {
      access_token: tokens.access_token || '',
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
      refresh_token: tokens.refresh_token || undefined,
    };

    await tokenManager.saveTokens(tokenData);

    console.log('\n✅ Authentication successful!');
    console.log('🔑 Tokens have been saved to:', config.storage.tokenPath);
    console.log('\n🚀 You can now use the Google Calendar MCP server.');
  } catch (error) {
    console.error('\n❌ Authentication failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setup().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}
