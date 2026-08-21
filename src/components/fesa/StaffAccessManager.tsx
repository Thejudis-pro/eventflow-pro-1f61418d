import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useStaffSession } from "@/lib/auth";

type StaffRow = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  approved: boolean;
  role: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  checkin: "Check-in uniquement",
};

export function StaffAccessManager() {
  const queryClient = useQueryClient();
  const { session } = useStaffSession();
  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, user_id, email, full_name, approved, role, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StaffRow[];
    },
  });

  async function toggleApproved(row: StaffRow) {
    const { error } = await supabase
      .from("staff_profiles")
      .update({ approved: !row.approved })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      toast.error("Impossible de modifier cet accès.");
      return;
    }
    toast.success(
      row.approved ? `Accès révoqué pour ${row.email}.` : `Accès validé pour ${row.email}.`,
    );
    void queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
  }

  async function setRole(row: StaffRow, role: string) {
    const { error } = await supabase.from("staff_profiles").update({ role }).eq("id", row.id);
    if (error) {
      console.error(error);
      toast.error("Impossible de modifier ce rôle.");
      return;
    }
    toast.success(`Rôle mis à jour pour ${row.email}.`);
    void queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
  }

  if (isLoading) return null;

  return (
    <div className="divide-y divide-border">
      {(staff ?? []).map((row) => {
        const isSelf = row.user_id === session?.user.id;
        return (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.full_name || row.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.email}
                {isSelf && " · vous"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={row.role}
                disabled={isSelf}
                onValueChange={(v) => void setRole(row, v)}
              >
                <SelectTrigger className="h-8 w-44" title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={row.approved ? "outline" : "institutional"}
                disabled={isSelf}
                title={isSelf ? "Vous ne pouvez pas modifier votre propre accès" : undefined}
                onClick={() => void toggleApproved(row)}
              >
                {row.approved ? (
                  <>
                    <ShieldOff className="size-4" /> Révoquer
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" /> Valider l'accès
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
      {(staff ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aucun compte organisateur.
        </p>
      )}
    </div>
  );
}
