# MORJIA ポートフォリオ（既存コンテンツ・猫付き）

## 2026-09-20 更新版

今回の変更と使い方は **CHANGES.md** を参照してください。HOME / WORKS / GALLERY / ABOUT / LINKS / CONTACT の6画面です。オンライン編集でWORKS・GALLERY・LINKSの追加・削除・並び替え、画像の登録に対応しています。以下に残る5ページ版・文章編集のみの説明は初期版のものです。変更点はCHANGES.mdが優先されます。

## オンライン編集を追加しました

サイト下部の「管理者ログイン」から文章・URLを編集する画面を追加しました。初回接続は **ONLINE-SETUP.md** を参照してください。接続が完了するまでは保存できません。接続後は公開データがSupabase側に保存され、以下のファイル編集方法は初期値・オフライン利用向けになります。管理者ログインと作品の簡易パスワードは別機能です。

HTML / CSS / JavaScriptだけで動くポートフォリオです。インストール・npm・ビルドは不要です。既存の prof サイトとは独立したフォルダです。5ページ構成のテンプレートに、手元に保存してあった既存サイトの透過バナー・プロフィール・2作品・動くモルジア猫を移しています。セブンスコードは含みません。編集室は移植せず、内容は `site-data.js` にまとめています。

## 猫とバナーの設定

`site-data.js` の `pet.enabled` を `false` にすると猫を非表示にできます。`pet.speed` は歩く速さ、`pet.clickMessages` はクリックしたときのセリフ、`pet.idleMessages` はひとりごとです。猫にはキーボードのTabでフォーカスし、Enterやスペースでも話しかけられます。

`pet.actions` の `sit`（座る）・`sleep`（寝る）・`stretch`（伸び）・`groom`（毛づくろい）・`peek`（端から覗く）をそれぞれ `true` / `false` で切り替えられます。OSで動きを減らす設定が有効な場合は猫を非表示にします。

猫の画像は `pet.sprite` / `pet.extraSprite` です。通常は変更不要で、元のスプライト形式と対応した画像が必要です。猫はページ切り替え中も1匹のまま動き続けます。追加動作素材の読み込みに失敗しても標準動作は続きます。

HOMEのバナーは `home.banner`、その下の一言は `home.tagline` です。バナーに箱・枠・背景色は付けていません。

## 最初の使い方

1. ZIPを解凍します。
2. `index.html` をダブルクリックしてブラウザで開きます。
3. `site-data.js` をメモ帳などのテキストエディターで開きます。
4. 内容を書き換え、UTF-8で保存します。
5. ブラウザを再読み込みします。

上の手順は未接続・オフライン時の編集方法です。オンライン接続後はサイト下部の「管理者ログイン」から文章やURLを変更できます。設定ファイルを使う場合はファイル名を `.txt` に変えないようにしてください。

## ファイルの役割

| ファイル | 役割 |
| --- | --- |
| `site-data.js` | サイト名、全ページの内容、作品、画像パス、リンク、案内文、パスワード設定 |
| `styles.css` | 上部の変数で色・フォント・カードの形を変更 |
| `index.html` | 共通のページ枠。通常は編集不要 |
| `app.js` | データからページを自動表示。通常は編集不要 |
| `auth.js` | 独立した簡易パスワード処理 |
| `assets/` | 自分で用意した画像などを入れる場所 |
| `.nojekyll` | GitHub Pagesでそのまま配信するためのファイル |

HOME / WORKS / ABOUT / LINKS / CONTACT の5画面があります。URL末尾が `#home`、`#works` などで切り替わります。作品詳細は `#work/作品ID`。リンクを直接開いたり再読み込みしても、GitHub Pagesで404にならない構成です。

## 設定を書くときの基本

```js
name: "MORJIA",              // 引用符の中を書き換える
biography: "1行目\n2行目",    // 改行は \n
image: "",                   // 空欄なら画像なし
skills: ["Unity", "Blender"], // 複数の項目はカンマで区切る
enabled: false,               // true / false には引用符を付けない
```

`//` から右はメモで、ページには出ません。半角の引用符・カンマ・括弧を残してください。文章中に半角の `"` を入れるときは `\"` と書きます。`<br>` などのHTMLは使わず、改行は `\n` を使ってください。

表示がおかしくなったら直前に編集した引用符やカンマを確認してください。編集前にファイルをコピーしておくと戻せます。

## サイト名を変える場所

