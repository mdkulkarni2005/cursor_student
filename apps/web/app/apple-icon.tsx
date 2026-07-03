import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple's "Add to Home Screen" wants no rounded corners baked in — iOS applies its own mask.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
        }}
      >
        <svg width="105" height="105" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 2l2.4 6.5L21 11l-6.6 2.5L12 20l-2.4-6.5L3 11l6.6-2.5L12 2z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
