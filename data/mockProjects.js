export const tabs = ["案件", "要員", "未分類"];

export const quickFilters = [
  { id: "hasResult", label: "取引実績あり", showOn: ["案件", "要員", "未分類"], help: true },
  { id: "hideTradeNg", label: "取引NGを非表示", showOn: ["案件", "要員", "未分類"], defaultChecked: true },
  { id: "hideForeignNg", label: "外国籍NGを非表示", personLabel: "外国籍を非表示", showOn: ["案件", "要員"] },
  { id: "hide50sNg", label: "50代NGを非表示", personLabel: "50代を非表示", showOn: ["案件", "要員"] },
  { id: "hide60sNg", label: "60代NGを非表示", personLabel: "60代を非表示", showOn: ["案件", "要員"] },
  { id: "createdByMe", label: "自分が作成者の案件のみ表示", personLabel: "自分が作成者の要員のみ表示", showOn: ["案件", "要員"] },
  { id: "recruitingOnly", label: "募集中の案件のみ表示", personLabel: "募集中の要員のみ表示", showOn: ["案件", "要員"] }
];

export const focusOptions = [
  { id: "direct", label: "エンド直/元請直", marked: true },
  { id: "highUnitPrice", label: "高単価", marked: true },
  { id: "remoteHybrid", label: "フルリモート/リモート併用", marked: true }
];

export const personFocusOptions = [
  { id: "powerBp", label: "パワーBP", marked: true }
];

export const sortOptions = ["おすすめ順", "新着順", "名前順", "単価が高い順", "単価が低い順"];
export const pageSizeOptions = [10, 20, 50];

export const prefectures = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];

export const sidePaneItemLabels = [
  "手数料",
  "上位会社",
  "作業内容",
  "作業場所",
  "スキル",
  "上位金額",
  "精算時間幅",
  "案件開始月",
  "想定稼働日数",
  "現場の定時",
  "コアタイム",
  "注力案件",
  "営業の面談同席の要否",
  "契約形態",
  "外国籍の受け入れ",
  "年齢条件",
  "現場の雰囲気",
  "作業時の服装",
  "髪型、爪等の規定",
  "面談回数",
  "募集人数",
  "商流",
  "上位担当者",
  "連絡先",
  "案件作成者",
  "案件作成日"
];

export const searchHistories = [
  {
    id: 1,
    chips: ["案件作成日 2026-01-16 ~", "含めるキーワード 在宅"],
    searchedAt: "2026-04-16 15:21",
    keyword: "在宅"
  },
  {
    id: 2,
    chips: ["案件作成日 2026-01-16 ~", "含めるキーワード 基本リモート"],
    searchedAt: "2026-04-16 15:14",
    keyword: "基本リモート"
  },
  {
    id: 3,
    chips: ["案件作成日 2026-01-16 ~", "含めるキーワード フルリモート"],
    searchedAt: "2026-04-16 14:49",
    keyword: "フルリモート"
  },
  {
    id: 4,
    chips: ["案件作成日 2026-01-16 ~", "含めるキーワード shell"],
    searchedAt: "2026-04-16 14:49",
    keyword: "shell"
  },
  {
    id: 5,
    chips: ["都道府県 愛知県"],
    searchedAt: "2026-04-08 13:39",
    keyword: "愛知県"
  },
  {
    id: 6,
    chips: ["含めるキーワード SQL", "都道府県 愛知県"],
    searchedAt: "2026-04-08 13:39",
    keyword: "SQL"
  },
  {
    id: 7,
    chips: ["案件作成日 2026-01-08 ~", "含めるキーワード Python", "都道府県 愛知県"],
    searchedAt: "2026-04-08 13:37",
    keyword: "Python"
  }
];

