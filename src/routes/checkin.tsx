import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import jsQR from "jsqr";
import { Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { eventQuery, participantsQuery, profileTypesQuery } from "@/lib/event";

const TITLE = "Check-in sur site — FESA 2026";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [{ title: TITLE }, { name: "robots", content: "noindex" }],
  }),
  component: CheckinPage,
});

type ScanResult =
  | { kind: "ok"; name: string; profileLabel: string; profileColor: string }
  | { kind: "already"; name: string; profileLabel: string; profileColor: string }
  | { kind: "invalid" }
  | { kind: "error" };

type BadgeLookup = {
  participant_id: string;
  participants: { full_name: string; status: string; profile_type_id: string | null } | null;
};

function CheckinPage() {
  const queryClient = useQueryClient();
  const { data: event } = useQuery(eventQuery);
  const { data: profiles } = useQuery(profileTypesQuery(event?.id));
  const { data: participants } = useQuery({
    ...participantsQuery(event?.id),
    refetchInterval: 5000,
  });

  const [cameraActive, setCameraActive] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const checkingRef = useRef(false);
  const resultRef = useRef<ScanResult | null>(null);

  const total = participants?.length ?? 0;
  const checkedIn = (participants ?? []).filter((p) => p.status === "checked_in").length;

  function profileMeta(profileTypeId: string | null) {
    const p = profiles?.find((pt) => pt.id === profileTypeId);
    return { label: p?.label ?? "Participant", color: p?.color_code ?? "#2E7D32" };
  }

  async function processCode(rawValue: string) {
    const value = rawValue.trim();
    if (!value || checkingRef.current || resultRef.current) return;
    checkingRef.current = true;
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("participant_id, participants(full_name, status, profile_type_id)")
        .eq("qr_payload", value)
        .maybeSingle();
      if (error) throw error;

      const badge = data as unknown as BadgeLookup | null;
      if (!badge?.participants) {
        setResult({ kind: "invalid" });
        return;
      }

      const meta = profileMeta(badge.participants.profile_type_id);

      if (badge.participants.status === "checked_in") {
        setResult({
          kind: "already",
          name: badge.participants.full_name,
          profileLabel: meta.label,
          profileColor: meta.color,
        });
        return;
      }

      const { error: insertError } = await supabase
        .from("checkins")
        .insert({ participant_id: badge.participant_id, scanned_by: "staff-web" });
      if (insertError) throw insertError;

      setResult({ kind: "ok", name: badge.participants.full_name, profileLabel: meta.label, profileColor: meta.color });
      queryClient.invalidateQueries({ queryKey: ["participants", event?.id] });
    } catch (e) {
      console.error(e);
      setResult({ kind: "error" });
    } finally {
      checkingRef.current = false;
    }
  }

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    let interval: number | undefined;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        interval = window.setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) void processCode(code.data);
        }, 350);
      } catch (e) {
        console.error(e);
        setCameraActive(false);
      }
    }

    void start();
    return () => {
      stopped = true;
      if (interval) window.clearInterval(interval);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Check-in sur site</h1>
        <p className="mt-2 text-muted-foreground">
          {event?.name ?? "Événement"} · scannez le badge (caméra ou douchette) pour valider
          l'entrée.
        </p>

        <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <span className="text-sm text-muted-foreground">Présents</span>
          <span className="font-display text-2xl font-bold text-primary-deep">
            {checkedIn} / {total}
          </span>
          <span className="text-sm text-muted-foreground">
            ({total ? Math.round((checkedIn / total) * 100) : 0}%)
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scanner caméra</h2>
            <Button
              type="button"
              variant={cameraActive ? "outline" : "institutional"}
              onClick={() => setCameraActive((v) => !v)}
            >
              {cameraActive ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
              {cameraActive ? "Arrêter" : "Activer la caméra"}
            </Button>
          </div>
          {cameraActive && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          <form
            className="mt-6 flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void processCode(manualValue);
              setManualValue("");
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="manual-code">Douchette / saisie manuelle du code badge</Label>
              <Input
                id="manual-code"
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Scanner ou coller le code…"
              />
            </div>
            <Button type="submit">Valider</Button>
          </form>
        </div>

        {result && (
          <div
            className={`mt-6 rounded-xl border p-6 shadow-card ${
              result.kind === "ok"
                ? "border-primary bg-secondary"
                : result.kind === "already"
                  ? "border-accent bg-accent/10"
                  : "border-destructive bg-destructive/10"
            }`}
          >
            {result.kind === "ok" && (
              <p className="flex items-center gap-2 text-lg font-bold text-primary-deep">
                <CheckCircle2 className="size-6" /> VALIDÉ — {result.name} —{" "}
                <span className="size-2.5 rounded-full" style={{ backgroundColor: result.profileColor }} />
                {result.profileLabel}
              </p>
            )}
            {result.kind === "already" && (
              <p className="flex items-center gap-2 text-lg font-bold text-accent">
                <AlertTriangle className="size-6" /> DÉJÀ SCANNÉ — {result.name} —{" "}
                <span className="size-2.5 rounded-full" style={{ backgroundColor: result.profileColor }} />
                {result.profileLabel}
              </p>
            )}
            {result.kind === "invalid" && (
              <p className="flex items-center gap-2 text-lg font-bold text-destructive">
                <XCircle className="size-6" /> Badge invalide ou introuvable
              </p>
            )}
            {result.kind === "error" && (
              <p className="flex items-center gap-2 text-lg font-bold text-destructive">
                <XCircle className="size-6" /> Erreur de vérification, réessayez
              </p>
            )}
            <Button className="mt-4" variant="outline" onClick={() => setResult(null)}>
              Scanner suivant
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
