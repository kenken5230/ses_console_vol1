const navItems = [
  { label: "人材マスタ", status: "coming-soon" },
  { label: "案件(フリーランス・派遣)", status: "active" },
  { label: "求人(転職)", status: "coming-soon" },
  { label: "一斉配信", status: "coming-soon" },
  { label: "市場分析", status: "link", href: "/market-analysis" },
  { label: "レポート ↗", status: "coming-soon" }
];

export default function Header({ currentUser, onLogout }) {
  return (
    <header className="global-header">
      <div className="brand">
        <span className="brand-logo">SKV</span>
        <span className="brand-badge">管理コンソール</span>
      </div>
      <nav className="main-nav" aria-label="主要メニュー">
        {navItems.map((item) =>
          item.status === "link" ? (
            <a className="nav-item nav-link" href={item.href} key={item.label} title="市場分析を開く">
              {item.label}
            </a>
          ) : (
            <button
              aria-disabled={item.status === "coming-soon" ? "true" : undefined}
              className={`nav-item ${item.status === "active" ? "active" : ""}`}
              disabled={item.status === "coming-soon"}
              key={item.label}
              title={item.status === "coming-soon" ? "この画面は未実装です" : undefined}
              type="button"
            >
              {item.label}
            </button>
          )
        )}
      </nav>
      <div className="header-actions">
        <button className="icon-button" type="button" aria-label="設定（未実装）" aria-disabled="true" disabled title="設定画面は未実装です">
          ⚙
        </button>
        <button className="user-menu" onClick={onLogout} type="button" title="ログアウト">
          {currentUser?.name || "ログイン中"} <span>{currentUser?.role || ""}</span>
        </button>
      </div>
    </header>
  );
}
