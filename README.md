# Google Calendar MCP Server

Google CalendarをMCP（Model Context Protocol）経由でAIアシスタントに接続するためのサーバーです。会議の自動検出、インテリジェントなフィルタリング、そして効率的なスケジュール管理を実現します。

## 概要

このMCPサーバーを使用することで、ClaudeなどのAIアシスタントがGoogle Calendarのデータに安全にアクセスし、今日の会議情報を取得したり、スケジュールを分析したりすることができます。特に、実際のミーティング（2名以上の参加者がいる予定）を自動的に識別し、関連性の低いイベントをフィルタリングする機能が特徴です。

## 主な機能

- 📅 **スマートな会議検出**: 2名以上の参加者がいる実際の会議を自動識別
- 🎯 **インテリジェントフィルタリング**: 欠席予定、終日イベント、非会議アイテムを自動除外
- 🔐 **セキュアな認証**: PKCEを使用したOAuth 2.0による安全な認証
- ⏰ **タイムゾーン対応**: 完全なタイムゾーン対応のイベント処理
- 🔄 **自動トークン更新**: 期限切れアクセストークンの自動更新
- 🎛️ **カスタマイズ可能なフィルタ**: キーワード除外や参加者要件のカスタマイズ
- 🤖 **AI統合**: Claude、ChatGPTなどのAIアシスタントとの簡単な統合

## 使用シナリオ

このMCPサーバーは以下のようなシナリオで活用できます：

- **AIアシスタントによる会議準備**: 「今日の会議を教えて」と聞くだけで、AIが関連する会議情報を取得
- **議事録の自動作成**: 会議情報を基にAIが議事録テンプレートを準備
- **スケジュール分析**: 会議の傾向や時間配分をAIが分析
- **リマインダー生成**: 重要な会議の前にAIが準備事項をリマインド

## 前提条件

- Node.js 18以上
- Google Cloud Consoleプロジェクト（Calendar API有効化済み）
- Google OAuth 2.0認証情報（Client IDとClient Secret）

## インストール

### 1. リポジトリのクローン

```bash
git clone https://github.com/ham0215/google-calendar-mcp.git
cd google-calendar-mcp
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

### 4. `.env`ファイルの編集

```env
# 必須: Google OAuth認証情報
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# オプション: ポート変更（デフォルト: 3000）
# ポート3000が使用中の場合は、以下のように変更できます
# GOOGLE_REDIRECT_URI=http://localhost:3901/oauth/callback

# オプション: カスタマイズ設定
DEFAULT_TIMEZONE=Asia/Tokyo        # デフォルトのタイムゾーン
MIN_ATTENDEES=2                   # 会議と判定する最小参加者数
EXCLUDE_KEYWORDS=vacation,holiday,pto,ooo  # 除外するキーワード
```

**注意**: `.env`ファイルの代わりに、Claude Desktopの設定ファイルで環境変数を直接指定することも可能です（詳細は「Claude Desktopとの統合」セクションを参照）。

## Google Cloud Consoleの設定

### 1. プロジェクトの作成

[Google Cloud Console](https://console.cloud.google.com/)にアクセスし、新規プロジェクトを作成または既存のプロジェクトを選択

### 2. Google Calendar APIの有効化

1. 「APIとサービス」→「APIとサービスの有効化」を選択
2. 「Google Calendar API」を検索
3. 「有効にする」をクリック

### 3. OAuth 2.0認証情報の作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類で「ウェブアプリケーション」を選択
4. 承認済みのリダイレクトURIに以下を追加：
   ```
   http://localhost:3000/oauth/callback
   ```
5. クライアントIDとクライアントシークレットを保存

## 使用方法

### サーバーのビルド

```bash
npm run build
```

### サーバーの起動

開発環境での起動:
```bash
npm run dev
```

本番環境での起動:
```bash
npm run start
```

### 初回認証

初回起動時は以下の手順で認証を行います：

1. コンソールに認証URLが表示される
2. URLをブラウザで開き、Googleアカウントでログイン
3. カレンダーへのアクセスを許可
4. 自動的にトークンが保存され、次回以降は自動ログイン

### Claude Desktopとの統合

Claude Desktop アプリケーションで使用する場合、以下の2つの方法で設定できます：

#### 方法1: .envファイルを使用（推奨）

プロジェクトルートに`.env`ファイルを作成し、環境変数を設定：

```bash
# .env ファイル
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback  # ポート変更時
DEFAULT_TIMEZONE=Asia/Tokyo
```

`claude_desktop_config.json`にはパスのみ指定：

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["/absolute/path/to/google-calendar-mcp/dist/index.js"]
    }
  }
}
```

