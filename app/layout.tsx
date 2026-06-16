import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "플라노 포트폴리오",
  description: "플라노디자인 내부 포트폴리오 검색",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
