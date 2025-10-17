# 予約管理システム - CARAT

ネイルサロンCARAT向けのオンライン予約管理システムです。GitHub Pagesで公開されています。

## 🌟 特徴

- **レスポンシブデザイン**: スマートフォン、タブレット、PCに対応
- **リアルタイム予約管理**: Googleカレンダーと連携した空き時間表示
- **Instagram対応**: Instagram内ブラウザからの自動リダイレクト機能
- **直感的なUI**: ステップバイステップの予約フロー
- **多言語対応**: 日本語UI

## 🚀 デプロイ方法

### GitHub Pagesでの公開

1. このリポジトリをフォークまたはクローン
2. GitHub Pagesの設定でソースを「Deploy from a branch」に設定
3. ブランチを「main」に設定
4. 公開完了！

### カスタムドメインの設定

1. リポジトリの「Settings」→「Pages」に移動
2. 「Custom domain」にドメイン名を入力
3. DNS設定でCNAMEレコードを追加

## 📁 ファイル構成

```
/
├── index.html          # メインHTMLファイル
├── styles.css          # CSSスタイルシート
├── app.js             # JavaScriptアプリケーション
├── code.js            # Google Apps Scriptコード
├── .nojekyll          # Jekyll無効化ファイル
├── _config.yml        # Jekyll設定ファイル
└── README.md          # このファイル
```

## ⚙️ 設定

### Google Apps Scriptの設定

1. `code.js`をGoogle Apps Scriptプロジェクトにコピー
2. 以下の設定を更新：
   - `CALENDAR_ID`: 予約管理用カレンダーのID
   - `SALON_NOTIFICATION_EMAIL`: サロン側の通知メールアドレス
   - `START_HOUR`, `END_HOUR`: 営業時間の設定

### メニュー設定

Googleスプレッドシートに「メニュー」シートを作成し、以下の列を設定：
- A列: コース名
- B列: 施術時間（分）
- C列: 価格（円）

## 🎨 カスタマイズ

### スタイルの変更

`styles.css`を編集してデザインをカスタマイズできます：

```css
:root {
    --primary-color: #007bff;    /* メインカラー */
    --secondary-color: #6c757d;  /* セカンダリカラー */
    --success-color: #28a745;    /* 成功色 */
    --danger-color: #dc3545;     /* エラー色 */
}
```

### 機能の追加

`app.js`を編集して機能を追加できます。主要な関数：

- `initializeApp()`: アプリ初期化
- `calculateAndShowAvailableTimes()`: 空き時間計算
- `showReservationModal()`: 予約モーダル表示

## 📱 対応ブラウザ

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔧 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **カレンダー**: FullCalendar.js
- **バックエンド**: Google Apps Script
- **データベース**: Googleスプレッドシート
- **メール**: Gmail API

## 📞 サポート

ご質問やサポートが必要な場合は、以下までお問い合わせください：

- メール: k.yonemoto@white-bloom.com
- Instagram: @carat._.oshinail

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**CARAT** - 美しいネイルで、あなたの魅力を引き出します 💅