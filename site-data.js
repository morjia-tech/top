/* 内容を変えるときは、基本的にこのファイルだけを編集します。
 * "" = 未入力。画像やURLが空なら、その項目は表示しません。
 * 文字列は引用符で囲み、項目の間にはカンマを入れてください。
 * 作品追加のコピー用ひな形は README.md にあります。
 */
window.SITE_DATA = {
  site: {
    name: "MORJIA",
    description: "",          // 検索エンジン向けの説明
    logo: "",                 // 例: assets/logo.png。空ならサイト名を表示
    favicon: "",              // 空なら初期のMアイコン
    footer: "MORJIA"
  },
  navigation: {
    home: "HOME", works: "WORKS", about: "ABOUT", links: "LINKS", contact: "CONTACT"
  },
  home: {
    banner: "assets/morjia_banner_transparent.png",
    bannerAlt: "MORJIA モルジア",
    tagline: "なんかいろいろ作ってます。",
    title: "作ってる途中も、\nちょっとだけ見せる。",
    introduction: "ゲーム、ツール、物語、そのほか思いついたもの。\n完成したものも、まだ途中のものも、ゆるく置いていきます。",
    image: "",
    imageAlt: "",
    worksButton: "WORKSを見る"
  },
  about: {
    name: "MORJIA",
    biography: "ゲームを作ったり、ツールを作ったり、物語を考えたりしています。その時おもしろそうだと思ったものを、そのまま作り始めがちです。\n\nこのサイトもたぶん、少しずつ変わります。",
    image: "assets/morjia_icon.png",
    imageAlt: "",
    skills: []                 // 例: ["Unity", "JavaScript"]
  },
  // 既存の2作品。すべて消して works: [] にしても表示は崩れません。
  works: [
    {
      id: "sushi-pizza-cake", title: "寿司・ピザ・ケーキ", category: "GAME", status: "制作中",
      summary: "食材を落として料理を作るゲーム。まだまだ改造中。",
      description: "", thumbnail: "", screenshots: [], videoUrl: "", downloadUrl: "",
      technologies: [], github: "", itch: "", steam: "", access: { details: false, download: false }
    },
    {
      id: "miniv-editor", title: "MiniV Editor", category: "TOOL", status: "制作中",
      summary: "表情やアニメ素材を触って遊べる、自作の小さなエディター。",
      description: "", thumbnail: "", screenshots: [], videoUrl: "", downloadUrl: "",
      technologies: ["Python", "Tkinter"], github: "", itch: "", steam: "", access: { details: false, download: false }
    }
  ],
  pet: {
    enabled: true,
    sprite: "assets/morjia_spritesheet.webp",
    extraSprite: "assets/morjia_extra_actions.webp",
    label: "モルジアくんに話しかける",
    speed: 54,
    actions: { sit: true, sleep: true, stretch: true, groom: true, peek: true },
    clickMessages: ["にゃ。", "どうしたの。", "見てるよ。"],
    idleMessages: ["ふーん、そういうことね。"]
  },
  links: {
    github: "",
    itch: "",
    x: "",
    steam: "",
    // 独自リンクの追加例: [{ label: "ブログ", url: "https://example.com" }]
    custom: []
  },
  contact: {
    message: "",
    email: "",
    formUrl: ""               // 外部のお問い合わせフォームのURL（任意）
  },
  auth: {
    enabled: false,             // trueで簡易パスワードを有効化
    password: "",             // 有効化する前に設定してください
    // 注意: これは画面上の簡易ロックです。秘密を守る認証ではありません。
    // GitHub Pagesでは、この値・作品データ・ファイルは公開されます。
    // 作品ごとの access.details / access.download も true にしてください。
  },
  // 表示用の短い案内文やボタン名も、ここから変更できます。
  ui: {
    emptyWorks: "公開中の作品はありません。",
    emptyAbout: "プロフィールは準備中です。",
    emptyLinks: "リンクは準備中です。",
    emptyContact: "お問い合わせ先は準備中です。",
    backToWorks: "WORKSに戻る",
    detail: "作品詳細",
    technologies: "使用技術",
    screenshots: "スクリーンショット",
    video: "動画を見る",
    download: "ダウンロード",
    form: "お問い合わせフォーム",
    github: "GitHub", itch: "itch.io", x: "X", steam: "Steam",
    locked: "この作品の詳細にはパスワードが必要です。",
    unlock: "パスワードを入力",
    passwordLabel: "パスワード",
    authTitle: "簡易パスワード",
    authSubmit: "開く",
    cancel: "キャンセル",
    authError: "パスワードが違います。",
    authUnconfigured: "パスワードが設定されていません。",
    notFound: "ページが見つかりません。",
    homeLink: "HOMEに戻る",
    imageUnavailable: "画像を表示できません。",
    skip: "本文へ移動",
    navigationLabel: "メインナビゲーション",
    noTitle: "名称未設定"
  }
};
