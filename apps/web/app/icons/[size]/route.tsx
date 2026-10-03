import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

/** App icons drawn in code (no image files to maintain). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  const size = SIZES.has(n) ? n : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7a1f3d 0%, #b8891a 100%)",
        }}
      >
        <div
          style={{
            width: size * 0.56,
            height: size * 0.56,
            borderRadius: size * 0.08,
            border: `${Math.max(3, size * 0.03)}px solid #fff3d6`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff3d6",
            fontSize: size * 0.34,
            fontWeight: 700,
          }}
        >
          ✉
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=604800" } },
  );
}
