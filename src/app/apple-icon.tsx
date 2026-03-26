import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

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
          background: "#05070C",
          borderRadius: 44,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: 34,
            border: "2px solid rgba(255,255,255,0.08)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 20,
            top: 36,
            width: 76,
            height: 76,
            borderRadius: 999,
            border: "16px solid #4056C8",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 106,
            top: 52,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#A9B5FF",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 132,
            top: 52,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#A9B5FF",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 104,
            top: 86,
            width: 12,
            height: 54,
            borderRadius: 999,
            background: "#4056C8",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 86,
            width: 12,
            height: 54,
            borderRadius: 999,
            background: "#4056C8",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: 22,
            top: 98,
            width: 44,
            height: 12,
            borderRadius: 999,
            background: "#4056C8",
            transform: "rotate(-39deg)",
            transformOrigin: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 22,
            top: 116,
            width: 44,
            height: 12,
            borderRadius: 999,
            background: "#4056C8",
            transform: "rotate(39deg)",
            transformOrigin: "center",
          }}
        />
      </div>
    ),
    size
  );
}
