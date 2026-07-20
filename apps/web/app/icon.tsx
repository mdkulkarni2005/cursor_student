import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated, not a binary asset — the Sparkle mark from components/icons.tsx on the brand orange.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FE7F2D",
          borderRadius: 96,
        }}
      >
        <svg width="300" height="300" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 2l2.4 6.5L21 11l-6.6 2.5L12 20l-2.4-6.5L3 11l6.6-2.5L12 2z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
