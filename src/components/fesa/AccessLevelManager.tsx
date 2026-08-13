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

const ACCESS_LEVELS = ["Accès total", "Accès limité"] as const;

export function AccessLevelManager({ eventId }: { eventId?: string | undefined }) {
  const queryClient = useQueryClient();
  const { data: profiles, isLoading } = useQuery(profileTypesQuery(eventId));

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

  return (
    <div className="divide-y divide-border">
      {(profiles ?? []).map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.color_code }}
            />
            <span className="truncate text-sm font-medium text-foreground">{p.label}</span>
          </div>
          <Select
            value={p.zone_label ?? "Accès limité"}
            onValueChange={(v) => void setAccessLevel(p.id, v)}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {(profiles ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune catégorie.</p>
      )}
    </div>
  );
}
