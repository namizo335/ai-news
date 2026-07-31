# ai-news-slack

無料APIのみでAIニュースを集め、Slack Incoming Webhookへ通知するツールです。LLMは使いません。

- **朝ダイジェスト**: 毎日 8:00 JST（日本語5件 + 英語参考3件）
- **準即時アラート**: 30分ごと（公式ブログの新着 / 英語ソースのキーワード一致、最大5件）

## セットアップ

### 1. Slack Incoming Webhook

手順の詳細は **[docs/slack-setup.md](docs/slack-setup.md)** を参照。

要約:

1. [Slack App](https://api.slack.com/apps) を作成（Blank app）
2. Incoming Webhooks を有効化
3. 投稿先チャンネルを選び Webhook URL をコピー
4. ローカルは `.env`、GitHub Actions は Secret `SLACK_WEBHOOK_URL` に設定（Git に載せない）

### 2. ローカル

```bash
cd ~/Projects/ai-news-slack
npm install
cp .env.example .env
# .env に SLACK_WEBHOOK_URL を設定

npm run dry-run          # 投稿せず内容確認
npm run dry-run:alert
npm run digest           # 実際に投稿
npm run alert
```

### 3. GitHub Actions

1. このリポジトリを GitHub に push
2. Settings → Secrets and variables → Actions
3. `SLACK_WEBHOOK_URL` を追加
4. Actions タブで workflow を手動実行して確認

スケジュール:

| Workflow | Cron (UTC) | 意味 |
|----------|------------|------|
| `digest.yml` | `0 23 * * *` | 毎日 8:00 JST |
| `alert.yml` | `*/30 * * * *` | 30分ごと |

既送URLは `actions/cache` の `sent.json` で管理します。

## 設定

- [`config/sources.json`](config/sources.json) … フィードURL・件数・公式フラグ
- [`config/keywords.json`](config/keywords.json) … 即時通知キーワード

## ソース

**日本語**: Zenn (AI), Qiita (AI), ITmedia AI+, Publickey  
**英語**: Hacker News (AI語彙), OpenAI News, Google AI Blog, Anthropic News

## 注意

- GitHub Actions の cron は数分遅れることがあります
- `actions/cache` が消えると既送履歴がリセットされ、再送が起きることがあります
- Anthropic は公式RSSが不安定なため Feedburner/OpenRSS 経由です
