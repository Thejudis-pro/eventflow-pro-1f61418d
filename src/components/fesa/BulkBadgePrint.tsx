import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { badgesQuery, type EventRow, type Participant, type ProfileType } from "@/lib/event";
import { BadgePreview } from "./BadgePreview";

const PAGE_WIDTH_MM = 150;
const PAGE_HEIGHT_MM = 105;

/**
 * Renders every participant currently passed in (the dashboard table's
 * filtered rows) into a single multi-page PDF -- one 150×105mm badge per
 * page -- and downloads it in one action, ready to send to a printer.
 * This is the realistic version of "automatic badge printing": a true
 * OS/printer-driver integration isn't reachable from a web app, but a
 * one-click batch PDF removes the one-by-one manual download this app had
 * before.
 */
export function BulkBadgePrint({
  participants,
  profiles,
  event,
}: {
  participants: Participant[];
  profiles: ProfileType[] | undefined;
  event: EventRow | undefined;
}) {
  const { data: badges } = useQuery(badgesQuery(event?.id));
  const [generating, setGenerating] = useState(false);
  const [renderBatch, setRenderBatch] = useState<Participant[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!event) return;
    const eligible = participants.filter((p) => badges?.some((b) => b.participant_id === p.id));
    if (eligible.length === 0) {
      toast.error("Aucun badge généré pour cette sélection pour le moment.");
      return;
    }
    setGenerating(true);
    setRenderBatch(eligible);
  }

  useEffect(() => {
    if (!renderBatch) return;
    let cancelled = false;

    (async () => {
      // Let the off-screen batch mount and its async QR codes resolve.
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (cancelled || !containerRef.current) return;

      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas-pro"),
          import("jspdf"),
        ]);
        const nodes = Array.from(containerRef.current.children) as HTMLElement[];
        const doc = new jsPDF({
          unit: "mm",
          format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM],
          orientation: "landscape",
        });

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (!node) continue;
          const canvas = await html2canvas(node, {
            scale: 3,
            backgroundColor: "#ffffff",
            useCORS: true,
          });
          if (i > 0) doc.addPage([PAGE_WIDTH_MM, PAGE_HEIGHT_MM], "landscape");
          doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
        }

        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `badges-fesa2026-${renderBatch.length}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        await Promise.all(
          renderBatch.map((p) =>
            supabase.rpc("mark_badge_printed", { p_registration_id: p.registration_id }),
          ),
        );
        toast.success(`${renderBatch.length} badge(s) prêt(s) à imprimer.`);
      } catch (error) {
        console.error(error);
        toast.error("La génération des badges a échoué.");
      } finally {
        if (!cancelled) {
          setGenerating(false);
          setRenderBatch(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [renderBatch]);

  return (
    <>
      <Button variant="outline" onClick={handlePrint} disabled={generating || participants.length === 0}>
        {generating ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
        Imprimer les badges ({participants.length})
      </Button>
      {renderBatch && (
        <div ref={containerRef} style={{ position: "fixed", left: -9999, top: 0 }} aria-hidden>
          {renderBatch.map((p) => {
            const profile = profiles?.find((pt) => pt.id === p.profile_type_id);
            const badge = badges?.find((b) => b.participant_id === p.id);
            return (
              <BadgePreview
                key={p.id}
                data={{
                  eventName: event?.name ?? "FESA 2026",
                  eventDates: "21 & 22 septembre 2026",
                  location: event?.location ?? "Dakar, CICES",
                  fullName: p.full_name,
                  company: p.company,
                  country: p.country,
                  city: p.city,
                  profileLabel: profile?.label ?? "Participant",
                  profileColor: profile?.color_code ?? "#0b7a3c",
                  profileInk: profile?.ink_color,
                  zoneLabel: profile?.zone_label,
                  badgePrefix: profile?.badge_prefix,
                  registrationId: p.registration_id,
                  qrValue: badge?.qr_payload,
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
