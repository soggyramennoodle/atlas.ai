import { ImageResponse } from "next/og";
import { ATLAS_MARK_PATH } from "@/components/atlas-mark-path";
import {
  ATLAS_CANVAS,
  ATLAS_INK,
  ATLAS_SITE_NAME,
  ATLAS_TAGLINE,
} from "@/lib/atlas-brand";

function AtlasMark({
  height,
  color = ATLAS_INK,
}: {
  height: number;
  color?: string;
}) {
  const width = height * (50 / 46);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 50 46"
      aria-hidden="true"
    >
      <path fill={color} d={ATLAS_MARK_PATH} />
    </svg>
  );
}

/** Warm paper icon with the redesigned ink mark and subtle glass depth. */
function AppIconLayout({ size }: { size: number }) {
  const radius = size * 0.22;
  const markHeight = size * 0.52;
  const inset = size * 0.09;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backgroundColor: ATLAS_CANVAS,
        background:
          "radial-gradient(circle at 26% 14%, #ffffff 0, rgba(255,255,255,0) 34%), radial-gradient(circle at 70% 86%, rgba(13,13,13,0.12) 0, rgba(13,13,13,0) 42%), linear-gradient(145deg, #fbfaf7 0%, #f4f3f1 45%, #dedad2 100%)",
        borderRadius: radius,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset,
          display: "flex",
          border: "1px solid rgba(13,13,13,0.1)",
          borderRadius: radius * 0.74,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.85), 0 22px 48px rgba(13,13,13,0.13)",
          background: "rgba(255,255,255,0.36)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: size * 0.14,
          right: -size * 0.19,
          width: size * 0.68,
          height: size * 0.18,
          display: "flex",
          borderRadius: size,
          background: "rgba(255,255,255,0.5)",
          transform: "rotate(-18deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          transform: "translateY(1px)",
          filter: "drop-shadow(0 10px 18px rgba(13,13,13,0.18))",
        }}
      >
        <AtlasMark height={markHeight} />
      </div>
    </div>
  );
}

function GlassCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        width: 214,
        height: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "22px 24px",
        border: "1px solid rgba(13,13,13,0.08)",
        borderRadius: 28,
        background: "rgba(255,255,255,0.58)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.82), 0 22px 52px rgba(13,13,13,0.12)",
      }}
    >
      <span
        style={{
          fontSize: 17,
          letterSpacing: 2.6,
          textTransform: "uppercase",
          color: "rgba(13,13,13,0.42)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 29,
          letterSpacing: -0.6,
          color: ATLAS_INK,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** 1200x630 social card in the cinematic-light Atlas language. */
function SocialCardLayout() {
  const markHeight = 86;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: ATLAS_CANVAS,
        background:
          "radial-gradient(circle at 18% 8%, #ffffff 0, rgba(255,255,255,0) 30%), radial-gradient(circle at 84% 78%, rgba(13,13,13,0.1) 0, rgba(13,13,13,0) 34%), linear-gradient(145deg, #fbfaf7 0%, #f4f3f1 48%, #e3dfd6 100%)",
        color: ATLAS_INK,
        fontFamily:
          "Inter Tight, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        padding: 64,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 58,
          right: 58,
          top: 52,
          bottom: 52,
          display: "flex",
          border: "1px solid rgba(13,13,13,0.06)",
          borderRadius: 48,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.85), 0 28px 80px rgba(13,13,13,0.12)",
          background: "rgba(255,255,255,0.34)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -150,
          top: 62,
          width: 620,
          height: 170,
          display: "flex",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.76), rgba(255,255,255,0))",
          transform: "rotate(-18deg)",
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(13,13,13,0.08)",
                borderRadius: 30,
                background: "rgba(255,255,255,0.62)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.86), 0 16px 36px rgba(13,13,13,0.12)",
              }}
            >
              <AtlasMark height={markHeight} />
            </div>
            <span
              style={{
                fontSize: 56,
                letterSpacing: -1.8,
                lineHeight: 1,
              }}
            >
              Atlas
            </span>
          </div>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              height: 44,
              padding: "0 20px",
              border: "1px solid rgba(13,13,13,0.1)",
              borderRadius: 999,
              background: "rgba(255,255,255,0.55)",
              color: "rgba(13,13,13,0.56)",
              fontSize: 18,
              letterSpacing: 2.8,
              textTransform: "uppercase",
            }}
          >
            Student study workspace
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            width: 780,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 96,
              letterSpacing: -4,
              lineHeight: 0.94,
            }}
          >
            <span>Your lectures,</span>
            <span style={{ fontStyle: "italic", marginLeft: 22 }}>
              beautifully
            </span>
            <span style={{ marginLeft: 22 }}>noted.</span>
          </div>
          <span
            style={{
              width: 620,
              fontSize: 28,
              lineHeight: 1.25,
              letterSpacing: -0.5,
              color: "rgba(13,13,13,0.62)",
            }}
          >
            Record class. Atlas turns the messy parts into structured notes,
            concepts, and review material.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
          }}
        >
          <GlassCard label="Capture" value="Record" />
          <GlassCard label="Understand" value="Structure" />
          <GlassCard label="Remember" value="Review" />
        </div>
      </div>
    </div>
  );
}

export async function createAppleIconImage(size = 180) {
  return new ImageResponse(<AppIconLayout size={size} />, {
    width: size,
    height: size,
  });
}

export async function createSocialShareImage() {
  return new ImageResponse(<SocialCardLayout />, {
    width: 1200,
    height: 630,
  });
}

export const SOCIAL_IMAGE_ALT = `${ATLAS_SITE_NAME} — ${ATLAS_TAGLINE}`;

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export const SOCIAL_IMAGE_CONTENT_TYPE = "image/png";
