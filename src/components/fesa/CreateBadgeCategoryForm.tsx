import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const EMPTY = {
  label: "",
  colorCode: "#2E7D32",
  inkColor: "#ffffff",
  badgePrefix: "",
  zoneLabel: "AL",
  isPublic: false,
};

/** Admin-only: creates a new badge category (profile_type) -- press, VIP,
 * a new committee, etc. Doesn't touch offers/pricing; use "Créer un badge"
 * for comp badges in a new category once it exists. */
export function CreateBadgeCategoryForm({ eventId }: { eventId?: string | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof EMPTY, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    const label = form.label.trim();
    const badgePrefix = form.badgePrefix.trim().toUpperCase();
    if (!label || !badgePrefix) {
      toast.error("Nom et préfixe de badge sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("profile_types").insert({
        event_id: eventId,
        label,
        color_code: form.colorCode,
        ink_color: form.inkColor,
        badge_prefix: badgePrefix,
        zone_label: form.zoneLabel,
        is_public: form.isPublic,
      });
      if (error) throw error;
      toast.success(`Catégorie « ${label} » créée.`);
      setForm(EMPTY);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["profile_types", eventId] });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("profile_types_badge_prefix_key")
          ? "Ce préfixe de badge est déjà utilisé par une autre catégorie."
          : "Impossible de créer cette catégorie.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!eventId}>
        <Plus className="size-4" /> Ajouter une catégorie
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-label" className="text-xs">
            Nom de la catégorie
          </Label>
          <Input
            id="cat-label"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="Presse / Médias"
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-prefix" className="text-xs">
            Préfixe badge (ex. PRE)
          </Label>
          <Input
            id="cat-prefix"
            value={form.badgePrefix}
            onChange={(e) => set("badgePrefix", e.target.value)}
            placeholder="PRE"
            maxLength={6}
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-color" className="text-xs">
            Couleur
          </Label>
          <Input
            id="cat-color"
            type="color"
            value={form.colorCode}
            onChange={(e) => set("colorCode", e.target.value)}
            disabled={submitting}
            className="h-9 p-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-ink" className="text-xs">
            Couleur du texte
          </Label>
          <Input
            id="cat-ink"
            type="color"
            value={form.inkColor}
            onChange={(e) => set("inkColor", e.target.value)}
            disabled={submitting}
            className="h-9 p-1"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => set("isPublic", e.target.checked)}
          disabled={submitting}
        />
        Visible dans le formulaire d&rsquo;inscription public
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Créer la catégorie
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={submitting}
          onClick={() => {
            setForm(EMPTY);
            setOpen(false);
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
