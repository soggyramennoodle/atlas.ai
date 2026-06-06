import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Supabase origin the browser talks to (auth + RLS-scoped data reads). Derived
// from the public env so connect-src isn't hardcoded to one project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHttp = "";
let supabaseWs = "";
try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    supabaseHttp = u.origin;
    supabaseWs = `wss://${u.host}`;
  }
} catch {
  // Leave empty if the env var is malformed; connect-src falls back to 'self'.
}

/**
 * Content-Security-Policy.
 *
 * Notes on the pragmatic directives:
 * - script-src needs 'unsafe-inline' because Next.js injects inline bootstrap
 *   scripts for static pages and next-themes injects an inline no-flash script.
 *   Eliminating it requires a nonce-based CSP, which forces every page into
 *   dynamic rendering (see Next's content-security-policy guide) — a real
 *   perf/cost hit for the static marketing pages, so we keep 'unsafe-inline'.
 * - blob: in script-src/worker-src is required by the recorder's AudioWorklet,
 *   which is loaded from a Blob URL.
 * - style-src needs 'unsafe-inline' for Tailwind + framer-motion inline styles.
 * - connect-src is locked to self + the Supabase project (https + wss) + R2.
 *   ffmpeg.wasm core is self-hosted under /ffmpeg (see scripts/copy-ffmpeg-core.mjs)
 *   so we don't need an external CDN in connect-src.
 * - everything else is locked down: object-src none, base-uri self,
 *   frame-ancestors none, form-action self.
 */
// The browser uploads recordings directly to a Cloudflare R2 presigned URL
// (https://<account>.r2.cloudflarestorage.com), so connect-src must allow it.
const connectSrc = [
  "'self'",
  // ffmpeg.wasm wraps its self-hosted core/wasm in blob: URLs (see
  // extract-audio-from-video.ts); the emscripten core then fetches the wasm
  // blob URL to compile it, so connect-src must allow blob: or that fetch is
  // blocked and surfaces as "TypeError: Load failed" in WebKit.
  "blob:",
  supabaseHttp,
  supabaseWs,
  "https://*.r2.cloudflarestorage.com",
  isDev ? "ws:" : "",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  // 'wasm-unsafe-eval' lets ffmpeg.wasm compile its WebAssembly core in
  // production (dev already permits it via 'unsafe-eval').
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${isDev ? " 'unsafe-eval'" : ""}`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self'`,
  `media-src 'self' blob:`,
  `connect-src ${connectSrc}`,
  `manifest-src 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

// Core hardening headers applied to every response.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The recorder needs microphone + display-capture for the signed-in user;
    // everything else sensitive is denied.
    value:
      "camera=(), geolocation=(), microphone=(self), display-capture=(self), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
