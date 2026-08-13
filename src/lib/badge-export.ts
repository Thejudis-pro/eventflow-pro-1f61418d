/** Client-only exports for the confirmation page: badge PDF (via html2canvas
 * + jsPDF, capturing the same on-screen BadgePreview so there's zero
 * duplicated layout code) and an .ics calendar file (no library needed).
 *
 * Uses html2canvas-pro rather than html2canvas: the site's Tailwind v4
 * theme defines every color as oklch(), which plain html2canvas can't
 * parse (it throws immediately on any oklch()/lab()/color() computed
 * style) -- html2canvas-pro is a drop-in fork that supports them. */

export async function downloadBadgePdf(node: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  // 95×135mm badge + 3mm bleed on each side, per the mockup's own print note.
  const pageWidth = 101;
  const pageHeight = 141;
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] });
  doc.addImage(imgData, "PNG", (pageWidth - 95) / 2, (pageHeight - 135) / 2, 95, 135);
  doc.save(filename);
}

function icsDate(yyyyMmDd: string, addDays = 0): string {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function downloadIcs(params: {
  uid: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  filename: string;
}): void {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FESA 2026//Inscription//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${icsDate(params.startDate)}`,
    `DTEND;VALUE=DATE:${icsDate(params.endDate, 1)}`,
    `SUMMARY:${icsEscape(params.title)}`,
    `DESCRIPTION:${icsEscape(params.description)}`,
    `LOCATION:${icsEscape(params.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = params.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
