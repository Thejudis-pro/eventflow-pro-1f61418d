import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendSegmentEmail } from "@/lib/email/send-segment-email.functions";

export function SendSegmentEmailDialog({
  eventId,
  profileTypeId,
  segmentLabel,
  segmentCount,
}: {
  eventId: string | undefined;
  profileTypeId: string | null;
  segmentLabel: string;
  segmentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventId || !subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const result = await sendSegmentEmail({
        data: { eventId, profileTypeId, subject: subject.trim(), message: message.trim() },
      });
      toast.success(
        result.sent > 0
          ? `Message envoyé à ${result.sent} participant${result.sent > 1 ? "s" : ""}.`
          : "Aucun participant dans ce segment.",
      );
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("[dashboard] segment email send failed", error);
      toast.error("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="institutional" disabled={!eventId || segmentCount === 0}>
          <Send className="size-4" /> Envoyer un message à ce segment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer un message ciblé</DialogTitle>
          <DialogDescription>
            {segmentCount} participant{segmentCount > 1 ? "s" : ""} dans « {segmentLabel} » recevront
            cet email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="segment-subject" className="text-xs">
              Sujet
            </Label>
            <Input
              id="segment-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Informations importantes — FESA 2026"
              disabled={sending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="segment-message" className="text-xs">
              Message
            </Label>
            <Textarea
              id="segment-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Votre message aux participants…"
              disabled={sending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Envoyer à {segmentCount} participant{segmentCount > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
