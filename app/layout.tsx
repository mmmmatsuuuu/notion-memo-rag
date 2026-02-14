import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notion Memo RAG",
  description: "Personal RAG for book memo search"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