#### 方法2: 設定ファイルで直接指定

`.env`ファイルを使用せず、`claude_desktop_config.json`に直接記述：

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["/absolute/path/to/google-calendar-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "DEFAULT_TIMEZONE": "Asia/Tokyo"
      }
    }
  }
}
```

**メリット比較:**
- **方法1（.env）**: 認証情報を一箇所で管理、開発時と同じ設定を使用、Gitで管理されない
- **方法2（直接指定）**: 設定が一つのファイルに集約、複数環境で異なる設定を使いやすい

設定ファイルの場所:
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## 利用可能なツール

### getTodayMeetings

今日の会議をインテリジェントなフィルタリングで取得します。

**パラメータ:**
- `timezone` (文字列, オプション): タイムゾーン（デフォルト: "UTC"、日本の場合: "Asia/Tokyo"）
- `includeDeclined` (真偽値, オプション): 欠席予定の会議を含める（デフォルト: false）
- `minAttendees` (数値, オプション): 最小参加者数（デフォルト: 2）
- `excludeKeywords` (文字列配列, オプション): タイトル/説明から除外するキーワード

**使用例（Claude内）:**
```
今日の会議を教えて
タイムゾーンをAsia/Tokyoで今日の予定を確認して
2人以上参加する会議だけを表示して
```

**レスポンス例:**
```json
{
  "meetings": [
    {
      "id": "event-id",
      "title": "チーム定例会議",
      "startTime": "2024-01-20T10:00:00+09:00",
      "endTime": "2024-01-20T10:30:00+09:00",
      "duration": 30,
      "attendees": [
        {
          "email": "user@example.com",
          "name": "山田太郎",
          "responseStatus": "accepted",
          "isOrganizer": true
        },
        {
          "email": "colleague@example.com",
          "name": "鈴木花子",
          "responseStatus": "accepted",
          "isOrganizer": false
        }
      ],
      "location": "会議室A",
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "description": "週次進捗確認",
      "isAccepted": true,
      "isOrganizer": true
    }
  ],
  "timezone": "Asia/Tokyo",
  "date": "2024-01-20"
}
```

## 設定

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | 必須 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | 必須 |
| `GOOGLE_REDIRECT_URI` | OAuth リダイレクトURI | `http://localhost:3000/oauth/callback` |
| `DEFAULT_TIMEZONE` | デフォルトのタイムゾーン | `UTC` |
| `DEFAULT_CALENDAR_ID` | デフォルトのカレンダーID | `primary` |
| `MIN_ATTENDEES` | 会議と判定する最小参加者数 | `2` |
| `EXCLUDE_KEYWORDS` | 除外するキーワード（カンマ区切り） | 下記参照 |
| `REQUIRE_ACCEPTED` | 承諾済みの会議のみ表示 | `true` |
| `EXCLUDE_DECLINED` | 欠席予定の会議を除外 | `true` |
| `EXCLUDE_ALL_DAY` | 終日イベントを除外 | `true` |
| `TOKEN_DIR` | トークン保存ディレクトリ | `~/.google-calendar-mcp` |

### デフォルトの除外キーワード

以下のキーワードを含むイベントは自動的に除外されます（大文字小文字を区別しない）:
- out of office, ooo（不在）
- vacation, holiday, pto（休暇関連）
- blocked, busy, hold（予定確保）
- tentative, focus time（仮予定、集中時間）
- lunch, break（休憩時間）

