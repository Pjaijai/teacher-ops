import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teacher Ops",
  description: "AI question generator and Chinese essay feedback for HKDSE teachers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-HK">
      <body>
        <header className="topbar no-print">
          <Link href="/" className="brand">Teacher Ops</Link>
          <nav>
            <Link href="/questions">Question generator</Link>
            <Link href="/essay">Essay feedback 作文批改</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
