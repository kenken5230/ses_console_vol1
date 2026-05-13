import { useEffect, useState } from "react";

const initialLogin = { email: "", password: "" };
const initialReset = { email: "" };
const initialNewPassword = { password: "", confirmPassword: "" };

export default function LoginPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [resetForm, setResetForm] = useState(initialReset);
  const [newPasswordForm, setNewPasswordForm] = useState(initialNewPassword);
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("resetToken");
    if (token) {
      setResetToken(token);
      setMode("setPassword");
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "ログインに失敗しました");
      onAuthenticated(result.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "パスワード再設定を受け付けられませんでした");
      setMessage(result.message || "登録されている場合は、パスワード再設定メールを送信します");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "パスワード再設定を受け付けられませんでした");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      if (newPasswordForm.password !== newPasswordForm.confirmPassword) {
        throw new Error("確認用パスワードが一致しません");
      }

      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPasswordForm.password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "パスワード再設定に失敗しました");

      window.history.replaceState({}, "", window.location.pathname);
      setResetToken("");
      setNewPasswordForm(initialNewPassword);
      setMode("login");
      setMessage("パスワードを再設定しました。新しいパスワードでログインしてください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "パスワード再設定に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="brand-logo">SKV</span>
          <span className="brand-badge">管理コンソール</span>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <h1 id="auth-title">ログイン</h1>
            <label className="auth-field">
              <span>メールアドレス</span>
              <input
                autoComplete="email"
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={loginForm.email}
              />
            </label>
            <label className="auth-field">
              <span>パスワード</span>
              <input
                autoComplete="current-password"
                minLength={12}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={loginForm.password}
              />
            </label>
            {message ? <p className="auth-message">{message}</p> : null}
            <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "確認中..." : "ログイン"}
            </button>
            <button className="auth-link-button" onClick={() => { setMode("requestReset"); setMessage(""); }} type="button">
              パスワードを忘れた場合
            </button>
          </form>
        ) : null}

        {mode === "requestReset" ? (
          <form onSubmit={handleResetRequest}>
            <h1 id="auth-title">パスワード再設定</h1>
            <label className="auth-field">
              <span>メールアドレス</span>
              <input
                autoComplete="email"
                onChange={(event) => setResetForm({ email: event.target.value })}
                required
                type="email"
                value={resetForm.email}
              />
            </label>
            {message ? <p className="auth-message">{message}</p> : null}
            <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "受付中..." : "再設定メールを送信"}
            </button>
            <button className="auth-link-button" onClick={() => { setMode("login"); setMessage(""); }} type="button">
              ログインに戻る
            </button>
          </form>
        ) : null}

        {mode === "setPassword" ? (
          <form onSubmit={handlePasswordReset}>
            <h1 id="auth-title">新しいパスワード</h1>
            <label className="auth-field">
              <span>新しいパスワード</span>
              <input
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setNewPasswordForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={newPasswordForm.password}
              />
            </label>
            <label className="auth-field">
              <span>確認用パスワード</span>
              <input
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setNewPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
                type="password"
                value={newPasswordForm.confirmPassword}
              />
            </label>
            {message ? <p className="auth-message">{message}</p> : null}
            <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "設定中..." : "パスワードを設定"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

