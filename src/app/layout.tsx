import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "pen — AIライティングツール",
  description:
    "AIインタビューを通じて、あなたの思考をnote記事に変換するライティングツール",
  openGraph: {
    title: "pen — AIライティングツール",
    description: "AIインタビューで記事を生成",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${noto.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
