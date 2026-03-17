import { ImageResponse } from "next/og";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #faf7f2 0%, #efe7da 100%)",
          color: "#171d24",
          padding: "56px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px"
          }}
        >
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "28px",
              background: "#171d24",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 700
            }}
          >
            FC
          </div>
          <div style={{ fontSize: 26, letterSpacing: 2 }}>PROFILE + BLOG + SOCIAL CARD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "860px" }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{BRAND_NAME}</div>
          <div style={{ fontSize: 28, lineHeight: 1.4 }}>{BRAND_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size
  );
}
