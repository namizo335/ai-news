# Slack セットアップガイド（ai-news-slack）

このアプリは **Bot API や Event API は使いません**。  
投稿だけできればよいので、いちばん簡単な **Incoming Webhook** を使います。

公式ドキュメント: [Sending messages using incoming webhooks](https://api.slack.com/messaging/webhooks)

---

## 全体の流れ

```text
1. Slack App を作成
2. Incoming Webhooks を有効化
3. 投稿先チャンネルを選んで Webhook URL を取得
4. ローカル (.env) または GitHub Secrets に設定
5. テスト投稿 → 定期実行を確認
```

所要時間の目安: 5〜10分

---

## 事前準備

- 投稿したい Slack ワークスペースにログインできること
- そのワークスペースで **アプリをインストールする権限** があること  
  （権限がない場合は管理者に依頼してください）
- 投稿先チャンネル（例: `#ai-news`）を用意しておくと分かりやすい  
  （後からでも作れます）

---

## Step 1. Slack App を作成する

1. ブラウザで [https://api.slack.com/apps](https://api.slack.com/apps) を開く
2. **Create New App** をクリック
3. 作成方法の選択画面では **Blank app** を選ぶ（Continue）
   - 使わない: AI agent / Starter app / From a manifest  
   - このプロジェクトは Incoming Webhook のみなので、空のアプリで十分
4. 次を入力して作成する
   - **App Name**: 例）`AI News Digest`
   - **Pick a workspace**: 投稿したいワークスペース
5. **Create App**

作成後、アプリの設定画面（Basic Information など）に入ります。

---

## Step 2. Incoming Webhooks を有効化する

1. 左サイドバーの **Features** → **Incoming Webhooks** を開く  
   （メニューに無い場合は検索欄で `Incoming Webhooks`）
2. **Activate Incoming Webhooks** を **On** にする
3. 画面が更新され、「Add New Webhook to Workspace」が出ることを確認

この時点ではまだ URL は発行されていません。

---

## Step 3. Webhook URL を発行する

1. **Add New Webhook to Workspace** をクリック
2. 投稿先チャンネルを選ぶ（例: `#ai-news`）
   - プライベートチャンネルにする場合は、自分がそのチャンネルに参加している必要があります
3. **Allow**（許可）をクリック
4. Incoming Webhooks 画面に戻り、**Webhook URLs for Your Workspace** に URL が表示される

URL の形:

```text
https://hooks.slack.com/services/T********/B********/************************
```

### 重要: この URL は秘密情報です

- パスワードと同じ扱いにする
- **Git に commit / push しない**（このリポジトリでは `.env` は ignore 済み）
- チャットやスクショに載せない
- 漏れたら Step 7 の手順で削除・再発行する

---

## Step 4. ローカルで動かす

プロジェクト直下で:

```bash
cd ~/Projects/ai-news-slack
npm install
cp .env.example .env
```

`.env` を開き、取得した URL を設定します。

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

### 4-1. 投稿せず中身だけ確認（推奨）

```bash
npm run dry-run
npm run dry-run:alert
```

ターミナルに Slack 向けメッセージが表示されれば OK です。

### 4-2. 実際に Slack へ投稿

```bash
npm run digest
```

選んだチャンネルに「AIニュース …」が届けば成功です。

準即時アラート側を試す場合:

```bash
npm run alert
```

※ 該当ニュースが無いときは投稿せず終了します（正常動作）。

### 4-3. curl で Webhook 単体テスト（任意）

アプリと切り分けたいとき:

```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text":"ai-news-slack 接続テスト"}'
```

チャンネルにテストメッセージが出れば、Slack 側の設定は完了しています。

---

## Step 5. GitHub Actions で毎日自動投稿する

ローカルの `.env` は GitHub には上がりません。  
Actions 用には **Repository Secret** を別途登録します。

1. このリポジトリを GitHub に push
2. GitHub でリポジトリを開く
3. **Settings** → **Secrets and variables** → **Actions**
4. **New repository secret**
   - Name: `SLACK_WEBHOOK_URL`（この名前で固定）
   - Secret: Step 3 の Webhook URL
5. **Add secret**

### 手動で一度動かす（推奨）

1. **Actions** タブを開く
2. 左から **Morning AI News Digest** を選ぶ
3. **Run workflow** → **Run workflow**
4. 緑になれば成功。Slack チャンネルも確認

同様に **AI News Alerts** も手動実行できます。

### 自動スケジュール

| Workflow | タイミング |
|----------|------------|
| Morning AI News Digest | 毎日 8:00 JST 前後 |
| AI News Alerts | 約30分ごと |

GitHub の cron は数分遅れることがあります。

---

## Step 6. 見た目を少し整える（任意）

Slack App 設定の **Basic Information** で次を変えられます。

- **Display Name**: チャンネルに出る名前（例: AIニュース）
- **App Icon**: アイコン画像

変更後、チャンネル上の表示名が分かりやすくなります。

---

## Step 7. URL が漏れたときの対処

1. [https://api.slack.com/apps](https://api.slack.com/apps) で該当アプリを開く
2. **Incoming Webhooks**
3. 漏れた URL の行で **Remove** / 削除
4. 改めて **Add New Webhook to Workspace** で再発行
5. ローカル `.env` と GitHub Secret `SLACK_WEBHOOK_URL` を新しい URL に更新

古い URL は削除後すぐ使えなくなります。

---

## よくある詰まりどころ

| 症状 | 確認すること |
|------|----------------|
| App を作れない / インストールできない | ワークスペースのアプリ制限。管理者に「アプリ追加」を依頼 |
| Allow 後に URL が見えない | Incoming Webhooks 画面を再読み込み。Activate が On か確認 |
| `SLACK_WEBHOOK_URL is required` | `.env` の有無、変数名の typo、シェルを開き直したか |
| Actions は成功なのに Slack に来ない | Secret 名が正確に `SLACK_WEBHOOK_URL` か。Webhook のチャンネルを確認 |
| `npm run alert` で何も来ない | 直近の公式/英語キーワード該当が無いとき。`dry-run:alert` で候補を確認 |
| 403 / invalid_payload | URL が途中で切れていないか。JSON ではなくプレーンな URL だけを貼っているか |

---

## このアプリが使わないもの（参考）

混乱しやすいので明示します。

- Bot Token（`xoxb-...`）は不要
- OAuth / Redirect URL の設定は不要
- Event Subscriptions は不要
- Socket Mode は不要

必要なのは **Incoming Webhook URL 1本** だけです。

---

## 次にやることチェックリスト

- [ ] Slack App 作成
- [ ] Incoming Webhooks を On
- [ ] Webhook URL を取得
- [ ] `.env` に設定（Git に載せない）
- [ ] `npm run dry-run` → `npm run digest` でチャンネル確認
- [ ] GitHub Secret `SLACK_WEBHOOK_URL` を設定
- [ ] Actions で Digest を手動実行
- [ ] 翌朝 8:00 前後の自動投稿を確認
