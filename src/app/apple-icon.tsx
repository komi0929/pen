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
        background: "#1a1a1a",
        borderRadius: "36px",
      }}
    >
      {/* White pen icon matching favicon SVG */}
      <svg
        width="100"
        height="100"
        viewBox="0 0 20 20"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.5 6.5l-1-1a2.12 2.12 0 0 0-3 0L3.5 11.5a2 2 0 0 0-.5.9l-.8 3.4a.5.5 0 0 0 .6.6l3.4-.8a2 2 0 0 0 .9-.5l6-6a2.12 2.12 0 0 0 0-3z" />
        <line x1="10" y1="7" x2="13" y2="10" />
        <line x1="2" y1="18" x2="18" y2="18" />
      </svg>
    </div>,
    { ...size }
  );
}
