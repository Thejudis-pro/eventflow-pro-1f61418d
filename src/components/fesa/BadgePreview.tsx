import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

export type BadgeData = {
  eventName: string;
  eventDates: string;
  location: string;
  fullName: string;
  functionLabel?: string | null | undefined;
  company?: string | null | undefined;
  profileLabel: string;
  profileColor: string;
  registrationId: string;
  /** Value encoded in the printed QR (badges.qr_payload). Omitted while no badge exists yet. */
  qrValue?: string | null | undefined;
};

function BadgeQr({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 0, width: 160 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return <QrCode className="size-12 text-muted-foreground" aria-hidden />;
  }
  return <img src={dataUrl} alt="" className="size-full" aria-hidden />;
}

/** Reusable, event-agnostic badge card. Colours come from the event/profile data. */
export function BadgePreview({ data }: { data: BadgeData }) {
  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
      <div className="flex items-center justify-between bg-primary-deep px-5 py-4 text-primary-foreground">
        <div>
          <p className="font-display text-lg font-bold leading-none">{data.eventName}</p>
          <p className="mt-1 text-[11px] opacity-80">{data.eventDates}</p>
        </div>
        <div className="rounded-md bg-primary-foreground/15 px-2 py-1 text-[10px] font-semibold tracking-widest">
          PAAF
        </div>
      </div>

      <div
        className="px-5 py-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground"
        style={{ backgroundColor: data.profileColor }}
      >
        {data.profileLabel}
      </div>

      <div className="px-5 py-6">
        <p className="font-display text-2xl font-bold leading-tight text-foreground">
          {data.fullName || "Nom du participant"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {[data.functionLabel, data.company].filter(Boolean).join(" · ") || "Fonction · Structure"}
        </p>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Identifiant
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">{data.registrationId}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">{data.location}</p>
          </div>
          <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-surface p-1">
            {data.qrValue ? <BadgeQr value={data.qrValue} /> : <QrCode className="size-12 text-muted-foreground" aria-hidden />}
            <span className="sr-only">QR code du badge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
