import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Placeholder pig icon — replace with real artwork before gifting.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#FFC9D5",
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 110,
      }}
    >
      🐷
    </div>,
    { width: 180, height: 180 }
  );
}
