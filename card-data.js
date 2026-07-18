(() => {
const sourceNotes = {
  jlpt: "JLPT 官方不发布固定的词汇/汉字/语法项目清单；本项目的语法覆盖按官方等级说明、题型说明、样题/官方问题集说明，以及常见 N5/N4 教学清单整理。",
  kana: "假名、长音、促音、拨音、外来语小写假名和罗马音按现代常用学习写法整理；罗马音以护照/学习场景常见 Hepburn 风格为主。",
  vocabulary: "N5/N4 标签是项目维护的教学分级，不是官方固定词表。规范词形、原始词形、变体和人工校订说明保存在随项目版本控制的数据文件中。",
  examples: "词汇例句是为本项目编写和校订的短学习句，不作为语料库引文；无法可靠生成纯拉丁字母罗马音时，界面会明确隐藏该行而不显示混合脚本结果。",
};
const kanaRows = [
  [
    "あ",
    "ア",
    "a"
  ],
  [
    "い",
    "イ",
    "i"
  ],
  [
    "う",
    "ウ",
    "u"
  ],
  [
    "え",
    "エ",
    "e"
  ],
  [
    "お",
    "オ",
    "o"
  ],
  [
    "か",
    "カ",
    "ka"
  ],
  [
    "き",
    "キ",
    "ki"
  ],
  [
    "く",
    "ク",
    "ku"
  ],
  [
    "け",
    "ケ",
    "ke"
  ],
  [
    "こ",
    "コ",
    "ko"
  ],
  [
    "さ",
    "サ",
    "sa"
  ],
  [
    "し",
    "シ",
    "shi"
  ],
  [
    "す",
    "ス",
    "su"
  ],
  [
    "せ",
    "セ",
    "se"
  ],
  [
    "そ",
    "ソ",
    "so"
  ],
  [
    "た",
    "タ",
    "ta"
  ],
  [
    "ち",
    "チ",
    "chi"
  ],
  [
    "つ",
    "ツ",
    "tsu"
  ],
  [
    "て",
    "テ",
    "te"
  ],
  [
    "と",
    "ト",
    "to"
  ],
  [
    "な",
    "ナ",
    "na"
  ],
  [
    "に",
    "ニ",
    "ni"
  ],
  [
    "ぬ",
    "ヌ",
    "nu"
  ],
  [
    "ね",
    "ネ",
    "ne"
  ],
  [
    "の",
    "ノ",
    "no"
  ],
  [
    "は",
    "ハ",
    "ha"
  ],
  [
    "ひ",
    "ヒ",
    "hi"
  ],
  [
    "ふ",
    "フ",
    "fu"
  ],
  [
    "へ",
    "ヘ",
    "he"
  ],
  [
    "ほ",
    "ホ",
    "ho"
  ],
  [
    "ま",
    "マ",
    "ma"
  ],
  [
    "み",
    "ミ",
    "mi"
  ],
  [
    "む",
    "ム",
    "mu"
  ],
  [
    "め",
    "メ",
    "me"
  ],
  [
    "も",
    "モ",
    "mo"
  ],
  [
    "や",
    "ヤ",
    "ya"
  ],
  [
    "ゆ",
    "ユ",
    "yu"
  ],
  [
    "よ",
    "ヨ",
    "yo"
  ],
  [
    "ら",
    "ラ",
    "ra"
  ],
  [
    "り",
    "リ",
    "ri"
  ],
  [
    "る",
    "ル",
    "ru"
  ],
  [
    "れ",
    "レ",
    "re"
  ],
  [
    "ろ",
    "ロ",
    "ro"
  ],
  [
    "わ",
    "ワ",
    "wa"
  ],
  [
    "を",
    "ヲ",
    "wo"
  ],
  [
    "ん",
    "ン",
    "n"
  ],
  [
    "が",
    "ガ",
    "ga"
  ],
  [
    "ぎ",
    "ギ",
    "gi"
  ],
  [
    "ぐ",
    "グ",
    "gu"
  ],
  [
    "げ",
    "ゲ",
    "ge"
  ],
  [
    "ご",
    "ゴ",
    "go"
  ],
  [
    "ざ",
    "ザ",
    "za"
  ],
  [
    "じ",
    "ジ",
    "ji"
  ],
  [
    "ず",
    "ズ",
    "zu"
  ],
  [
    "ぜ",
    "ゼ",
    "ze"
  ],
  [
    "ぞ",
    "ゾ",
    "zo"
  ],
  [
    "だ",
    "ダ",
    "da"
  ],
  [
    "ぢ",
    "ヂ",
    "ji"
  ],
  [
    "づ",
    "ヅ",
    "zu"
  ],
  [
    "で",
    "デ",
    "de"
  ],
  [
    "ど",
    "ド",
    "do"
  ],
  [
    "ば",
    "バ",
    "ba"
  ],
  [
    "び",
    "ビ",
    "bi"
  ],
  [
    "ぶ",
    "ブ",
    "bu"
  ],
  [
    "べ",
    "ベ",
    "be"
  ],
  [
    "ぼ",
    "ボ",
    "bo"
  ],
  [
    "ぱ",
    "パ",
    "pa"
  ],
  [
    "ぴ",
    "ピ",
    "pi"
  ],
  [
    "ぷ",
    "プ",
    "pu"
  ],
  [
    "ぺ",
    "ペ",
    "pe"
  ],
  [
    "ぽ",
    "ポ",
    "po"
  ],
  [
    "きゃ",
    "キャ",
    "kya"
  ],
  [
    "きゅ",
    "キュ",
    "kyu"
  ],
  [
    "きょ",
    "キョ",
    "kyo"
  ],
  [
    "ぎゃ",
    "ギャ",
    "gya"
  ],
  [
    "ぎゅ",
    "ギュ",
    "gyu"
  ],
  [
    "ぎょ",
    "ギョ",
    "gyo"
  ],
  [
    "しゃ",
    "シャ",
    "sha"
  ],
  [
    "しゅ",
    "シュ",
    "shu"
  ],
  [
    "しょ",
    "ショ",
    "sho"
  ],
  [
    "じゃ",
    "ジャ",
    "ja"
  ],
  [
    "じゅ",
    "ジュ",
    "ju"
  ],
  [
    "じょ",
    "ジョ",
    "jo"
  ],
  [
    "ちゃ",
    "チャ",
    "cha"
  ],
  [
    "ちゅ",
    "チュ",
    "chu"
  ],
  [
    "ちょ",
    "チョ",
    "cho"
  ],
  [
    "にゃ",
    "ニャ",
    "nya"
  ],
  [
    "にゅ",
    "ニュ",
    "nyu"
  ],
  [
    "にょ",
    "ニョ",
    "nyo"
  ],
  [
    "ひゃ",
    "ヒャ",
    "hya"
  ],
  [
    "ひゅ",
    "ヒュ",
    "hyu"
  ],
  [
    "ひょ",
    "ヒョ",
    "hyo"
  ],
  [
    "びゃ",
    "ビャ",
    "bya"
  ],
  [
    "びゅ",
    "ビュ",
    "byu"
  ],
  [
    "びょ",
    "ビョ",
    "byo"
  ],
  [
    "ぴゃ",
    "ピャ",
    "pya"
  ],
  [
    "ぴゅ",
    "ピュ",
    "pyu"
  ],
  [
    "ぴょ",
    "ピョ",
    "pyo"
  ],
  [
    "みゃ",
    "ミャ",
    "mya"
  ],
  [
    "みゅ",
    "ミュ",
    "myu"
  ],
  [
    "みょ",
    "ミョ",
    "myo"
  ],
  [
    "りゃ",
    "リャ",
    "rya"
  ],
  [
    "りゅ",
    "リュ",
    "ryu"
  ],
  [
    "りょ",
    "リョ",
    "ryo"
  ]
];

const n5Entries = window.AYAYA_N5_CODEX_VOCAB?.entries || [];
const n5Words = n5Entries.map((entry) => [
  entry.id,
  entry.headword,
  entry.reading,
  entry.romaji,
  entry.meaning_zh,
  entry.examples?.[0]?.ja || "",
  entry.examples?.[0]?.zh || "",
  entry.examples || [],
  entry,
]);
const n4Entries = window.AYAYA_N4_CODEX_VOCAB?.entries || [];
const n4Words = n4Entries.map((entry) => [
  entry.id,
  entry.headword,
  entry.reading,
  entry.romaji,
  entry.meaning_zh,
  entry.examples?.[0]?.ja || "",
  entry.examples?.[0]?.zh || "",
  entry.examples || [],
  entry,
]);
const grammarEntries = window.AYAYA_GRAMMAR_DATA?.entries || [];

const specialRows = [
  [
    "长音",
    "おかあさん",
    "okaasan / おかあさん",
    "あ段长音：ああ。意思：妈妈。"
  ],
  [
    "长音",
    "おばあさん",
    "obaasan / おばあさん",
    "あ段长音：ああ。意思：奶奶、老奶奶。"
  ],
  [
    "长音",
    "おにいさん",
    "oniisan / おにいさん",
    "い段长音：いい。意思：哥哥。"
  ],
  [
    "长音",
    "おじいさん",
    "ojiisan / おじいさん",
    "い段长音：いい。意思：爷爷、老爷爷。"
  ],
  [
    "长音",
    "くうき",
    "kuuki / くうき",
    "う段长音：うう。意思：空气。"
  ],
  [
    "长音",
    "すうじ",
    "suuji / すうじ",
    "う段长音：うう。意思：数字。"
  ],
  [
    "长音",
    "せんせい",
    "sensei / せんせい",
    "え段长音常写作：えい。意思：老师。"
  ],
  [
    "长音",
    "えいが",
    "eiga / えいが",
    "え段长音常写作：えい。意思：电影。"
  ],
  [
    "长音",
    "おねえさん",
    "oneesan / おねえさん",
    "え段长音也可写作：ええ。意思：姐姐。"
  ],
  [
    "长音",
    "こうこう",
    "koukou / こうこう",
    "お段长音常写作：おう。意思：高中。"
  ],
  [
    "长音",
    "おとうさん",
    "otousan / おとうさん",
    "お段长音常写作：おう。意思：爸爸。"
  ],
  [
    "长音",
    "おおきい",
    "ookii / おおきい",
    "お段长音也可写作：おお。意思：大的。"
  ],
  [
    "长音",
    "スーパー",
    "suupaa / スーパー",
    "片假名长音：ー。意思：超市。"
  ],
  [
    "长音",
    "タクシー",
    "takushii / タクシー",
    "片假名长音：ー。意思：出租车。"
  ],
  [
    "长音",
    "コーヒー",
    "koohii / コーヒー",
    "片假名长音：ー。意思：咖啡。"
  ],
  [
    "促音",
    "がっこう",
    "gakkou / がっこう",
    "促音：っ + k。意思：学校。"
  ],
  [
    "促音",
    "ざっし",
    "zasshi / ざっし",
    "促音：っ + s。意思：杂志。"
  ],
  [
    "促音",
    "きって",
    "kitte / きって",
    "促音：っ + t。意思：邮票。"
  ],
  [
    "促音",
    "まって",
    "matte / まって",
    "促音：っ + t。意思：等一下。"
  ],
  [
    "促音",
    "いっぱい",
    "ippai / いっぱい",
    "促音：っ + p。意思：一杯、很多。"
  ],
  [
    "促音",
    "きっぷ",
    "kippu / きっぷ",
    "促音：っ + p。意思：票。"
  ],
  [
    "促音",
    "こっち",
    "kocchi / こっち",
    "促音：っ + ch。意思：这边。"
  ],
  [
    "促音",
    "バッグ",
    "baggu / バッグ",
    "片假名促音：ッ + g。意思：包。"
  ],
  [
    "促音",
    "ベッド",
    "beddo / ベッド",
    "片假名促音：ッ + d。意思：床。"
  ],
  [
    "促音",
    "カップ",
    "kappu / カップ",
    "片假名促音：ッ + p。意思：杯子。"
  ],
  [
    "拨音",
    "ほん",
    "hon / ほん",
    "ん在词尾通常记作 n。意思：书。"
  ],
  [
    "拨音",
    "しんぶん",
    "shinbun / しんぶん",
    "ん在 b/p/m 前发音接近 m，但罗马音学习中常仍写 n。意思：报纸。"
  ],
  [
    "拨音",
    "さんぽ",
    "sanpo / さんぽ",
    "ん + p 时注意鼻音过渡。意思：散步。"
  ],
  [
    "助词读音",
    "わたしは",
    "watashi wa / わたしは",
    "助词「は」读作 wa，不读 ha。意思：我是/我……。"
  ],
  [
    "助词读音",
    "えきへ",
    "eki e / えきへ",
    "助词「へ」读作 e，不读 he。意思：去车站。"
  ],
  [
    "助词读音",
    "ほんを",
    "hon o / ほんを",
    "助词「を」现代标准发音通常为 o。意思：书（宾语）。"
  ],
  [
    "小写假名",
    "ファ",
    "fa / ファ",
    "外来语小写母音：ァ。例：ファイル。"
  ],
  [
    "小写假名",
    "フィ",
    "fi / フィ",
    "外来语小写母音：ィ。例：フィルム。"
  ],
  [
    "小写假名",
    "フェ",
    "fe / フェ",
    "外来语小写母音：ェ。例：フェリー。"
  ],
  [
    "小写假名",
    "フォ",
    "fo / フォ",
    "外来语小写母音：ォ。例：フォーク。"
  ],
  [
    "小写假名",
    "シェ",
    "she / シェ",
    "外来语拗音：シェ。例：シェア。"
  ],
  [
    "小写假名",
    "ジェ",
    "je / ジェ",
    "外来语拗音：ジェ。例：ジェット。"
  ],
  [
    "小写假名",
    "チェ",
    "che / チェ",
    "外来语拗音：チェ。例：チェック。"
  ],
  [
    "小写假名",
    "ティ",
    "ti / ティ",
    "外来语小写ィ。例：パーティー。"
  ],
  [
    "小写假名",
    "ディ",
    "di / ディ",
    "外来语小写ィ。例：ディナー。"
  ],
  [
    "小写假名",
    "トゥ",
    "tu / トゥ",
    "外来语小写ゥ。例：トゥール。"
  ],
  [
    "小写假名",
    "ドゥ",
    "du / ドゥ",
    "外来语小写ゥ。例：ドゥ。"
  ],
  [
    "小写假名",
    "デュ",
    "dyu / デュ",
    "外来语小写ュ。例：デュエット。"
  ],
  [
    "小写假名",
    "ウィ",
    "wi / ウィ",
    "外来语小写ィ。例：ウィーン。"
  ],
  [
    "小写假名",
    "ウェ",
    "we / ウェ",
    "外来语小写ェ。例：ウェブ。"
  ],
  [
    "小写假名",
    "ウォ",
    "wo / ウォ",
    "外来语小写ォ。例：ウォーター。"
  ],
  [
    "小写假名",
    "ツァ",
    "tsa / ツァ",
    "外来语小写ァ。例：モーツァルト。"
  ],
  [
    "小写假名",
    "ツィ",
    "tsi / ツィ",
    "外来语小写ィ。"
  ],
  [
    "小写假名",
    "ツェ",
    "tse / ツェ",
    "外来语小写ェ。"
  ],
  [
    "小写假名",
    "ツォ",
    "tso / ツォ",
    "外来语小写ォ。"
  ],
  [
    "小写假名",
    "ヴァ",
    "va / ヴァ",
    "外来语有时用ヴ表示 v 音。"
  ],
  [
    "小写假名",
    "ヴィ",
    "vi / ヴィ",
    "外来语有时用ヴィ表示 vi。"
  ],
  [
    "小写假名",
    "ヴ",
    "vu / ヴ",
    "外来语有时用ヴ表示 vu/v。"
  ],
  [
    "小写假名",
    "ヴェ",
    "ve / ヴェ",
    "外来语有时用ヴェ表示 ve。"
  ],
  [
    "小写假名",
    "ヴォ",
    "vo / ヴォ",
    "外来语有时用ヴォ表示 vo。"
  ]
].map(([type, prompt, answer, meta]) => ({
  answer,
  meta,
  prompt,
  speech: prompt,
  type,
}));

const furiganaEntries = [
  [
    "日本語能力試験",
    "にほんごのうりょくしけん"
  ],
  [
    "電話番号",
    "でんわばんごう"
  ],
  [
    "お客さん",
    "おきゃくさん"
  ],
  [
    "日本語",
    "にほんご"
  ],
  [
    "中国語",
    "ちゅうごくご"
  ],
  [
    "朝ご飯",
    "あさごはん"
  ],
  [
    "昼ご飯",
    "ひるごはん"
  ],
  [
    "晩ご飯",
    "ばんごはん"
  ],
  [
    "食べ物",
    "たべもの"
  ],
  [
    "飲み物",
    "のみもの"
  ],
  [
    "会社員",
    "かいしゃいん"
  ],
  [
    "郵便局",
    "ゆうびんきょく"
  ],
  [
    "図書館",
    "としょかん"
  ],
  [
    "映画館",
    "えいがかん"
  ],
  [
    "美術館",
    "びじゅつかん"
  ],
  [
    "住所録",
    "じゅうしょろく"
  ],
  [
    "大丈夫",
    "だいじょうぶ"
  ],
  [
    "研究室",
    "けんきゅうしつ"
  ],
  [
    "お客様",
    "おきゃくさま"
  ],
  [
    "夏休み",
    "なつやすみ"
  ],
  [
    "冬休み",
    "ふゆやすみ"
  ],
  [
    "春休み",
    "はるやすみ"
  ],
  [
    "昼休み",
    "ひるやすみ"
  ],
  [
    "午前中",
    "ごぜんちゅう"
  ],
  [
    "一日中",
    "いちにちじゅう"
  ],
  [
    "甘い物",
    "あまいもの"
  ],
  [
    "辛い物",
    "からいもの"
  ],
  [
    "富士山",
    "ふじさん"
  ],
  [
    "北海道",
    "ほっかいどう"
  ],
  [
    "自転車",
    "じてんしゃ"
  ],
  [
    "飛行機",
    "ひこうき"
  ],
  [
    "地下鉄",
    "ちかてつ"
  ],
  [
    "自動車",
    "じどうしゃ"
  ],
  [
    "自動詞",
    "じどうし"
  ],
  [
    "他動詞",
    "たどうし"
  ],
  [
    "受身形",
    "うけみけい"
  ],
  [
    "使役形",
    "しえきけい"
  ],
  [
    "可能形",
    "かのうけい"
  ],
  [
    "意向形",
    "いこうけい"
  ],
  [
    "辞書形",
    "じしょけい"
  ],
  [
    "普通形",
    "ふつうけい"
  ],
  [
    "丁寧形",
    "ていねいけい"
  ],
  [
    "否定形",
    "ひていけい"
  ],
  [
    "条件形",
    "じょうけんけい"
  ],
  [
    "間違い",
    "まちがい"
  ],
  [
    "手続き",
    "てつづき"
  ],
  [
    "出かけ",
    "でかけ"
  ],
  [
    "英語",
    "えいご"
  ],
  [
    "田中",
    "たなか"
  ],
  [
    "山田",
    "やまだ"
  ],
  [
    "名前",
    "なまえ"
  ],
  [
    "映画",
    "えいが"
  ],
  [
    "四人",
    "よにん"
  ],
  [
    "一人",
    "ひとり"
  ],
  [
    "二人",
    "ふたり"
  ],
  [
    "公園",
    "こうえん"
  ],
  [
    "料理",
    "りょうり"
  ],
  [
    "上手",
    "じょうず"
  ],
  [
    "下手",
    "へた"
  ],
  [
    "お金",
    "おかね"
  ],
  [
    "九時",
    "くじ"
  ],
  [
    "毎日",
    "まいにち"
  ],
  [
    "毎朝",
    "まいあさ"
  ],
  [
    "毎晩",
    "まいばん"
  ],
  [
    "毎週",
    "まいしゅう"
  ],
  [
    "六時",
    "ろくじ"
  ],
  [
    "音楽",
    "おんがく"
  ],
  [
    "何時",
    "なんじ"
  ],
  [
    "切符",
    "きっぷ"
  ],
  [
    "切手",
    "きって"
  ],
  [
    "手紙",
    "てがみ"
  ],
  [
    "旅行",
    "りょこう"
  ],
  [
    "問題",
    "もんだい"
  ],
  [
    "質問",
    "しつもん"
  ],
  [
    "天気",
    "てんき"
  ],
  [
    "気分",
    "きぶん"
  ],
  [
    "元気",
    "げんき"
  ],
  [
    "銀行",
    "ぎんこう"
  ],
  [
    "病院",
    "びょういん"
  ],
  [
    "学校",
    "がっこう"
  ],
  [
    "先生",
    "せんせい"
  ],
  [
    "学生",
    "がくせい"
  ],
  [
    "生徒",
    "せいと"
  ],
  [
    "友達",
    "ともだち"
  ],
  [
    "家族",
    "かぞく"
  ],
  [
    "子供",
    "こども"
  ],
  [
    "日本",
    "にほん"
  ],
  [
    "中国",
    "ちゅうごく"
  ],
  [
    "会社",
    "かいしゃ"
  ],
  [
    "部屋",
    "へや"
  ],
  [
    "新聞",
    "しんぶん"
  ],
  [
    "雑誌",
    "ざっし"
  ],
  [
    "野菜",
    "やさい"
  ],
  [
    "果物",
    "くだもの"
  ],
  [
    "今日",
    "きょう"
  ],
  [
    "明日",
    "あした"
  ],
  [
    "昨日",
    "きのう"
  ],
  [
    "時間",
    "じかん"
  ],
  [
    "勉強",
    "べんきょう"
  ],
  [
    "復習",
    "ふくしゅう"
  ],
  [
    "練習",
    "れんしゅう"
  ],
  [
    "説明",
    "せつめい"
  ],
  [
    "確認",
    "かくにん"
  ],
  [
    "連絡",
    "れんらく"
  ],
  [
    "予約",
    "よやく"
  ],
  [
    "準備",
    "じゅんび"
  ],
  [
    "会議",
    "かいぎ"
  ],
  [
    "受付",
    "うけつけ"
  ],
  [
    "入口",
    "いりぐち"
  ],
  [
    "出口",
    "でぐち"
  ],
  [
    "右側",
    "みぎがわ"
  ],
  [
    "左側",
    "ひだりがわ"
  ],
  [
    "場合",
    "ばあい"
  ],
  [
    "必要",
    "ひつよう"
  ],
  [
    "予定",
    "よてい"
  ],
  [
    "約束",
    "やくそく"
  ],
  [
    "規則",
    "きそく"
  ],
  [
    "資料",
    "しりょう"
  ],
  [
    "書類",
    "しょるい"
  ],
  [
    "料金",
    "りょうきん"
  ],
  [
    "現金",
    "げんきん"
  ],
  [
    "返事",
    "へんじ"
  ],
  [
    "電話",
    "でんわ"
  ],
  [
    "番号",
    "ばんごう"
  ],
  [
    "住所",
    "じゅうしょ"
  ],
  [
    "大切",
    "たいせつ"
  ],
  [
    "大変",
    "たいへん"
  ],
  [
    "簡単",
    "かんたん"
  ],
  [
    "静か",
    "しずか"
  ],
  [
    "親切",
    "しんせつ"
  ],
  [
    "便利",
    "べんり"
  ],
  [
    "有名",
    "ゆうめい"
  ],
  [
    "安全",
    "あんぜん"
  ],
  [
    "危険",
    "きけん"
  ],
  [
    "失敗",
    "しっぱい"
  ],
  [
    "努力",
    "どりょく"
  ],
  [
    "成功",
    "せいこう"
  ],
  [
    "合格",
    "ごうかく"
  ],
  [
    "試験",
    "しけん"
  ],
  [
    "宿題",
    "しゅくだい"
  ],
  [
    "授業",
    "じゅぎょう"
  ],
  [
    "教室",
    "きょうしつ"
  ],
  [
    "社長",
    "しゃちょう"
  ],
  [
    "部長",
    "ぶちょう"
  ],
  [
    "店員",
    "てんいん"
  ],
  [
    "休み",
    "やすみ"
  ],
  [
    "今朝",
    "けさ"
  ],
  [
    "今晩",
    "こんばん"
  ],
  [
    "今週",
    "こんしゅう"
  ],
  [
    "今月",
    "こんげつ"
  ],
  [
    "今年",
    "ことし"
  ],
  [
    "来週",
    "らいしゅう"
  ],
  [
    "来月",
    "らいげつ"
  ],
  [
    "来年",
    "らいねん"
  ],
  [
    "先週",
    "せんしゅう"
  ],
  [
    "先月",
    "せんげつ"
  ],
  [
    "去年",
    "きょねん"
  ],
  [
    "夕方",
    "ゆうがた"
  ],
  [
    "午前",
    "ごぜん"
  ],
  [
    "午後",
    "ごご"
  ],
  [
    "夜中",
    "よなか"
  ],
  [
    "途中",
    "とちゅう"
  ],
  [
    "食事",
    "しょくじ"
  ],
  [
    "外食",
    "がいしょく"
  ],
  [
    "和食",
    "わしょく"
  ],
  [
    "洋食",
    "ようしょく"
  ],
  [
    "味噌",
    "みそ"
  ],
  [
    "大豆",
    "だいず"
  ],
  [
    "葡萄",
    "ぶどう"
  ],
  [
    "砂糖",
    "さとう"
  ],
  [
    "牛乳",
    "ぎゅうにゅう"
  ],
  [
    "京都",
    "きょうと"
  ],
  [
    "大阪",
    "おおさか"
  ],
  [
    "東京",
    "とうきょう"
  ],
  [
    "奈良",
    "なら"
  ],
  [
    "神社",
    "じんじゃ"
  ],
  [
    "本屋",
    "ほんや"
  ],
  [
    "花屋",
    "はなや"
  ],
  [
    "肉屋",
    "にくや"
  ],
  [
    "場所",
    "ばしょ"
  ],
  [
    "道路",
    "どうろ"
  ],
  [
    "階段",
    "かいだん"
  ],
  [
    "財布",
    "さいふ"
  ],
  [
    "荷物",
    "にもつ"
  ],
  [
    "上着",
    "うわぎ"
  ],
  [
    "帽子",
    "ぼうし"
  ],
  [
    "眼鏡",
    "めがね"
  ],
  [
    "時計",
    "とけい"
  ],
  [
    "電車",
    "でんしゃ"
  ],
  [
    "後ろ",
    "うしろ"
  ],
  [
    "近く",
    "ちかく"
  ],
  [
    "遠く",
    "とおく"
  ],
  [
    "椅子",
    "いす"
  ],
  [
    "本棚",
    "ほんだな"
  ],
  [
    "お腹",
    "おなか"
  ],
  [
    "漢字",
    "かんじ"
  ],
  [
    "言葉",
    "ことば"
  ],
  [
    "意味",
    "いみ"
  ],
  [
    "文法",
    "ぶんぽう"
  ],
  [
    "発音",
    "はつおん"
  ],
  [
    "読解",
    "どっかい"
  ],
  [
    "聴解",
    "ちょうかい"
  ],
  [
    "答え",
    "こたえ"
  ],
  [
    "理由",
    "りゆう"
  ],
  [
    "結果",
    "けっか"
  ],
  [
    "経験",
    "けいけん"
  ],
  [
    "習慣",
    "しゅうかん"
  ],
  [
    "生活",
    "せいかつ"
  ],
  [
    "仕事",
    "しごと"
  ],
  [
    "作文",
    "さくぶん"
  ],
  [
    "招待",
    "しょうたい"
  ],
  [
    "紹介",
    "しょうかい"
  ],
  [
    "降り",
    "おり"
  ],
  [
    "卵",
    "たまご"
  ],
  [
    "寺",
    "てら"
  ],
  [
    "駅",
    "えき"
  ],
  [
    "店",
    "みせ"
  ],
  [
    "道",
    "みち"
  ],
  [
    "橋",
    "はし"
  ],
  [
    "川",
    "かわ"
  ],
  [
    "海",
    "うみ"
  ],
  [
    "山",
    "やま"
  ],
  [
    "空",
    "そら"
  ],
  [
    "雨",
    "あめ"
  ],
  [
    "雪",
    "ゆき"
  ],
  [
    "風",
    "かぜ"
  ],
  [
    "桜",
    "さくら"
  ],
  [
    "花",
    "はな"
  ],
  [
    "鳥",
    "とり"
  ],
  [
    "犬",
    "いぬ"
  ],
  [
    "猫",
    "ねこ"
  ],
  [
    "鍵",
    "かぎ"
  ],
  [
    "靴",
    "くつ"
  ],
  [
    "服",
    "ふく"
  ],
  [
    "私",
    "わたし"
  ],
  [
    "人",
    "ひと"
  ],
  [
    "父",
    "ちち"
  ],
  [
    "母",
    "はは"
  ],
  [
    "兄",
    "あに"
  ],
  [
    "姉",
    "あね"
  ],
  [
    "弟",
    "おとうと"
  ],
  [
    "妹",
    "いもうと"
  ],
  [
    "家",
    "いえ"
  ],
  [
    "机",
    "つくえ"
  ],
  [
    "上",
    "うえ"
  ],
  [
    "下",
    "した"
  ],
  [
    "前",
    "まえ"
  ],
  [
    "後",
    "あと"
  ],
  [
    "右",
    "みぎ"
  ],
  [
    "左",
    "ひだり"
  ],
  [
    "中",
    "なか"
  ],
  [
    "外",
    "そと"
  ],
  [
    "横",
    "よこ"
  ],
  [
    "隣",
    "となり"
  ],
  [
    "窓",
    "まど"
  ],
  [
    "戸",
    "と"
  ],
  [
    "門",
    "もん"
  ],
  [
    "箱",
    "はこ"
  ],
  [
    "紙",
    "かみ"
  ],
  [
    "皿",
    "さら"
  ],
  [
    "水",
    "みず"
  ],
  [
    "茶",
    "ちゃ"
  ],
  [
    "肉",
    "にく"
  ],
  [
    "魚",
    "さかな"
  ],
  [
    "体",
    "からだ"
  ],
  [
    "頭",
    "あたま"
  ],
  [
    "顔",
    "かお"
  ],
  [
    "目",
    "め"
  ],
  [
    "耳",
    "みみ"
  ],
  [
    "口",
    "くち"
  ],
  [
    "鼻",
    "はな"
  ],
  [
    "歯",
    "は"
  ],
  [
    "手",
    "て"
  ],
  [
    "足",
    "あし"
  ],
  [
    "背",
    "せ"
  ],
  [
    "心",
    "こころ"
  ],
  [
    "行",
    "い"
  ],
  [
    "来",
    "き"
  ],
  [
    "帰",
    "かえ"
  ],
  [
    "食",
    "た"
  ],
  [
    "飲",
    "の"
  ],
  [
    "見",
    "み"
  ],
  [
    "聞",
    "き"
  ],
  [
    "読",
    "よ"
  ],
  [
    "書",
    "か"
  ],
  [
    "話",
    "はな"
  ],
  [
    "買",
    "か"
  ],
  [
    "会",
    "あ"
  ],
  [
    "寝",
    "ね"
  ],
  [
    "起",
    "お"
  ],
  [
    "歩",
    "ある"
  ],
  [
    "走",
    "はし"
  ],
  [
    "遊",
    "あそ"
  ],
  [
    "働",
    "はたら"
  ],
  [
    "休",
    "やす"
  ],
  [
    "使",
    "つか"
  ],
  [
    "作",
    "つく"
  ],
  [
    "開",
    "あ"
  ],
  [
    "閉",
    "し"
  ],
  [
    "入",
    "はい"
  ],
  [
    "出",
    "で"
  ],
  [
    "持",
    "も"
  ],
  [
    "待",
    "ま"
  ],
  [
    "貸",
    "か"
  ],
  [
    "借",
    "か"
  ],
  [
    "返",
    "かえ"
  ],
  [
    "教",
    "おし"
  ],
  [
    "習",
    "なら"
  ],
  [
    "覚",
    "おぼ"
  ],
  [
    "忘",
    "わす"
  ],
  [
    "決",
    "き"
  ],
  [
    "続",
    "つづ"
  ],
  [
    "始",
    "はじ"
  ],
  [
    "終",
    "お"
  ],
  [
    "降",
    "ふ"
  ],
  [
    "晴",
    "は"
  ],
  [
    "曇",
    "くも"
  ],
  [
    "泣",
    "な"
  ],
  [
    "笑",
    "わら"
  ],
  [
    "洗",
    "あら"
  ],
  [
    "磨",
    "みが"
  ],
  [
    "切",
    "き"
  ],
  [
    "着",
    "き"
  ],
  [
    "脱",
    "ぬ"
  ],
  [
    "乗",
    "の"
  ],
  [
    "渡",
    "わた"
  ],
  [
    "曲",
    "ま"
  ],
  [
    "押",
    "お"
  ],
  [
    "引",
    "ひ"
  ],
  [
    "急",
    "いそ"
  ],
  [
    "遅",
    "おそ"
  ],
  [
    "早",
    "はや"
  ],
  [
    "速",
    "はや"
  ],
  [
    "強",
    "つよ"
  ],
  [
    "弱",
    "よわ"
  ],
  [
    "暑",
    "あつ"
  ],
  [
    "寒",
    "さむ"
  ],
  [
    "暖",
    "あたた"
  ],
  [
    "涼",
    "すず"
  ],
  [
    "新",
    "あたら"
  ],
  [
    "古",
    "ふる"
  ],
  [
    "高",
    "たか"
  ],
  [
    "安",
    "やす"
  ],
  [
    "広",
    "ひろ"
  ],
  [
    "狭",
    "せま"
  ],
  [
    "長",
    "なが"
  ],
  [
    "短",
    "みじか"
  ],
  [
    "重",
    "おも"
  ],
  [
    "軽",
    "かる"
  ],
  [
    "明",
    "あか"
  ],
  [
    "暗",
    "くら"
  ],
  [
    "悪",
    "わる"
  ],
  [
    "良",
    "よ"
  ],
  [
    "楽",
    "たの"
  ],
  [
    "難",
    "むずか"
  ],
  [
    "易",
    "やさ"
  ],
  [
    "好",
    "す"
  ],
  [
    "嫌",
    "きら"
  ],
  [
    "怖",
    "こわ"
  ],
  [
    "恥",
    "は"
  ],
  [
    "欲",
    "ほ"
  ],
  [
    "眠",
    "ねむ"
  ],
  [
    "痛",
    "いた"
  ],
  [
    "忙",
    "いそが"
  ],
  [
    "若",
    "わか"
  ]
].sort((a, b) => b[0].length - a[0].length);

function makeKanaCards() {
  const pureGojuon = new Set([
    "あ",
    "い",
    "う",
    "え",
    "お",
    "か",
    "き",
    "く",
    "け",
    "こ",
    "さ",
    "し",
    "す",
    "せ",
    "そ",
    "た",
    "ち",
    "つ",
    "て",
    "と",
    "な",
    "に",
    "ぬ",
    "ね",
    "の",
    "は",
    "ひ",
    "ふ",
    "へ",
    "ほ",
    "ま",
    "み",
    "む",
    "め",
    "も",
    "や",
    "ゆ",
    "よ",
    "ら",
    "り",
    "る",
    "れ",
    "ろ",
    "わ",
    "を",
    "ん",
  ]);
  const coreRows = kanaRows.filter(([hiragana]) => pureGojuon.has(hiragana));
  const markedRows = kanaRows.filter(
    ([hiragana]) => hiragana.length === 1 && !pureGojuon.has(hiragana),
  );
  const comboRows = kanaRows.filter(([hiragana]) => hiragana.length > 1);
  const handakutenRows = new Set(["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"]);

  const cards = [
    ...coreRows.map(([hiragana, katakana, romaji], index) => ({
      id: `hiragana-${index}`,
      deck: "hiragana",
      type: "平假名",
      prompt: hiragana,
      answer: `${katakana} / ${romaji}`,
      meta: `片假名：${katakana}　罗马音：${romaji}`,
      speech: hiragana,
    })),
    ...coreRows.map(([hiragana, katakana, romaji], index) => ({
      id: `katakana-${index}`,
      deck: "katakana",
      type: "片假名",
      prompt: katakana,
      answer: `${hiragana} / ${romaji}`,
      meta: `平假名：${hiragana}　罗马音：${romaji}`,
      speech: hiragana,
    })),
    ...coreRows.map(([hiragana, katakana, romaji], index) => ({
      id: `romaji-${index}`,
      deck: "romaji",
      type: "罗马音",
      prompt: romaji,
      answer: `${hiragana} / ${katakana}`,
      meta: `平假名：${hiragana}　片假名：${katakana}`,
      speech: hiragana,
    })),
    ...markedRows.map(([hiragana, katakana, romaji], index) => {
      const type = handakutenRows.has(hiragana) ? "半浊音" : "浊音";
      return {
        id: `special-marked-${index}`,
        deck: "special",
        type,
        prompt: hiragana,
        answer: `${katakana} / ${romaji}`,
        meta: `${type}：${hiragana}　片假名：${katakana}　罗马音：${romaji}`,
        speech: hiragana,
      };
    }),
    ...comboRows.map(([hiragana, katakana, romaji], index) => ({
      id: `special-yoon-${index}`,
      deck: "special",
      type: "拗音",
      prompt: hiragana,
      answer: `${katakana} / ${romaji}`,
      meta: `拗音：${hiragana}　片假名：${katakana}　罗马音：${romaji}`,
      speech: hiragana,
    })),
    ...specialRows.map((card, index) => ({
      id: `special-${index}`,
      deck: "special",
      ...card,
    })),
  ];

  return cards.map((card) => ({
    ...card,
    promptLang: card.deck === "romaji" ? "en" : "ja",
    answerLang: "ja",
    frontSpeech: card.deck === "romaji" ? "" : card.speech,
  }));
}

function stripSentencePeriods(text = "") {
  return String(text).trim().replace(/[。．.]+$/g, "");
}

function kanaSurfaceToHiragana(text) {
  return text.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

const kanaRomajiRows = kanaRows
  .flatMap(([hiragana, katakana, romaji]) => [
    [kanaSurfaceToHiragana(hiragana), romaji],
    [kanaSurfaceToHiragana(katakana), romaji],
  ])
  .sort((left, right) => right[0].length - left[0].length);

const godanIStem = {
  う: "い",
  く: "き",
  ぐ: "ぎ",
  す: "し",
  つ: "ち",
  ぬ: "に",
  ぶ: "び",
  む: "み",
  る: "り",
};

const kanjiCharacterPattern = /[\u3400-\u9fff]/u;
const affixMarkerPattern = /[~〜～]/u;

function isKanjiCharacter(character = "") {
  return kanjiCharacterPattern.test(character);
}

function addReadingEntry(entries, seen, surface, reading) {
  const cleanSurface = surface?.trim();
  const cleanReading = reading?.split(";")[0]?.trim();
  const key = `${cleanSurface}:${cleanReading}`;
  if (!cleanSurface || !cleanReading || seen.has(key)) return;
  seen.add(key);
  entries.push([cleanSurface, cleanReading]);
}

function readingEntriesForVocabEntry(entry) {
  const entries = [];
  const seen = new Set();

  const formReadings = new Map(
    (entry?.kanji_readings || []).map(({ form, reading }) => [form?.trim(), reading?.trim()]),
  );
  const surfaces = [entry?.headword, ...(entry?.variants || [])];

  surfaces.forEach((surface) => {
    const cleanSurface = surface?.trim();
    if (!cleanSurface || !kanjiCharacterPattern.test(cleanSurface)) return;

    const reading = formReadings.get(cleanSurface) || entry?.reading;
    addReadingEntry(entries, seen, cleanSurface, reading);

    // Prefix/suffix notation such as 「～人」 is not a word boundary. Deriving
    // 「人 → じん」 from it would also rewrite the standalone noun 人（ひと）.
    if (affixMarkerPattern.test(cleanSurface)) return;

    // 来る is irregular: its inflected forms alternate between き-, こ- and
    // く-. A generic "remove る" rule produces the incorrect 来て → くて.
    if (cleanSurface === "来る" && reading === "くる") {
      [
        ["来ます", "きます"],
        ["来ました", "きました"],
        ["来ません", "きません"],
        ["来て", "きて"],
        ["来た", "きた"],
        ["来ない", "こない"],
        ["来なかった", "こなかった"],
        ["来られ", "こられ"],
        ["来れば", "くれば"],
        ["来よう", "こよう"],
      ].forEach(([inflectedSurface, inflectedReading]) =>
        addReadingEntry(entries, seen, inflectedSurface, inflectedReading),
      );
      return;
    }

    const firstKanjiIndex = cleanSurface.search(kanjiCharacterPattern);
    let lastKanjiIndex = -1;
    [...cleanSurface].forEach((char, index) => {
      if (kanjiCharacterPattern.test(char)) lastKanjiIndex = index;
    });
    const kanaPrefix = cleanSurface.slice(0, firstKanjiIndex);
    const kanaSuffix = cleanSurface.slice(lastKanjiIndex + 1);
    if (!reading?.startsWith(kanaPrefix) || !reading.endsWith(kanaSuffix)) return;

    const readingEnd = kanaSuffix ? -kanaSuffix.length : undefined;
    const coreSurface = cleanSurface.slice(firstKanjiIndex, lastKanjiIndex + 1);
    const coreReading = reading.slice(kanaPrefix.length, readingEnd);
    addReadingEntry(entries, seen, coreSurface, coreReading);

    const lastSurfaceChar = cleanSurface.at(-1);
    const lastReadingChar = reading.at(-1);
    if (!lastSurfaceChar || !lastReadingChar || lastSurfaceChar !== lastReadingChar) return;

    if (lastSurfaceChar === "る") {
      addReadingEntry(entries, seen, cleanSurface.slice(0, -1), reading.slice(0, -1));
    }

    const stemEnding = godanIStem[lastSurfaceChar];
    if (stemEnding) {
      addReadingEntry(
        entries,
        seen,
        `${cleanSurface.slice(0, -1)}${stemEnding}`,
        `${reading.slice(0, -1)}${stemEnding}`,
      );
    }
  });

  return entries.sort((left, right) => right[0].length - left[0].length);
}

const contextSpecificReadings = [
  ["九時", "くじ"],
  ["九月", "くがつ"],
  ["日本人", "にほんじん"],
  ["中国人", "ちゅうごくじん"],
  ["あの人", "あのひと"],
  ["思い出は", "おもいでは"],
  ["調子", "ちょうし"],
  ["気温", "きおん"],
  ["小屋", "こや"],
  ["温かい", "あたたかい"],
  ["区役所", "くやくしょ"],
  ["市役所", "しやくしょ"],
  ["木製", "もくせい"],
  ["物語", "ものがたり"],
  ["正直", "しょうじき"],
  ["小学生", "しょうがくせい"],
  ["明治", "めいじ"],
  ["明治時代", "めいじじだい"],
  ["十分間", "じゅっぷんかん"],
  ["集合場所", "しゅうごうばしょ"],
  ["食文化", "しょくぶんか"],
  ["正確さ", "せいかくさ"],
  ["東京都", "とうきょうと"],
  ["都道府県", "とどうふけん"],
  ["都庁", "とちょう"],
  ["新宿", "しんじゅく"],
  ["降り出しました", "ふりだしました"],
  ["話しました", "はなしました"],
  ["悲しかった", "かなしかった"],
  ["作りたい", "つくりたい"],
  ["聞きました", "ききました"],
  ["建物", "たてもの"],
  ["時代", "じだい"],
  ["建てられました", "たてられました"],
  ["駅", "えき"],
  ["店", "みせ"],
  ["雨", "あめ"],
  ["急に", "きゅうに"],
  ["南口", "みなみぐち"],
  ["日本", "にほん"],
  ["興味", "きょうみ"],
  ["速さ", "はやさ"],
  ["必要", "ひつよう"],
  ["仕事", "しごと"],
  ["両方", "りょうほう"],
  ["歩いて", "あるいて"],
  ["行きます", "いきます"],
  ["机", "つくえ"],
  ["木", "き"],
  ["心", "こころ"],
  ["買いました", "かいました"],
  ["市民", "しみん"],
  ["意見", "いけん"],
];

const allVocabReadingEntries = [...n5Entries, ...n4Entries].flatMap((entry) =>
  readingEntriesForVocabEntry(entry),
);
// Keep broad coverage without allowing readings that are known to change by
// grammatical role or suffix. Longer lexical/inflected forms are considered
// before shorter ones, ambiguous readings are rejected below, and the tokenizer
// also refuses to match a Kanji surface from inside a larger Kanji compound.
const unsafeGlobalReadingSurfaces = new Set([
  "後",
  "降り",
  "人",
  "着",
  "中",
  "話",
  "背",
  "来",
]);
const globalReadingCandidates = [...allVocabReadingEntries, ...furiganaEntries].filter(
  ([surface]) =>
    !affixMarkerPattern.test(surface) && !unsafeGlobalReadingSurfaces.has(surface),
);
const readingsBySurface = new Map();
globalReadingCandidates.forEach(([surface, reading]) => {
  if (!readingsBySurface.has(surface)) readingsBySurface.set(surface, new Set());
  readingsBySurface.get(surface).add(reading);
});
const ambiguousReadingSurfaces = new Set(
  [...readingsBySurface]
    .filter(([, readings]) => readings.size > 1)
    .map(([surface]) => surface),
);
const furiganaByLength = [];
const globalReadingKeys = new Set();
[...contextSpecificReadings, ...globalReadingCandidates]
  .filter(([surface], index) =>
    index < contextSpecificReadings.length || !ambiguousReadingSurfaces.has(surface),
  )
  .forEach(([surface, reading]) => addReadingEntry(furiganaByLength, globalReadingKeys, surface, reading));
furiganaByLength.sort((left, right) => right[0].length - left[0].length);

function readingEntriesForText(preferredReadings = []) {
  const entries = [];
  const seenSurfaces = new Set();
  [...preferredReadings, ...furiganaByLength].forEach(([surface, reading]) => {
    if (!surface || !reading || seenSurfaces.has(surface)) return;
    seenSurfaces.add(surface);
    entries.push([surface, reading]);
  });
  return entries.sort((left, right) => right[0].length - left[0].length);
}

function applyKnownReadings(text, preferredReadings = []) {
  const readingEntries = readingEntriesForText(preferredReadings);
  let result = "";
  let index = 0;

  while (index < text.length) {
    const entry = readingEntries.find(([surface]) => {
      if (!text.startsWith(surface, index)) return false;
      const previousCharacter = text[index - 1] || "";
      const nextCharacter = text[index + surface.length] || "";
      const startsInsideCompound =
        isKanjiCharacter(surface[0]) && isKanjiCharacter(previousCharacter);
      const endsInsideCompound =
        isKanjiCharacter(surface.at(-1)) && isKanjiCharacter(nextCharacter);
      return !startsInsideCompound && !endsInsideCompound;
    });
    if (entry) {
      result += entry[1];
      index += entry[0].length;
    } else {
      result += text[index];
      index += 1;
    }
  }

  return result;
}

function lastVowel(text) {
  const match = text.match(/[aeiou](?!.*[aeiou])/);
  return match ? match[0] : "";
}

function firstConsonant(text) {
  return /^[bcdfghjklmnpqrstvwxyz]/.test(text) ? text[0] : "";
}

function kanaToRomaji(text) {
  const kanaText = kanaSurfaceToHiragana(text);
  let result = "";
  let index = 0;
  let shouldDoubleNextConsonant = false;

  while (index < kanaText.length) {
    const char = kanaText[index];

    if (char === "っ") {
      shouldDoubleNextConsonant = true;
      index += 1;
      continue;
    }

    if (char === "ー") {
      result += lastVowel(result);
      index += 1;
      continue;
    }

    if (char === "、") {
      result += ", ";
      index += 1;
      continue;
    }

    const match = kanaRomajiRows.find(([surface]) => kanaText.startsWith(surface, index));
    if (match) {
      const romaji = match[1];
      result += `${shouldDoubleNextConsonant ? firstConsonant(romaji) : ""}${romaji}`;
      shouldDoubleNextConsonant = false;
      index += match[0].length;
      continue;
    }

    result += char;
    shouldDoubleNextConsonant = false;
    index += 1;
  }

  return result.trim();
}

function sentenceToRomaji(text, preferredReadings = []) {
  const normalizedPunctuation = stripSentencePeriods(text)
    .replace(/[。．]/g, ". ")
    .replace(/、/g, ", ")
    .replace(/[！？]/g, (mark) => (mark === "！" ? "!" : "?"))
    .replace(/[：；]/g, (mark) => (mark === "：" ? ":" : ";"))
    .replace(/[「」『』]/g, "")
    .replace(/[〜～・]/g, " ");
  return kanaToRomaji(applyKnownReadings(normalizedPunctuation, preferredReadings))
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeRomaji(text) {
  return /^[A-Za-z0-9\s,.'!?/:;()\-]+$/.test(text);
}

function normalizeExamples(examples = [], preferredReadings = []) {
  return examples.map((example) => {
    const ja = stripSentencePeriods(example.ja || "");
    const zh = stripSentencePeriods(example.zh || "");
    const generatedRomaji = sentenceToRomaji(ja, preferredReadings);
    const hasSafeRomaji = isSafeRomaji(generatedRomaji);
    return {
      ...example,
      ja,
      romaji: hasSafeRomaji ? generatedRomaji : "",
      romajiStatus: hasSafeRomaji ? "available" : "unavailable",
      furiganaEntries: preferredReadings,
      zh,
    };
  });
}

function hasRealExample(example) {
  return Boolean(example) && !example.includes("N5の単語です");
}

function buildExamples(
  word,
  reading,
  meaning,
  example,
  translation,
  entryExamples = [],
  sourceEntry = null,
) {
  const preferredReadings = sourceEntry ? readingEntriesForVocabEntry(sourceEntry) : [];
  if (entryExamples.length) {
    return normalizeExamples(entryExamples.slice(0, 3), preferredReadings);
  }

  return hasRealExample(example)
    ? normalizeExamples([{ ja: example, zh: translation }], preferredReadings)
    : [];
}

function makeVocabDeckCards({
  deckJaZh,
  deckZhJa,
  idPrefix,
  typePrefix,
  words,
}) {
  return words.flatMap(([
    sourceId,
    word,
    reading,
    romaji,
    meaning,
    example,
    translation,
    entryExamples,
    sourceEntry,
  ], index) => {
    const shortMeaning = meaning;
    const examples = buildExamples(
      word,
      reading,
      meaning,
      example,
      translation,
      entryExamples,
      sourceEntry,
    );
    const sentencePrompt = examples[0]?.zh || "";
    const sentenceAnswer = examples[0]?.ja || "";
    const meaningMeta = "";
    const readingMeta = `读音：${reading}${romaji ? `　罗马音：${romaji}` : ""}${meaningMeta}`;
    // Keep stable IDs in a namespace that can never collide with the old
    // array-index IDs (for example, old `vocab-n4-100-ja`).
    const cardBaseId = `vocab-entry-${sourceId}`;
    const sourceNumber = Number.parseInt(String(sourceId).split("-").at(-1), 10);
    const legacyIndexes = Number.isInteger(sourceNumber) ? [sourceNumber - 1] : [index];
    if (sourceId === "n5-040") legacyIndexes.push(40);
    const uniqueLegacyIndexes = [...new Set(legacyIndexes.filter((value) => value >= 0))];

    return [
      {
        id: `${cardBaseId}-ja`,
        deck: deckJaZh,
        sourceId,
        isVocab: true,
        wordKey: cardBaseId,
        legacyIds: uniqueLegacyIndexes.map((legacyIndex) => `${idPrefix}-${legacyIndex}-ja`),
        type: `${typePrefix} 日文 → 中文`,
        prompt: word,
        promptLang: "ja",
        subtle: `读音：${reading}`,
        subtleLang: "zh-CN",
        answer: shortMeaning,
        answerLang: "zh-CN",
        meta: readingMeta,
        speech: reading,
        frontSpeech: reading,
        examples,
      },
      {
        id: `${cardBaseId}-zh`,
        deck: deckZhJa,
        sourceId,
        isVocab: true,
        wordKey: cardBaseId,
        legacyIds: uniqueLegacyIndexes.map((legacyIndex) => `${idPrefix}-${legacyIndex}-zh`),
        type: `${typePrefix} 中文 → 日文`,
        prompt: shortMeaning,
        promptLang: "zh-CN",
        subtle: sentencePrompt,
        subtleLang: "zh-CN",
        answer: word,
        answerLang: "ja",
        meta: readingMeta,
        sentenceAnswer,
        speech: reading,
        frontSpeech: "",
        examples,
      },
    ];
  });
}

function makeVocabCards(level) {
  const n5Cards = () =>
    makeVocabDeckCards({
      deckJaZh: "vocab-ja-zh",
      deckZhJa: "vocab-zh-ja",
      idPrefix: "vocab",
      typePrefix: "N5",
      words: n5Words,
    });
  const n4Cards = () =>
    makeVocabDeckCards({
      deckJaZh: "vocab-n4-ja-zh",
      deckZhJa: "vocab-n4-zh-ja",
      idPrefix: "vocab-n4",
      typePrefix: "N4",
      words: n4Words,
    });

  if (level === "N5") return n5Cards();
  if (level === "N4") return n4Cards();
  return [...n5Cards(), ...n4Cards()];
}

const grammarChoiceCount = 4;

function grammarChoiceText(entry) {
  return `意思：${entry.meaningZh}\n接续：${entry.formation}`;
}

function grammarChoiceKeywords(entry) {
  return `${entry.pattern} ${entry.meaningZh} ${entry.formation}`
    .replace(/[〜、。；;：:（）()／/｜|]/g, " ")
    .split(/\s+/)
    .filter((item) => item.length >= 2);
}

function grammarDistractorScore(entry, candidate) {
  const entryKeywords = new Set(grammarChoiceKeywords(entry));
  const candidateKeywords = grammarChoiceKeywords(candidate);
  const sharedKeywordScore = candidateKeywords.filter((item) => entryKeywords.has(item)).length * 4;
  const sameFormationHeadScore =
    entry.formation.slice(0, 2) === candidate.formation.slice(0, 2) ? 4 : 0;
  const meaningOverlapScore = [...entry.meaningZh].filter((char) =>
    candidate.meaningZh.includes(char),
  ).length;

  return sharedKeywordScore + sameFormationHeadScore + meaningOverlapScore;
}

function getGrammarDistractors(entry) {
  const usedTexts = new Set([grammarChoiceText(entry)]);
  return grammarEntries
    .filter((candidate) => candidate.id !== entry.id && candidate.level === entry.level)
    .map((candidate) => ({
      entry: candidate,
      score: grammarDistractorScore(entry, candidate),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.id.localeCompare(right.entry.id);
    })
    .filter(({ entry: candidate }) => {
      const text = grammarChoiceText(candidate);
      if (usedTexts.has(text)) return false;
      usedTexts.add(text);
      return true;
    })
    .slice(0, grammarChoiceCount - 1)
    .map(({ entry: candidate }) => candidate);
}

function makeGrammarChoiceCard(entry, examples) {
  const levelKey = entry.level.toLowerCase();
  const correctChoiceId = `${entry.id}-correct`;
  const choices = [
    {
      id: correctChoiceId,
      isCorrect: true,
      sourcePattern: entry.pattern,
      text: grammarChoiceText(entry),
      reason: `正确。${entry.pattern} 表示「${entry.meaningZh}」，接续是「${entry.formation}」。${entry.note ? `记忆点：${entry.note}` : "这个意思和接续都与题干文型一致。"}`,
    },
    ...getGrammarDistractors(entry).map((candidate) => ({
      id: `${entry.id}-distractor-${candidate.id}`,
      isCorrect: false,
      sourcePattern: candidate.pattern,
      text: grammarChoiceText(candidate),
      reason: `错误。这是「${candidate.pattern}」的意思和接续：${candidate.meaningZh} / ${candidate.formation}；它会把题干「${entry.pattern}」的语义或接续链条带偏。`,
    })),
  ];

  return {
    id: `grammar-${entry.id}-choice`,
    deck: `grammar-${levelKey}-choice`,
    isGrammar: true,
    isChoice: true,
    grammarKey: entry.id,
    grammarLevel: entry.level,
    type: `${entry.level} 语法选择题`,
    prompt: `选择「${entry.pattern}」的正确意思和接续`,
    promptLang: "zh-CN",
    subtle: examples[0]?.ja || "",
    subtleLang: "ja",
    answer: grammarChoiceText(entry),
    answerLang: "zh-CN",
    meta: `正确文型：${entry.pattern}${entry.note ? `　提示：${entry.note}` : ""}`,
    sentenceAnswer: examples[0]?.ja || stripSentencePeriods(entry.answerJa),
    speech: examples[0]?.ja || stripSentencePeriods(entry.answerJa),
    frontSpeech: "",
    choices,
    correctChoiceId,
    examples,
  };
}

function makeGrammarCards(level) {
  return grammarEntries.filter((entry) => !level || entry.level === level).flatMap((entry) => {
    const levelKey = entry.level.toLowerCase();
    const examples = normalizeExamples(Array.isArray(entry.examples) ? entry.examples.slice(0, 3) : []);
    const baseMeta = `接续：${entry.formation}　意思：${entry.meaningZh}${entry.note ? `　提示：${entry.note}` : ""}`;
    const answerJa = stripSentencePeriods(entry.answerJa);
    const promptZh = stripSentencePeriods(entry.promptZh);
    const firstExample = examples[0] || { ja: answerJa || "", zh: promptZh || "" };

    return [
      {
        id: `grammar-${entry.id}-zh`,
        deck: `grammar-${levelKey}-zh-ja`,
        isGrammar: true,
        grammarKey: entry.id,
        grammarLevel: entry.level,
        type: `${entry.level} 语法 中文 → 日文`,
        prompt: promptZh,
        promptLang: "zh-CN",
        subtle: `文型：${entry.pattern}`,
        subtleLang: "zh-CN",
        answer: answerJa,
        answerLang: "ja",
        meta: baseMeta,
        sentenceAnswer: answerJa,
        speech: answerJa,
        frontSpeech: "",
        examples,
      },
      {
        id: `grammar-${entry.id}-ja`,
        deck: `grammar-${levelKey}-ja-zh`,
        isGrammar: true,
        grammarKey: entry.id,
        grammarLevel: entry.level,
        type: `${entry.level} 语法 日文 → 中文`,
        prompt: answerJa,
        promptLang: "ja",
        subtle: `文型：${entry.pattern}`,
        subtleLang: "zh-CN",
        answer: promptZh,
        answerLang: "zh-CN",
        meta: baseMeta,
        sentenceAnswer: promptZh,
        speech: answerJa,
        frontSpeech: answerJa,
        examples,
      },
      {
        id: `grammar-${entry.id}-pattern`,
        deck: `grammar-${levelKey}-pattern-zh`,
        isGrammar: true,
        grammarKey: entry.id,
        grammarLevel: entry.level,
        type: `${entry.level} 文型 → 含义/接续`,
        prompt: entry.pattern,
        promptLang: "ja",
        subtle: firstExample.ja,
        subtleLang: "ja",
        answer: `${entry.meaningZh}｜${entry.formation}`,
        answerLang: "zh-CN",
        meta: entry.note ? `提示：${entry.note}` : "",
        sentenceAnswer: firstExample.zh,
        speech: firstExample.ja,
        frontSpeech: "",
        examples,
      },
      makeGrammarChoiceCard(entry, examples),
    ];
  });
}

window.AYAYA_JP_CARD_DATA = {
  sourceNotes,
  furiganaEntries: furiganaByLength,
  makeGrammarCards,
  makeKanaCards,
  makeVocabCards,
};
})();
