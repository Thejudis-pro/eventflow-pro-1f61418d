import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import headerBand from "@/assets/header-fesa-band.jpeg";
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
 * Fixed 359×530px badge card (105×150mm print, matching the real "B4" card-
 * case holders, vertical). Shared by the registration wizard's live
 * preview, the confirmation page, the admin participant detail sheet, and
 * PDF export (rendered off-screen via html2canvas).
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
      style={{ width: 359, height: 530 }}
    >
      <div className="flex-none overflow-hidden leading-none">
        <img
          src={headerBand}
          alt="FESA 2026"
          className="block h-auto w-full scale-[1.06]"
        />
      </div>
      <div className="h-[2px] flex-none" style={{ background: BADGE.gold }} />

      <div className="flex-none px-[18px] pt-[14px] text-center">
        <div style={{ font: "900 16px/1.15 Archivo, sans-serif", letterSpacing: "-0.01em", color: REG.dark }}>
          FORUM DE L&rsquo;ENTREPRENEURIAT ET
        </div>
        <div
          className="mt-[3px]"
          style={{ font: "900 16px/1.15 Archivo, sans-serif", letterSpacing: "-0.01em", color: BADGE.green }}
        >
          DE LA SOUVERAINETÉ ALIMENTAIRE
        </div>
      </div>

      <div className="flex flex-none flex-col items-center gap-1 px-[18px] pt-3" style={{ color: "#201e1d" }}>
        <div
          className="flex items-center gap-1.5 whitespace-nowrap"
          style={{ font: "600 13px/1 Archivo, sans-serif" }}
        >
          <CalendarDays size={14} color={BADGE.green} strokeWidth={2.2} />
          {data.eventDates}
        </div>
        <div
          className="flex items-center gap-1.5 whitespace-nowrap"
          style={{ font: "500 11.5px/1 Archivo, sans-serif" }}
        >
          <MapPin size={14} color={BADGE.green} strokeWidth={2.2} />
          {data.location.toUpperCase()}
        </div>
      </div>

      <div className="flex-none px-[18px] pt-4 text-center">
        <div style={{ font: "900 21px/1.05 Archivo, sans-serif", letterSpacing: "-0.015em", color: "#201e1d" }}>
          {(data.fullName || "NOM PRÉNOM").toUpperCase()}
        </div>
        <div
          className="mt-[3px]"
          style={{ font: "500 10.5px/1.4 Archivo, sans-serif", letterSpacing: "0.06em", color: "#7d7979" }}
        >
          {orgLine ? orgLine.toUpperCase() : "ORGANISATION · PAYS"}
        </div>
      </div>

      <div className="flex-none px-[34px] pt-[10px]">
        <div
          className="py-[7px] text-center"
          style={{ background: data.profileColor, color: ink, font: "800 15px/1.15 Archivo, sans-serif" }}
        >
          {data.profileLabel.toUpperCase()}
        </div>
      </div>

      <div className="flex flex-none flex-col items-center gap-[5px] pt-[10px]">
        <div
          className="flex items-center justify-center border bg-white p-[5px]"
          style={{ width: 114, height: 114, borderColor: "#d7d3d3" }}
        >
          {data.qrValue ? <BadgeQr value={data.qrValue} /> : <QrCode className="size-12 text-[#9b9797]" aria-hidden />}
          <span className="sr-only">QR code du badge</span>
        </div>
        <div
          className="whitespace-nowrap"
          style={{ font: "500 9px/1.3 Archivo, sans-serif", letterSpacing: "0.1em", color: "#9b9797" }}
        >
          {code} · SCAN À L&rsquo;ENTRÉE
        </div>
      </div>

      <div className="flex-none px-[30px] pb-3 pt-[10px]">
        <div
          className="border-2 py-[6px] text-center"
          style={{ borderColor: data.profileColor, font: "900 17px/1.1 Archivo, sans-serif", color: "#201e1d" }}
        >
          {zone}
        </div>
      </div>

      <div className="mt-auto flex-none overflow-hidden bg-white" style={{ height: 40 }}>
        <BadgeFooterBand />
      </div>
    </div>
  );
}