export const projects = [
  {
    id: 2085143,
    title: "AWSエンジニアポジション",
    category: "IT",
    unitPrice: "80～90万円",
    unitPriceValue: 90,
    locations: ["登録中"],
    interviewCount: "1回",
    company: "クラウドビルダーズ",
    fee: "10,000円",
    hasResult: false,
    creator: "NK",
    createdAt: "15:50",
    status: "公開",
    tags: ["AWS", "IaC", "リモート"],
    attention: ["高単価"],
    detail: {
      feeLabels: ["手数料：10,000円"],
      company: "クラウドビルダーズ株式会社",
      companyTags: ["取引OK", "帝国データバンク：37点"],
      memo: "SKV内全員が閲覧できます",
      fields: [
        {
          label: "手数料",
          type: "fee",
          items: [
            { label: "手数料：10,000円", tone: "neutral" }
          ]
        },
        {
          label: "上位会社",
          type: "company",
          value: "クラウドビルダーズ株式会社",
          tags: [
            { label: "取引OK", tone: "success" },
            { label: "帝国データバンク：37点", tone: "neutral" }
          ]
        },
        {
          label: "作業内容",
          type: "longText",
          lines: [
            "■業務内容",
            "1. AWSクラウド環境のインフラ設計・デプロイ",
            "IoT基盤の開発チームに所属し、AWSクラウド環境のインフラ設計とテスト環境・本番環境のデプロイ業務を担当していただきます。",
            "使用技術:",
            "・IaC(Terraform, CloudFormation, Code Pipeline) ★必須★",
            "・Network設計（VPC, TGW, Direct Connect） ※IP-VPNを使ったオンプレとの専用線接続があります",
            "・Messaging（IoT Core, SNS, SQS）",
            "・Storage（S3, DynamoDB, Aurora Postgres）",
            "・Computing（Lambda, Step Function, ECS）",
            "・Operation, Security（Cloud Trail, Security Hub, Cloud Watch, X-Ray, Inspector, Guard Duty, Detective）",
            "など。",
            "",
            "2. AWSのネットワーク設計経験",
            "・VPC, TGW, Direct Connectを使ったネットワーク設計の経験",
            "・TGWで複数のAWSアカウント間の通信を設定できる",
            "・IP-VPNを使ってオンプレ環境とAWS環境の接続設計ができる",
            "",
            "3. AWSインフラの運用設計経験",
            "CloudWatch Alarm, Config, Cloud Trail, Security Hubを活用したAWS環境の運用設計経験",
            "",
            "■尚良スキル",
            "1. IoT通信、メッセージングの設計経験",
            "IoT Core, SNS, SQSを使った他システムやエッジデバイスとの通信の設計",
            "",
            "・企業：SIer",
            "・単価：80万〜90万円(税別)程度140-180h　※要相談あり",
            "・募集人数：1名",
            "・工数：月1人月",
            "・開始月：6月〜",
            "・就業環境：リモート"
          ]
        },
        { label: "作業場所", value: "リモート" },
        { label: "スキル", type: "tags", tags: ["AWS", "開発", "Terraform", "CloudFormation", "構築", "ネットワーク", "運用保守", "インフラ", "運用設計", "実装", "Lambda", "Aurora", "テスト", "IoT"] },
        { label: "上位金額", value: "80～90万円" },
        { label: "精算時間幅", value: "未入力", muted: true },
        { label: "案件開始月", value: "2026-06" },
        { label: "想定稼働日数", value: "週5日" },
        { label: "現場の定時", value: "未入力", muted: true },
        { label: "コアタイム", value: "未入力", muted: true },
        { label: "注力案件", value: "エンド直/元請直、高単価" },
        { label: "営業の面談同席の要否", value: "面談前に確認してください" },
        { label: "契約形態", value: "準委任" },
        { label: "外国籍の受け入れ", value: "要確認" },
        { label: "年齢条件", value: "未入力", muted: true },
        { label: "現場の雰囲気", value: "未入力", muted: true },
        { label: "作業時の服装", value: "未入力", muted: true },
        { label: "髪型、爪等の規定", value: "未入力", muted: true },
        { label: "面談回数", value: "1回" },
        { label: "募集人数", value: "1人" },
        {
          label: "商流",
          type: "commerce",
          items: [
            ["エンドユーザー", "未入力"],
            ["元請", "未入力"],
            ["二次請け", "未入力"],
            ["三次請け", "未入力"]
          ]
        },
        { label: "上位担当者", value: "（連絡先なし）" },
        { label: "連絡先", value: "未入力", muted: true },
        { label: "案件作成者", type: "person", value: "三澤 知史", avatar: "三" },
        { label: "案件作成日", type: "person", value: "2026-05-07 15:50", avatar: "三" }
      ]
    }
  },
  {
    id: 2085128,
    title: "飲食店向けサービス連携IF開発（PM兼メンバー）",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都", "リモート"],
    interviewCount: "1回",
    company: "Grant",
    fee: "0円",
    hasResult: false,
    creator: "ST",
    createdAt: "15:45",
    status: "公開",
    tags: ["PM", "API", "リモート"],
    attention: []
  },
  {
    id: 2085115,
    title: "損保基幹刷新プロジェクト（PM/PMO・業務担当）",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "Rosso",
    fee: "0円",
    hasResult: true,
    creator: "HY",
    createdAt: "15:36",
    status: "公開",
    tags: ["PMO", "損保", "業務"]
  },
  {
    id: 2085114,
    title: "行政ソリューション移行伴走・問い合わせ対応プロジェクト",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "Rosso",
    fee: "0円",
    hasResult: true,
    creator: "HY",
    createdAt: "15:36",
    status: "公開",
    tags: ["行政", "移行", "問い合わせ"]
  },
  {
    id: 2085113,
    title: "自治体向けサービスの再構築と移行に関する業務",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "Rosso",
    fee: "0円",
    hasResult: true,
    creator: "HY",
    createdAt: "15:35",
    status: "公開",
    tags: ["自治体", "移行", "Java"]
  },
  {
    id: 2085092,
    title: "JAVA 自動車ディーラーシステムの大型開発案件【リモートあり】週2回、和光出社",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["埼玉県", "リモート"],
    interviewCount: "不明",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:26",
    status: "公開",
    tags: ["Java", "自動車", "リモート"]
  },
  {
    id: 2085089,
    title: "ネットバンク関連調整事務及び資料作成業務【リモートあり】泉岳寺（週2～3日出勤）",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["大分県", "東京都", "リモート"],
    interviewCount: "2回",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:24",
    status: "公開",
    tags: ["金融", "資料作成", "リモート"]
  },
  {
    id: 2085087,
    title: "銀行基幹システム上流工程、旧システム更改・Java再構築支援【リモートあり】品川週2出社",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["大分県", "東京都", "リモート"],
    interviewCount: "不明",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:22",
    status: "公開",
    tags: ["Java", "銀行", "上流"]
  },
  {
    id: 2085085,
    title: "リース業務向けDataSpider・PL/SQL関連開発運用 / 麹町",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:21",
    status: "公開",
    tags: ["DataSpider", "PL/SQL", "運用"]
  },
  {
    id: 2085084,
    title: "銀行勘定系システム機能追加開発 / 大崎",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "1回",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:20",
    status: "公開",
    tags: ["銀行", "勘定系", "開発"]
  },
  {
    id: 2085082,
    title: "金融向けintra-martを用いたWeb開発・保守業務 / 品川",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:19",
    status: "公開",
    tags: ["intra-mart", "Web", "保守"]
  },
  {
    id: 2085081,
    title: "AWS生成AI・Bedrock関連開発及びAWSセキュリティ設計業務 / 豊洲",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "COD",
    fee: "10,000円",
    hasResult: false,
    creator: "MS",
    createdAt: "15:18",
    status: "公開",
    tags: ["AWS", "Bedrock", "セキュリティ", "生成AI"]
  },
  {
    id: 2085055,
    title: "決済サービスにおける精算突合・会計処理業務 自動化 / 業務改善案件",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "SKV",
    fee: "10,000円",
    hasResult: false,
    creator: "TY",
    createdAt: "15:08",
    status: "公開",
    tags: ["決済", "自動化", "業務改善"]
  },
  {
    id: 2085052,
    title: "大手自動車メーカー 部品表老朽化更新プロジェクト テスト / 運用支援案件",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["東京都"],
    interviewCount: "不明",
    company: "SKV",
    fee: "10,000円",
    hasResult: false,
    creator: "TY",
    createdAt: "15:07",
    status: "公開",
    tags: ["自動車", "テスト", "運用"]
  },
  {
    id: 2085040,
    title: "大手自動車メーカー データ基盤活用推進および運用支援案件",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["神奈川県"],
    interviewCount: "不明",
    company: "SKV",
    fee: "10,000円",
    hasResult: false,
    creator: "TY",
    createdAt: "15:06",
    status: "公開",
    tags: ["データ基盤", "運用", "自動車"]
  },
  {
    id: 2084785,
    title: "フルスタックエンジニア募集",
    category: "IT",
    unitPrice: "未定",
    unitPriceValue: 0,
    locations: ["フルリモート"],
    interviewCount: "不明",
    company: "ポジポジ",
    fee: "10,000円",
    hasResult: false,
    creator: "AC",
    createdAt: "13:29",
    status: "公開",
    tags: ["フルスタック", "フルリモート"]
  },
  {
    id: 2084782,
    title: "環境報告書作成、アドバイザリー業務、PJ推進【リモートあり】品川",
    category: "IT",
    unitPrice: "～105万円",
    unitPriceValue: 105,
    locations: ["大分県", "東京都", "リモート"],
    interviewCount: "2回",
    company: "ティアブル",
    fee: "10,000円",
    hasResult: false,
    creator: "AC",
    createdAt: "13:29",
    status: "公開",
    tags: ["PJ推進", "リモート"]
  },
  {
    id: 2084606,
    title: "【データセンター誘致に伴う企画提案書作成・実行支援マネージャー】電力会社向け支援",
    category: "IT",
    unitPrice: "115～145万円",
    unitPriceValue: 145,
    locations: ["大阪府"],
    interviewCount: "不明",
    company: "DKP",
    fee: "0円",
    hasResult: false,
    creator: "BG",
    createdAt: "11:57",
    status: "公開",
    tags: ["データセンター", "企画", "PM"]
  },
  {
    id: 2084386,
    title: "行政向け基幹システムリード（バックエンド）",
    category: "IT",
    unitPrice: "～100万円",
    unitPriceValue: 100,
    locations: ["フルリモート"],
    interviewCount: "1回",
    company: "ビズリンク",
    fee: "0円",
    hasResult: true,
    creator: "BZ",
    createdAt: "10:52",
    status: "公開",
    tags: ["バックエンド", "フルリモート"]
  }
];

