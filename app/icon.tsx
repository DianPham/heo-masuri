import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Placeholder pig icon — replace with real artwork before gifting.
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#FFC9D5",
        width: 192,
        height: 192,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 48,
        fontSize: 120,
      }}
    >
      🐷
    </div>,
    { width: 192, height: 192 }
  );
}
