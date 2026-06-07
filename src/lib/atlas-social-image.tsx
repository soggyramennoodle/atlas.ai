import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ATLAS_MARK_PATH } from "@/components/atlas-mark-path";
import {
  ATLAS_EMERALD,
  ATLAS_SITE_NAME,
  ATLAS_TAGLINE,
} from "@/lib/atlas-brand";

const GEIST_SEMIBOLD = join(
  process.cwd(),
  "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"
);

let geistSemiBoldPromise: Promise<ArrayBuffer> | undefined;

async function loadGeistSemiBold() {
  geistSemiBoldPromise ??= readFile(GEIST_SEMIBOLD).then((buf) =>
    Uint8Array.from(buf).buffer
  );
  return geistSemiBoldPromise;
}

function AtlasMark({
  height,
  color = "#ffffff",
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

/** Emerald rounded square with centered white Territory A mark. */
function AppIconLayout({ size }: { size: number }) {
  const radius = size * 0.22;
  const markHeight = size * 0.56;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ATLAS_EMERALD,
        borderRadius: radius,
      }}
    >
      <AtlasMark height={markHeight} />
    </div>
  );
}

/** 1200×630 social card — integrated wordmark lockup on emerald. */
function SocialCardLayout() {
  const markHeight = 108;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: ATLAS_EMERALD,
        padding: "48px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            marginRight: -6,
            transform: "translateY(6px)",
          }}
        >
          <AtlasMark height={markHeight} />
        </div>
        <span
          style={{
            fontSize: 112,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          tlas
        </span>
      </div>
      <p
        style={{
          marginTop: 28,
          fontSize: 34,
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          letterSpacing: -0.5,
          lineHeight: 1.2,
        }}
      >
        {ATLAS_TAGLINE}
      </p>
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
  const fontData = await loadGeistSemiBold();

  return new ImageResponse(<SocialCardLayout />, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Geist",
        data: fontData,
        style: "normal",
        weight: 600,
      },
    ],
  });
}

export const SOCIAL_IMAGE_ALT = `${ATLAS_SITE_NAME} — ${ATLAS_TAGLINE}`;

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export const SOCIAL_IMAGE_CONTENT_TYPE = "image/png";