export const filterFormRows = [
  { id: "createdAt", label: "案件作成日", type: "dateRange", fromKey: "createdFrom", toKey: "createdTo", start: "下限", end: "上限" },
  { id: "projectId", label: "案件ID", type: "text", placeholder: "案件IDを入力" },
  { id: "exclude", label: "除外するキーワード", type: "text", placeholder: "除外するキーワードを入力" },
  { id: "startMonth", label: "案件開始月", type: "dateRange", fromKey: "startMonthFrom", toKey: "startMonthTo", start: "下限", end: "上限" },
  { id: "skill", label: "スキル", type: "select", placeholder: "スキルタグ名" },
  { id: "unit", label: "単価", type: "priceRange" },
  { id: "prefecture", label: "都道府県", type: "prefecture", placeholder: "都道府県を入力" },
  { id: "remote", label: "こだわり条件", type: "checks", options: ["リモートあり", "フルリモート"] },
  { id: "workDays", label: "想定稼働日数", type: "checks", options: ["週5日", "週4日", "週3日"] }
];

export const personFilterFormRows = [
  { id: "createdAt", label: "要員作成日", type: "dateRange", fromKey: "createdFrom", toKey: "createdTo", start: "下限", end: "上限" },
  { id: "projectId", label: "要員ID", type: "text", placeholder: "要員IDを入力" },
  { id: "exclude", label: "除外するキーワード", type: "text", placeholder: "除外するキーワードを入力" },
  { id: "startMonth", label: "稼働開始日", type: "dateRange", fromKey: "startMonthFrom", toKey: "startMonthTo", start: "下限", end: "上限" },
  { id: "skill", label: "スキル", type: "select", placeholder: "スキルタグ名" },
  { id: "unit", label: "希望単価", type: "priceRange" },
  { id: "prefecture", label: "希望勤務地", type: "prefecture", placeholder: "希望勤務地を入力" },
  { id: "remote", label: "リモート条件", type: "checks", options: ["リモート可", "常駐可", "フルリモート"] },
  { id: "statuses", label: "状態", type: "checks", options: ["提案可", "提案中", "参画中", "停止"] }
];