`site-data.js` の `site.name` でヘッダーとブラウザのタイトルを変更します。トップの大きな文字は `home.title`、フッターは `site.footer`、ABOUTの名前は `about.name` です。別々の表記にできるよう分けています。

`site.description` はページの説明です。`site.logo` に画像パスを入れると、ヘッダーの文字の代わりにロゴを使います。ブラウザタブの小さなアイコンは `site.favicon` から差し替えできます。

HOMEの紹介文は `home.introduction`。不要な文章は `""` にして構いません。ナビゲーションの文字は `navigation`、空の状態のメッセージやボタン名は `ui` にあります。

## ABOUTを書き換える場所

`about.biography` に自己紹介を書きます。プロフィール画像は `about.image`、画像の説明は `about.imageAlt`、スキルは `about.skills` です。

```js
about: {
  name: "MORJIA",
  biography: "自己紹介の1行目。\n自己紹介の2行目。",
  image: "assets/profile.png",
  imageAlt: "プロフィール画像",
  skills: ["Unity", "JavaScript"]
},
```

## WORKSを追加する方法

最初は既存の2作品が入っています。`works` の配列に以下の形で作品を追加できます。0件にしたい場合は `works: []` に変更します。以下の例は説明用です。

```js
works: [
  {
    id: "my-first-work",
    title: "作品名",
    category: "GAME",
    status: "制作中",
    summary: "一覧カードに表示する短い説明。",
    description: "詳細ページに表示する説明。\n改行もできます。",
    thumbnail: "",        // 例: assets/my-first-work/cover.png
    screenshots: [],      // 下に書き方の例があります
    videoUrl: "",         // YouTubeなどの動画URL
    downloadUrl: "",      // 配布ページや配布ファイルのURL
    technologies: [],     // 例: ["Unity", "C#"]
    github: "",
    itch: "",
    steam: "",
    access: {
      details: false,     // true: 詳細画面を簡易ロックの対象にする
      download: false     // true: ダウンロードリンクを簡易ロックの対象にする
    }
  }
],
```

2作品目は `{ ... }` をコピーして、同じ配列の中にカンマで区切って追加します。

```js
works: [
  { id: "work-one", title: "1つ目の作品" },
  { id: "work-two", title: "2つ目の作品" }
],
```

最低限 `id` と `title` があれば表示できます。他の項目は任意です。`id` は重複しない半角英数字とハイフン（例: `puzzle-game`）にしてください。公開後にIDを変えると以前の詳細リンクは使えなくなります。

書いた順番でカードが並びます。並べ替えは `{ ... }` の順番を入れ替え、削除はそのオブジェクトを取り除きます。全作品を消したら `works: []` に戻します。カードと詳細画面は自動生成されるので、HTMLを増やす必要はありません。

`summary` は公開カードに表示されます。`description` が空の場合、詳細画面にも `summary` を表示します。動画は埋め込みではなく「動画を見る」リンクです。ダウンロードURLは普通のリンクとして開くため、配布元の設定によっては配布ページやファイルがブラウザ内に表示されます。

## 画像を変更する方法

1. 画像を `assets/` に入れます。整理用のサブフォルダも作れます。
2. 画像パスを `"assets/画像名.png"` のように設定します。
3. 画像ファイルと設定ファイルの両方をGitHubへアップロードします。

`C:\\Users\\...` のようなPC内のパスは使えません。先頭の `/` は付けず、`assets/...` と書くとGitHub Pagesのサブフォルダでも動きます。大文字・小文字・拡張子はファイルと一致させてください。画像を消したい場合はパスを `""` にします。画像を準備していない段階では空欄のままにしてください。

複数のスクリーンショットは次のように追加できます。`alt` は画像の説明、`caption` は画像の下に表示する文章です。

```js
screenshots: [
  { src: "assets/my-first-work/play.png", alt: "ゲームのプレイ画面", caption: "プレイ画面" },
  { src: "assets/my-first-work/menu.png", alt: "メニュー画面", caption: "" }
],
```

簡単に `screenshots: ["assets/shot1.png", "assets/shot2.png"]` とすることもできます。

## LINKSを変更する方法

`links.github`、`links.itch`、`links.x`、`links.steam` に自分のURLを入れます。空のリンクは表示しません。その他のリンクは `links.custom` に追加します。

```js
custom: [
  { label: "ブログ", url: "https://自分のブログのURL" }
]
```

作品ごとのGitHubなどは各作品の `github` / `itch` / `steam` に設定します。

## CONTACTを変更する方法

`contact.message` は案内文、`contact.email` は連絡先です。メールアドレスをクリックすると閲覧者のメールアプリが開きます。このサイト自体はメールを送信しません。