## 開発

### 利用可能なスクリプト

```bash
# 開発環境（ホットリロード付き）
npm run dev

# TypeScriptのビルド
npm run build

# 型チェック
npm run typecheck

# リンターの実行
npm run lint

# コードフォーマット
npm run format

# すべてのチェックを実行
npm run check

# ビルドディレクトリのクリーン
npm run clean

# 認証のセットアップ（開発時）
npm run auth
```

### プロジェクト構成

```
google-calendar-mcp/
├── src/
│   ├── index.ts           # MCPサーバーのエントリーポイント
│   ├── auth/              # OAuth認証とトークン管理
│   │   ├── oauth.ts       # OAuth認証フロー実装
│   │   └── token-manager.ts # トークンの保存と更新
│   ├── calendar/          # Calendar API統合
│   │   ├── client.ts      # Google Calendar APIクライアント
│   │   └── filters.ts     # イベントフィルタリングロジック
│   ├── config/            # 設定管理
│   │   └── settings.ts    # 環境設定
│   ├── tools/             # MCPツール実装
│   │   └── get-meetings.ts # getTodayMeetingsツール
│   └── types/             # TypeScript型定義
│       └── index.ts       # 共通型定義
├── dist/                  # コンパイル済みJavaScript
├── docs/                  # ドキュメント
│   └── development-tasks.md # 開発タスクリスト
├── tests/                 # テストファイル
├── .env.example          # 環境変数テンプレート
├── tsconfig.json         # TypeScript設定
└── package.json          # プロジェクト依存関係
```

## トラブルシューティング

### 認証エラーの対処

認証に問題が発生した場合:
1. トークンファイルを削除: `rm ~/.google-calendar-mcp/tokens.json`
2. サーバーを再起動して再認証
3. Google Cloud ConsoleでOAuthクライアントが正しく設定されているか確認

### トークンの有効期限

サーバーは自動的に期限切れトークンを更新しますが、以下の場合は再認証が必要:
- 6ヶ月以上経過したトークン
- Google Cloudプロジェクトが無効化されている場合

### API制限

Google Calendar APIには利用制限があります。本サーバーは以下の対策を実装:
- エクスポネンシャルバックオフによる自動リトライ
- レート制限の検出と待機
- クォータ超過時の適切なエラーハンドリング

### よくある質問

**Q: 「今日の会議」が表示されない**
- A: タイムゾーンが正しく設定されているか確認してください。日本の場合は`DEFAULT_TIMEZONE=Asia/Tokyo`を設定します。

**Q: 特定のイベントが除外される**
- A: 除外キーワードを確認してください。`EXCLUDE_KEYWORDS`環境変数でカスタマイズ可能です。

**Q: 認証URLにアクセスできない**
- A: デフォルトではポート3000を使用します。他のアプリケーションで使用されている場合は、環境変数`GOOGLE_REDIRECT_URI`で別のポート（例: 3901）を指定してください。

## セキュリティ

- OAuthトークンはユーザーのホームディレクトリにローカル保存
- PKCE（Proof Key for Code Exchange）による強化されたセキュリティ
- CSRF攻撃を防ぐためのstate検証を実装
- 認証情報はバージョン管理にコミットしない

## Findyでの活用

このMCPサーバーは、Findyでの以下の業務で活用されています:

- **議事録の自動作成**: 会議情報を基にNotionに議事録テンプレートを作成
- **会議準備の効率化**: AIが関連資料や過去の議事録を自動収集
- **スケジュール分析**: 会議時間の配分や参加率の分析

関連プロジェクト:
- [meeting-minutes-creator](https://github.com/ham0215/meeting-minutes-creator): 議事録自動作成エージェント

## コントリビューション

貢献を歓迎します！以下の手順でお願いします:

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を実装
4. テストを追加（必要に応じて）
5. プルリクエストを送信

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## サポート

問題、質問、提案がある場合は、GitHubでIssueを作成してください。