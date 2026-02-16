import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleTouchIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "36px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "80px",
          fontWeight: "bold",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        ✏️
      </div>
    </div>,
    { ...size }
  );
}
