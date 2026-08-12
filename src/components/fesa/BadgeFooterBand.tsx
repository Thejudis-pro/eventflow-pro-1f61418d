import { BADGE, REG } from "@/lib/fesa-registration-theme";

/**
 * Decorative footer strip for the badge card. The original design's footer
 * graphic (uploads/pasted-....png) wasn't provided, so this recreates a
 * similar diagonal band in the brand palette as an inline SVG — renders
 * reliably inside html2canvas captures, unlike some CSS gradients.
 */
export function BadgeFooterBand() {
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
      <polygon points="0,40 140,40 210,0 90,0" fill={REG.green} />
      <polygon points="150,40 260,40 320,0 220,0" fill={BADGE.gold} />
    </svg>
  );
}