export const createFormSections = [
  {
    id: "basic",
    rows: [
      { label: "案件種別", type: "radio", options: ["IT", "HR", "FINANCE", "MARKETING", "管理部採用"], value: "IT" },
      { label: "案件名", type: "input", placeholder: "タイトル" },
      { label: "作業内容", type: "textarea", placeholder: "例)ツール作成", required: true },
      { label: "上位金額/月", type: "price", placeholders: ["80", "100"], suffix: "万円" }
    ]
  },
  {
    id: "conditions",
    rows: [
      { label: "精算時間幅", type: "price", placeholders: ["140", "180"], suffix: "時間" },
      { label: "作業場所", type: "select", placeholder: "作業場所を入力して選択" },
      { label: "", type: "input", placeholder: "作業場所について備考" },
      { label: "上位会社", type: "select", placeholder: "会社名を入力して選択" },
      { label: "上位担当者", type: "radio", options: ["登録済みの担当者から選択", "手動入力"], value: "登録済みの担当者から選択" },
      { label: "", type: "select", placeholder: "担当者を選択" },
      { label: "想定稼働日数", type: "checks", options: ["週5日", "週4日", "週3日"], value: ["週5日"], required: true },
      { label: "現場の定時\n(コアタイム)", type: "timeRange", placeholders: ["開始時間", "終了時間"] },
      { label: "注力案件", type: "checks", options: ["エンド直/元請直", "高単価", "フルリモート/リモート併用"] },
      { label: "契約形態", type: "checks", options: ["準委任", "派遣"], value: ["準委任"] },
      { label: "外国籍の受け入れ", type: "radio", options: ["要確認", "可", "不可"], value: "要確認" },
      { label: "年齢条件", type: "checks", options: ["50代", "60代"] }
    ]
  },
  {
    id: "site",
    rows: [
      { label: "現場の雰囲気", type: "select", placeholder: "現場の雰囲気を選択してください" },
      { label: "作業時の服装", type: "select", placeholder: "作業時の服装を選択してください" },
      { label: "髪型、爪等の規定", type: "select", placeholder: "髪型、爪等の規定を選択してください" },
      { label: "面談回数", type: "selectShort", placeholder: "選択してください" },
      { label: "募集人数", type: "number", suffix: "人" },
      { label: "営業の面談同席の\n要否", type: "radio", options: ["面談前に確認してください", "必要", "不要"], value: "面談前に確認してください" },
      { label: "案件開始月", type: "date" },
      { label: "商流", type: "commerce" }
    ]
  }
];
