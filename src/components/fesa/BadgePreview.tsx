import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import fesaLogo from "@/assets/logo-fesa.png";
import { BadgeFooterBand } from "./BadgeFooterBand";
import { BADGE, REG } from "@/lib/fesa-registration-theme";

export type BadgeData = {
  eventName: string;
  eventDates: string;
  location: string;
  fullName: string;
  functionLabel?: string | null | undefined;
  company?: string | null | undefined;
  country?: string | null | undefined;
  city?: string | null | undefined;
  profileLabel: string;
  profileColor: string;
  /** Text color painted on top of profileColor (category "ink"). Defaults to white. */
  profileInk?: string | null | undefined;
  zoneLabel?: string | null | undefined;
  badgePrefix?: string | null | undefined;
  registrationId: string;
  /** Value encoded in the printed QR (badges.qr_payload). Omitted while no badge exists yet. */
  qrValue?: string | null | undefined;
};

function BadgeQr({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 0, width: 220 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return <QrCode className="size-12 text-[#9b9797]" aria-hidden />;
  }
  return <img src={dataUrl} alt="" className="size-full" aria-hidden />;
}

/** Cosmetic short code shown under the QR (e.g. PAR-0184) — derived, not stored. */
function shortCode(registrationId: string): string {
  const digits = registrationId.replace(/\D/g, "");
  return (digits ? digits.slice(-4) : "0000").padStart(4, "0");
}

/**
 * Fixed 567×397px badge card (150×105mm print, matching the real "B4" card-
 * case holders), landscape. Shared by the registration wizard's live
 * preview, the confirmation page, the admin participant detail sheet, and
 * PDF export (rendered via html2canvas).
 */
export function BadgePreview({ data }: { data: BadgeData }) {
  const ink = data.profileInk ?? "#ffffff";
  const zone = data.zoneLabel ?? "ZONES PUBLIQUES";
  const prefix = data.badgePrefix ?? "PAR";
  const code = `${prefix}-${shortCode(data.registrationId)}`;
  const orgLine = [data.company, [data.city, data.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="flex flex-col overflow-hidden bg-white shadow-[0_3px_10px_rgba(45,43,43,0.16)]"
      style={{ width: 567, height: 397 }}
    >
      <div className="h-[2px] flex-none" style={{ background: BADGE.gold }} />

      {/* Header: logo + dates/location */}
      <div className="flex flex-none items-center justify-between px-6 py-3">
        <img src={fesaLogo} alt="FESA 2026" className="h-[30px] w-auto" />
        <div className="text-right" style={{ color: "#201e1d" }}>
          <div
            className="flex items-center justify-end gap-1.5 whitespace-nowrap"
            style={{ font: "700 13px/1.2 Archivo, sans-serif" }}
          >
            {data.eventDates}
            <CalendarDays size={14} color={BADGE.green} strokeWidth={2.2} />
          </div>
          <div
            className="mt-[3px] flex items-center justify-end gap-1.5 whitespace-nowrap"
            style={{ font: "500 11px/1.2 Archivo, sans-serif", color: "#5a6b62" }}
          >
            {data.location.toUpperCase()}
            <MapPin size={14} color={BADGE.green} strokeWidth={2.2} />
          </div>
        </div>
      </div>
      <div className="h-px flex-none" style={{ background: REG.line }} />

      {/* Body: identity (left) + QR (right) */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-7 py-4">
          <div
            className="truncate"
            style={{ font: "900 27px/1.15 Archivo, sans-serif", letterSpacing: "-0.015em", color: "#201e1d" }}
          >
            {(data.fullName || "NOM PRÉNOM").toUpperCase()}
          </div>
          <div
            className="mt-1 truncate"
            style={{ font: "500 12px/1.4 Archivo, sans-serif", letterSpacing: "0.04em", color: "#7d7979" }}
          >
            {orgLine ? orgLine.toUpperCase() : "ORGANISATION · PAYS"}
          </div>

          <div className="mt-4">
            <div
              className="py-[9px] text-center"
              style={{ background: data.profileColor, color: ink, font: "800 16px/1.15 Archivo, sans-serif" }}
            >
              {data.profileLabel.toUpperCase()}
            </div>
          </div>

          <div className="mt-2.5">
            <div
              className="border-2 py-[7px] text-center"
              style={{ borderColor: data.profileColor, font: "900 15px/1.1 Archivo, sans-serif", color: "#201e1d" }}
            >
              {zone}
            </div>
          </div>
        </div>

        <div
          className="flex flex-none flex-col items-center justify-center gap-2 px-5"
          style={{ borderLeft: `1px solid ${REG.line}` }}
        >
          <div
            className="flex items-center justify-center border bg-white p-[5px]"
            style={{ width: 108, height: 108, borderColor: "#d7d3d3" }}
          >
            {data.qrValue ? <BadgeQr value={data.qrValue} /> : <QrCode className="size-12 text-[#9b9797]" aria-hidden />}
            <span className="sr-only">QR code du badge</span>
          </div>
          <div
            className="whitespace-nowrap"
            style={{ font: "500 8.5px/1.3 Archivo, sans-serif", letterSpacing: "0.08em", color: "#9b9797" }}
          >
            {code}
          </div>
        </div>
      </div>

      <div className="mt-auto flex-none overflow-hidden bg-white" style={{ height: 26 }}>
        <BadgeFooterBand />
      </div>
    </div>
  );
}
