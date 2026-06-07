import React from "react";
import { continueRender, delayRender } from "remotion";
import { EMBEDDED_FONTS } from "./generated-fonts";

// Atlas ships on Geist (Sans + Mono). The render environment can't fetch Google
// Fonts (its proxy presents an untrusted CA), so the OFL Geist woff2 files are
// embedded as base64 data URLs (see scripts/embed-fonts.mjs) and injected as
// plain @font-face rules — no network, no static file server, no module-level
// delayRender (which timed out mid-render).
export const fontSans = "Geist";
export const fontMono = "Geist Mono";

const fontFaceCss = EMBEDDED_FONTS.map(
  (f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url(${f.dataUrl}) format("woff2");}`
).join("\n");

/** Inject the @font-face rules once. Render this at the top of the video. */
export const FontFaces: React.FC = () => {
  // Hold the first frame until the embedded faces have actually decoded, so no
  // frame is ever captured with a fallback font. Runs in component scope (one
  // handle per render tab), cleared on document.fonts.ready.
  const [handle] = React.useState(() => delayRender("Loading Atlas fonts"));
  React.useEffect(() => {
    let cancelled = false;
    const families = [fontSans, fontMono];
    Promise.all(
      families.flatMap((fam) =>
        ["400", "500", "600", "700", "800", "900"].map((w) =>
          document.fonts.load(`${w} 16px "${fam}"`).catch(() => undefined)
        )
      )
    )
      .then(() => document.fonts.ready)
      .then(() => {
        if (!cancelled) continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return React.createElement("style", {
    dangerouslySetInnerHTML: { __html: fontFaceCss },
  });
};
