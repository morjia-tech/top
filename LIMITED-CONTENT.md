# 限定コンテンツ機能

HOME・WORKS・GALLERY・ABOUT・LINKS・CONTACTは公開のままです。
限定項目を開くときだけ共通パスワードが必要になります。管理者ログインとは独立しています。

このフォルダはGitHubアップロード用です。別フォルダの「はじめに.md」に従ってSupabaseの設定を済ませてください。
Edge Function名は `morjia-members` です。サイト全体ロック用の `morjia-gate` は使用しません。

今のサイト内編集フォームは**公開用**です。限定の本文・画像・実ファイルを既存の作品説明や画像欄へ入れないでください。
限定の登録はSupabaseの `portfolio_private_content` と非公開Storage `morjia-private/members/` で行います。

この更新では、`members-auth.js` と `members-content.js` を追加し、`app.js`・`index.html`・`styles.css` に表示を追加しています。
管理者の認証・保存、通常のデータ形式、猫の画像・動作は変更していません。
