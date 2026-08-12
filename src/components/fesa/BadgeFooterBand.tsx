import { REG } from "@/lib/fesa-registration-theme";

/**
 * Decorative footer strip for the badge card — a savanna skyline (acacia
 * trees, elephant, giraffe) in light silhouette on the dark green band,
 * matching the reference in src/assets/fesa-badge-reference.png (the
 * original uploads/pasted-....png source file itself wasn't provided).
 * Plain shapes, no external image, so it renders reliably inside
 * html2canvas captures.
 */
export function BadgeFooterBand() {
  const fill = "rgba(251,247,240,0.9)";
  return (
    <svg
      viewBox="0 0 359 40"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <rect width="359" height="40" fill={REG.dark} />

      {/* acacia trees */}
      <g fill={fill} opacity={0.5}>
        <path d="M30 40V26M30 26c-10 0-16-4-16-9 5 2 10 2 16 0 6 2 11 2 16 0 0 5-6 9-16 9Z" />
        <path d="M300 40V24M300 24c-11 0-18-5-18-10 6 2 12 2 18 0 6 2 12 2 18 0 0 5-7 10-18 10Z" />
      </g>

      {/* elephant */}
      <path
        fill={fill}
        d="M78 40V33c0-1 .6-2 .6-3.4 0-1.8-1.4-2.9-1.4-4.9 0-4.6 4.6-8 10-8 2 0 3.8.5 5.3 1.4.9-1 2.2-1.6 3.7-1.6 2.8 0 5 2 5.3 4.6 3 .6 5.1 2.8 5.1 5.4 0 1-.3 1.9-.9 2.7.6.8.9 1.8.9 2.9 0 2.6-2 4.7-4.6 5v3.9h-3v-3.8h-2v3.8h-3v-3.8H92v3.8h-3v-3.9c-1.7-.2-3.2-1-4.2-2.2-.6 1-1 2.1-1 3.3V40Z"
      />

      {/* giraffe */}
      <path
        fill={fill}
        opacity={0.85}
        d="M240 40V21l-3-5V8h2.4l1.6 3.4L242.6 8H245v8l-3 5v6l4 6v7h-3v-6l-1.5-2.3L240 34v6Zm11-9c3.3 0 6 2.7 6 6v3h-3v-3c0-1.4-.9-2.6-2-3v6h-3v-9Z"
      />
    </svg>
  );
}
