import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { profileTypesQuery } from "@/lib/event";

const ACCESS_LEVELS = ["AA", "AL"] as const;
const ACCESS_LEVEL_LABELS: Record<string, string> = {
  AA: "Accès total (AA)",
  AL: "Accès limité (AL)",
};

export function AccessLevelManager({ eventId }: { eventId?: string | undefined }) {
  const queryClient = useQueryClient();
  const { data: profiles, isLoading } = useQuery(profileTypesQuery(eventId));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && profiles && profiles.length > 0) {
      setSelectedId(profiles[0]!.id);
    }
  }, [profiles, selectedId]);

  async function setAccessLevel(profileTypeId: string, zoneLabel: string) {
    const { error } = await supabase
      .from("profile_types")
      .update({ zone_label: zoneLabel })
      .eq("id", profileTypeId);
    if (error) {
      console.error(error);
      toast.error("Impossible de modifier le niveau d'accès.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["profile_types", eventId] });
  }

  if (isLoading) return null;

  if (!profiles || profiles.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aucune catégorie.</p>;
  }

  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0]!;

  return (
    <div className="flex flex-col gap-3">
      <Select value={selected.id} onValueChange={setSelectedId}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir une catégorie" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color_code }} />
                {p.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color_code }} />
          <span className="truncate text-sm font-medium text-foreground">{selected.label}</span>
        </div>
        <Select value={selected.zone_label ?? "AL"} onValueChange={(v) => void setAccessLevel(selected.id, v)}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {ACCESS_LEVEL_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
