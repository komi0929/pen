import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pen — あなたの一次情報を、読まれ続ける記事にする",
    short_name: "pen",
    description:
      "AIが深く問いかけ、あなたしか持っていない経験や考えを引き出す。出てきた一次情報を、noteで長く読まれる作品に仕上げます。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    orientation: "portrait-primary",
    categories: ["productivity", "education"],
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
