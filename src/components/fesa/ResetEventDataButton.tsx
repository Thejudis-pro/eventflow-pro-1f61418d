import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

const CONFIRM_WORD = "RÉINITIALISER";

type ResetResult = {
  participants_deleted: number;
  delegations_deleted: number;
  newsletter_deleted: number;
};

/** End-of-test-phase reset: wipes every participant, badge, payment,
 * check-in, imported delegation, and newsletter signup for this event via
 * the staff-only reset_event_signups RPC. Leaves event config (profile
 * types, offers, prices) untouched -- only the data real users generated. */
export function ResetEventDataButton({ eventId }: { eventId?: string | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!eventId) return;
    setResetting(true);
    try {
      const { data, error } = await supabase
        .rpc("reset_event_signups", { p_event_id: eventId })
        .maybeSingle<ResetResult>();
      if (error) throw error;
      toast.success(
        `Réinitialisé : ${data?.participants_deleted ?? 0} inscription(s), ${data?.delegations_deleted ?? 0} délégation(s), ${data?.newsletter_deleted ?? 0} abonné(s) newsletter.`,
      );
      await queryClient.invalidateQueries();
      setOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error(error);
      toast.error("La réinitialisation a échoué.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={!eventId}>
          <RotateCcw className="size-4" /> Réinitialiser les inscriptions
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" /> Réinitialiser toutes les
            inscriptions ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Supprime définitivement tous les participants, badges, paiements, check-ins,
                délégations importées et abonnés newsletter de cet événement. Les catégories,
                formules et prix ne sont pas touchés.
              </p>
              <p className="font-semibold text-destructive">
                Cette action est irréversible et ne peut pas être annulée.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <label className="text-sm text-muted-foreground" htmlFor="reset-confirm">
            Tapez <span className="font-mono font-bold text-foreground">{CONFIRM_WORD}</span> pour
            confirmer.
          </label>
          <Input
            id="reset-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== CONFIRM_WORD || resetting}
            onClick={(e) => {
              e.preventDefault();
              void handleReset();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {resetting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Réinitialiser définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
