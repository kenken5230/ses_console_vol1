export default function Header({ currentUser, onLogout }) {
  return (
    <header className="global-header">
      <div className="brand">
        <span className="brand-logo">SKV</span>
        <span className="brand-badge">管理コンソール</span>
      </div>
      <nav className="main-nav" aria-label="主要メニュー">
        <span className="nav-item active" aria-current="page">
          案件(フリーランス・派遣)
        </span>
      </nav>
      <div className="header-actions">
        <button className="user-menu" onClick={onLogout} type="button" title="ログアウト">
          {currentUser?.name || "ログイン中"} <span>{currentUser?.role || ""}</span>
        </button>
      </div>
    </header>
  );
}
