import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "テーマ探索 — AI編集者があなたの書くべきテーマを発見 | pen",
  description:
    "AI編集者との対話で、あなたの経験の中に眠っているnoteで長く読まれる記事テーマを発掘します。ログイン不要・無料で何度でも使えます。",
  openGraph: {
    title: "テーマ探索 — AI編集者があなたの書くべきテーマを発見 | pen",
    description:
      "AI編集者との対話で、noteで長く読まれる記事テーマを発掘",
  },
  twitter: {
    card: "summary",
    title: "テーマ探索 — AI編集者があなたの書くべきテーマを発見",
    description:
      "AI編集者との対話で、noteで長く読まれる記事テーマを発掘",
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
