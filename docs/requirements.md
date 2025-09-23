# Google Calendar MCP Server 要求仕様書

## 1. 概要

### 1.1 プロジェクト概要
Google Calendar MCP ServerはModel Context Protocol (MCP)を使用して、Google Calendarとの連携を行うローカル動作型のサーバーアプリケーションです。

### 1.2 目的
- Google Calendarから予定情報を取得し、MCPプロトコルを通じてAIアシスタントに提供する
- 特定の条件に基づいて予定をフィルタリングし、関連性の高い情報のみを提供する
- OAuth 2.0を使用した安全な認証を実現する

## 2. 技術要件

### 2.1 開発環境
- **言語**: Node.js (TypeScript)
- **プロトコル**: Model Context Protocol (MCP)
- **実行環境**: ローカル環境
- **必要なNode.jsバージョン**: 18.0.0以上

### 2.2 必要な依存関係
- `@modelcontextprotocol/sdk`: MCPサーバー実装用SDK
- `googleapis`: Google Calendar APIクライアント
- `google-auth-library`: OAuth 2.0認証
- `dotenv`: 環境変数管理
- `typescript`: TypeScript開発環境
- `tsx`: TypeScript実行環境

## 3. 認証要件

### 3.1 OAuth 2.0認証
- **認証方式**: OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- **認証フロー**: Authorization Code Flow
- **スコープ**:
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar.events.readonly`

### 3.2 認証情報管理
- Google Cloud Consoleでのプロジェクト設定
- OAuth 2.0クライアントID/シークレットの取得
- リフレッシュトークンの安全な保存
- トークンの自動更新メカニズム

### 3.3 初回認証フロー
1. ローカルサーバーを起動してリダイレクトURIを準備
2. ブラウザで認証URLを開く
3. ユーザーが権限を承認
4. 認証コードを受け取る
5. アクセストークン・リフレッシュトークンを取得
6. トークンをローカルファイルに保存

## 4. 機能要件

### 4.1 主要機能
#### 4.1.1 予定取得機能
- **機能名**: `getCalendarEvents`
- **説明**: 指定したユーザーの当日の予定を取得する
- **パラメータ**:
  - `userId`: 対象ユーザーのメールアドレス（省略時は認証ユーザー）
  - `date`: 取得対象日（省略時は当日）

### 4.2 フィルタリング条件

#### 4.2.1 参加者数フィルタ
- **条件**: 2名以上が参加している予定のみを取得
- **判定方法**:
  - `attendees`配列の長さが2以上
  - 主催者も参加者としてカウント

#### 4.2.2 参加表明フィルタ
- **条件**: ユーザーが参加表明している予定のみを取得
- **判定方法**:
  - `responseStatus`が`accepted`または`tentative`
  - 未回答（`needsAction`）や欠席（`declined`）は除外

#### 4.2.3 キーワード除外フィルタ
- **条件**: 特定のキーワードを含む予定を除外
- **除外キーワード** (設定ファイルで管理):
  - "個人"
  - "プライベート"
  - "休暇"
  - "有給"
  - "病院"
  - その他カスタマイズ可能

## 5. MCP Server実装仕様

### 5.1 サーバー設定
```json
{
  "name": "google-calendar-mcp",
  "version": "1.0.0",
  "description": "Google Calendar integration for MCP",
  "transport": {
    "type": "stdio"
  }
}
```

### 5.2 提供するTools

#### 5.2.1 Tool: `getTodayMeetings`
**説明**: 当日のミーティング予定を取得

**入力パラメータ**:
```typescript
{
  userEmail?: string;  // 対象ユーザーのメールアドレス
  excludeKeywords?: string[];  // 除外キーワード（オプション）
}
```

**出力形式**:
```typescript
{
  meetings: [
    {
      id: string;
      summary: string;
      description?: string;
      start: {
        dateTime: string;
        timeZone: string;
      };
      end: {
        dateTime: string;
        timeZone: string;
      };
      attendees: [
        {
          email: string;
          displayName?: string;
          responseStatus: string;
          organizer?: boolean;
        }
      ];
      location?: string;
      meetingUrl?: string;  // Google Meet URL等
      status: string;
    }
  ];
  totalCount: number;
  filteredCount: number;
}
```

### 5.3 エラーハンドリング
- 認証エラー: トークンの再取得を促す
- API制限エラー: リトライロジックの実装
- ネットワークエラー: 適切なエラーメッセージの返却

## 6. 設定ファイル

### 6.1 環境変数 (.env)
```bash
# Google OAuth設定
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3901/oauth/callback

# MCP Server設定
MCP_SERVER_PORT=3901

# フィルタリング設定
EXCLUDE_KEYWORDS=個人,プライベート,休暇,有給,病院
MIN_ATTENDEES=2
```

### 6.2 MCP設定ファイル (mcp.json)
```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 7. ディレクトリ構成

```
google-calendar-mcp/
├── src/
│   ├── index.ts           # MCPサーバーエントリポイント
│   ├── auth/
│   │   ├── oauth.ts       # OAuth認証処理
│   │   └── token-manager.ts  # トークン管理
│   ├── calendar/
│   │   ├── client.ts      # Google Calendar APIクライアント
│   │   └── filters.ts     # イベントフィルタリング
│   ├── tools/
│   │   └── get-meetings.ts  # MCP Tool実装
│   ├── config/
│   │   └── settings.ts    # 設定管理
│   └── types/
│       └── index.ts       # TypeScript型定義
├── docs/
│   └── requirements.md    # 本仕様書
├── tests/
│   └── ...               # テストファイル
├── .env.example          # 環境変数サンプル
├── package.json
├── tsconfig.json
├── mcp.json              # MCP設定
└── README.md
```

## 8. セキュリティ要件

### 8.1 認証情報の保護
- OAuth認証情報は環境変数で管理
- トークンはローカルファイルシステムに暗号化して保存
- `.gitignore`でトークンファイルを除外

### 8.2 データアクセス制限
- 読み取り専用のスコープのみ使用
- カレンダーの変更権限は要求しない
- 最小限の必要な情報のみ取得

## 9. テスト要件

### 9.1 単体テスト
- 認証フローのテスト
- フィルタリングロジックのテスト
- エラーハンドリングのテスト

### 9.2 統合テスト
- Google Calendar APIとの連携テスト
- MCPプロトコルの動作確認
- エンドツーエンドのシナリオテスト

## 10. 今後の拡張可能性

### 10.1 追加機能候補
- 複数日の予定取得
- 予定の作成・更新機能（書き込み権限が必要）
- 他のカレンダーサービスとの連携
- リマインダー機能
- 予定の自動分類

### 10.2 パフォーマンス最適化
- キャッシュ機能の実装
- バッチ取得の実装
- 非同期処理の最適化

## 11. 制約事項

- Google Calendar APIの利用制限に準拠
- ローカル環境でのみ動作（クラウド展開は別途検討）
- 初回認証時はブラウザでの手動操作が必要
- リフレッシュトークンの有効期限（6ヶ月）への対応が必要