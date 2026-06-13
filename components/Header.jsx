const navItems = ["人材マスタ", "案件(フリーランス・派遣)", "求人(転職)", "一斉配信", "単価相場 ↗", "レポート ↗"];

export default function Header({ currentUser, onLogout }) {
  return (
    <header className="global-header">
      <div className="brand">
        <span className="brand-logo">SKV</span>
        <span className="brand-badge">管理コンソール</span>
      </div>
      <nav className="main-nav" aria-label="主要メニュー">
        {navItems.map((item) => (
          <button className={`nav-item ${item.startsWith("案件") ? "active" : ""}`} key={item} type="button">
            {item}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <a
          className="outline-primary"
          href="/market-analysis"
          style={{ fontSize: 16, minHeight: 42, padding: "0 16px", textDecoration: "none" }}
        >
          市場分析
        </a>
        <button className="icon-button" type="button" aria-label="設定">
          ⚙
        </button>
        <button className="user-menu" onClick={onLogout} type="button" title="ログアウト">
          {currentUser?.name || "ログイン中"} <span>{currentUser?.role || ""}</span>
        </button>
      </div>
    </header>
  );
}
