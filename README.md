# ネイルサロン予約管理システム

GitHub Pagesでホスティングする予約管理システムです。

## セットアップ方法

### 1. Google Apps Scriptの設定

1. [Google Apps Script](https://script.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. `gas-api.js` の内容をコピーして貼り付け
4. 設定項目を編集：
   - `CALENDAR_ID`: 予約を受け付けるカレンダーのID
   - `SALON_NOTIFICATION_EMAIL`: サロン側の通知メールアドレス
   - `NOTIFICATION_EMAILS`: 追加の通知メールアドレス

5. デプロイ → 新しいデプロイ → 種類「Webアプリ」を選択
6. アクセス権限を「全員（匿名ユーザーを含む）」に設定
7. デプロイしてWebアプリのURLを取得

### 2. スプレッドシートの設定

1. Googleスプレッドシートを作成
2. 「メニュー」シートを追加
3. 以下の形式でコース情報を入力：
   - A列：コース名
   - B列：施術時間（分）
   - C列：価格（円）

### 3. GitHub Pagesの設定

1. このリポジトリをフォーク
2. `config.js` の `GAS_API_URL` にGoogle Apps Script WebアプリのURLを設定
3. GitHub Pagesを有効化
4. リポジトリの設定 → Pages → Source を「GitHub Actions」に設定

## 機能

- オンライン予約システム
- カレンダー表示
- 予約済み時間の表示
- 自動メール送信
- 画像アップロード機能
- モバイル対応

## 技術スタック

- HTML5
- CSS3
- JavaScript (ES5対応)
- FullCalendar.js
- Google Apps Script
- GitHub Pages

## ブラウザ対応

- Internet Explorer 8+
- Chrome 30+
- Firefox 25+
- Safari 7+
- Edge 12+

## ライセンス

MIT License