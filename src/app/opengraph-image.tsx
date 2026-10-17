import { ImageResponse } from "next/og";

import { PAWN_HEIGHT, silhouettePath } from "@/lib/motion/pawn-profile";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const h = Math.ceil(PAWN_HEIGHT * 100) + 6;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#080808",
          color: "#ffffff",
          padding: "72px 80px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: "#b4b4b4" }}>DOMINUS PAYMENTS</div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, lineHeight: 0.95, maxWidth: 640 }}>
            {site.tagline}
          </div>
        </div>
        <svg width="300" height={(300 * (h + 4)) / 92} viewBox={`-46 ${-h} 92 ${h + 4}`}>
          <defs>
            <linearGradient id="c" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#030303" />
              <stop offset="0.06" stopColor="#4a0a12" />
              <stop offset="0.3" stopColor="#2c2c2c" />
              <stop offset="0.5" stopColor="#a6a6a6" />
              <stop offset="0.56" stopColor="#1c1c1c" />
              <stop offset="0.93" stopColor="#5b5b5b" />
              <stop offset="1" stopColor="#0d0d0d" />
            </linearGradient>
          </defs>
          <path d={silhouettePath(100)} fill="url(#c)" />
        </svg>
      </div>
    ),
    size,
  );
}
