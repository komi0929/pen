import { ImageResponse } from "next/og";

export const alt = "pen — AIライティングツール";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d2d5e 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <span style={{ fontSize: "72px" }}>✏️</span>
        <span
          style={{
            fontSize: "96px",
            fontWeight: "bold",
            color: "white",
            letterSpacing: "-2px",
          }}
        >
          pen
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "32px",
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "2px",
        }}
      >
        AIインタビューで、あなたの思考を記事に。
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "40px",
          fontSize: "18px",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        pen.hitokoto.tech
      </div>
    </div>,
    { ...size }
  );
}
