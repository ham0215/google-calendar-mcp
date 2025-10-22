#!/usr/bin/env node
import { TokenManager } from './token-manager.js';
import { OAuthManager } from './oauth.js';
import { getConfig } from '../config/settings.js';

const config = getConfig();

interface TokenStatus {
  exists: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  isExpired: boolean;
  expiryDate?: Date;
  timeRemaining?: string;
  scopes?: string[];
}

function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日 ${hours % 24}時間`;
  } else if (hours > 0) {
    return `${hours}時間 ${minutes % 60}分`;
  } else if (minutes > 0) {
    return `${minutes}分 ${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

async function getTokenStatus(): Promise<TokenStatus> {
  const oauthManager = new OAuthManager({
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret,
    redirectUri: config.google.redirectUri,
  });

  const tokenManager = new TokenManager(config.storage.tokenPath, oauthManager);

  try {
    const tokens = await tokenManager.loadTokens();

    if (!tokens) {
      return {
        exists: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        isExpired: true,
      };
    }

    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
    const now = Date.now();
    const isExpired = tokens.expiry_date ? now >= tokens.expiry_date : true;
    const timeRemaining =
      tokens.expiry_date && !isExpired ? formatTimeRemaining(tokens.expiry_date - now) : undefined;

    return {
      exists: true,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      isExpired,
      expiryDate,
      timeRemaining,
      scopes: tokens.scope ? tokens.scope.split(' ') : undefined,
    };
  } catch {
    return {
      exists: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      isExpired: true,
    };
  }
}

async function displayTokenStatus(): Promise<void> {
  console.log('🔐 トークン状態確認\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const status = await getTokenStatus();

  if (!status.exists) {
    console.log('❌ トークンが見つかりません');
    console.log('\n認証を行うには以下のコマンドを実行してください:');
    console.log('  npm run auth\n');
    return;
  }

  console.log('✅ トークンファイル: 存在します');
  console.log(`   場所: ${config.storage.tokenPath}\n`);

  console.log('📝 トークン情報:');
  console.log(`   Access Token: ${status.hasAccessToken ? '✅ あり' : '❌ なし'}`);
  console.log(`   Refresh Token: ${status.hasRefreshToken ? '✅ あり' : '❌ なし'}\n`);

  if (status.expiryDate) {
    console.log('⏰ 有効期限:');
    console.log(
      `   日時: ${status.expiryDate.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    );

    if (status.isExpired) {
      console.log('   状態: ❌ 期限切れ');
      if (status.hasRefreshToken) {
        console.log('   → Refresh Tokenで自動更新されます');
      } else {
        console.log('   → 再認証が必要です (npm run auth)');
      }
    } else {
      console.log(`   状態: ✅ 有効`);
      console.log(`   残り時間: ${status.timeRemaining}`);
    }
    console.log();
  }

  if (status.scopes && status.scopes.length > 0) {
    console.log('🔑 権限スコープ:');
    status.scopes.forEach((scope) => {
      const scopeName = scope.split('/').pop() || scope;
      console.log(`   - ${scopeName}`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!status.hasRefreshToken) {
    console.log('⚠️  警告: Refresh Tokenがありません');
    console.log('   Access Token期限切れ後、自動更新できません。');
    console.log('   再認証を行ってください: npm run auth\n');
  } else if (status.isExpired) {
    console.log('ℹ️  Access Tokenは期限切れですが、');
    console.log('   次回API呼び出し時に自動的に更新されます。\n');
  } else {
    console.log('✅ すべて正常です。認証は有効です。\n');
  }
}

// スクリプトとして実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  displayTokenStatus().catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
}

export { getTokenStatus, displayTokenStatus };