フォームを使う場合は、外部サービスで用意したフォームのURLを `contact.formUrl` に入れます。連絡先が空なら準備中の表示になります。設定したメールアドレスは公開されます。

## 色・フォント・カードの形を変える方法

`styles.css` の最上部 `:root { ... }` だけを編集します。

| 変数 | 変更対象 |
| --- | --- |
| `--background` | ページ背景 |
| `--surface` | カード背景 |
| `--text` | 本文の文字色 |
| `--muted` | 補足の文字色 |
| `--accent` | リンクとボタン |
| `--on-accent` | ボタンの文字色 |
| `--border` | 枠線 |
| `--font` | フォント |
| `--card-radius` | カードやボタンの角の丸み |
| `--card-border` | カードの枠線の太さ |
| `--card-shadow` | カードの影 |
| `--content-width` | ページ全体の最大幅 |

例えば `--background: #ffffff;` で白い背景、`--card-radius: 0px;` で四角いカードにできます。フォント例は `--font: "Yu Gothic", sans-serif;`。閲覧者のPCにないフォントは後ろの候補で表示されます。文字が背景に埋もれない色を選んでください。

## パスワードを変える方法

標準ではOFFです。`site-data.js` の `auth` を変更します。

```js
auth: {
  enabled: true,
  password: "自分で決めた文字列"
},
```

さらに対象作品の `access.details` または `access.download` を `true` にします。

| 設定 | 動作 |
| --- | --- |
| `auth.enabled: false` | 全作品の簡易ロックを無効化 |
| `access.details: true` | カードと作品名は公開し、詳細画面に入力を要求 |
| `access.download: true` | 詳細画面のダウンロードリンクの表示に入力を要求 |

パスワードが空のまま有効化された場合は解除できません。正しいパスワードで解除すると同じタブの他の対象作品も解除され、ページを再読み込みすると再びロックされます。パスワードをブラウザ保存する独自処理はありません。

**これは表示上の簡易ロックです。秘密の作品やファイルを守る機能ではありません。** GitHub PagesではJavaScript内のパスワード・作品本文・配布URLを閲覧できます。ファイルのURLへ直接アクセスしても取得でき、公開リポジトリの内容も閲覧できます。普段使っているパスワードは設定しないでください。

本当の認証を加える場合は、非公開データと配布ファイルを認証付きサーバーや外部サービス側へ移し、そのサーバーが権限を確認して配信する必要があります。`auth.js` の `SiteAuth.isAllowed()` / `SiteAuth.request()` をその認証に接続できますが、データ取得・ダウンロード側にもサーバーでの検証が必要です。パスワードをハッシュ化するだけではファイルは保護できません。

## GitHub Pagesへ公開する方法

既存の `prof` を触らないために、**別の新規リポジトリ**を使います。例: `morjia-portfolio`。

1. GitHubで新規リポジトリを作ります。無料プランで公開する場合はPublicを選びます。
2. このフォルダの**中身**をそのリポジトリへアップロードします。ZIPのまま置かず、`index.html` がリポジトリ直下にある状態にします。`assets` 内の自分の画像も忘れずに入れます。
3. `Commit changes` で保存します。
4. リポジトリの `Settings` → `Pages` を開きます。
5. `Build and deployment` の `Source` を `Deploy from a branch` にします。
6. `Branch` に `main`、フォルダに `/ (root)` を選び、`Save` を押します。
7. 公開処理が終わるとPages設定にサイトURLが表示されます。

リポジトリが `morjia-tech/morjia-portfolio` なら、通常は `https://morjia-tech.github.io/morjia-portfolio/` になります。公開処理に数分、最大10分ほどかかる場合があります。Actionsタブでも進捗を確認できます。

更新は変更したファイルと追加した画像を同じ場所へ上書きし、Commitします。ファイル名・画像名を変えた場合は設定内のパスも変更します。反映後に古い内容が見えるときは `Ctrl + F5` で再読み込みします。

公式手順: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 空欄と未設定の扱い

- WORKSが0件でも一覧は空の状態として成立します。
- 画像・動画・ダウンロード・SNSのURLが空なら、その要素は表示しません。
- 存在しない作品IDでは「ページが見つかりません」と戻るリンクを表示します。
- リンクはHTTP(S)または相対パスを使用してください。
- 他サイト由来のHTMLやスクリプトは本文として実行しません。
- 秘密のキー、個人情報、非公開ファイルをアップロードしないでください。
