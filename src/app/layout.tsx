import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const noto = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "pen — あなたの一次情報を、読まれ続ける記事にする",
  description:
    "AIが深く問いかけ、あなたしか持っていない経験や考えを引き出す。出てきた一次情報を、noteで長く読まれる作品に仕上げます。",
  metadataBase: new URL("https://pen.hitokoto.tech"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "pen — あなたの一次情報を、読まれ続ける記事にする",
    description:
      "AIが深く問いかけ、一次情報を引き出す。読まれ続けるnote記事をつくるライティングツール。",
    type: "website",
    url: "https://pen.hitokoto.tech",
    siteName: "pen",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "pen — あなたの一次情報を、読まれ続ける記事にする",
    description:
      "AIが深く問いかけ、一次情報を引き出す。読まれ続けるnote記事をつくるライティングツール。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className={`${noto.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
