import "./globals.css";

export const metadata = {
  title: "SKV 管理コンソール",
  description: "案件管理画面のフロントエンド再現"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
