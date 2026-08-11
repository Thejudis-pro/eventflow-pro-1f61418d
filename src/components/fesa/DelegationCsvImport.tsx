import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { delegationsQuery, profileTypesQuery } from "@/lib/event";

type CsvRow = {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  function?: string;
  profile_type?: string;
  delegation_name?: string;
  delegation_contact_email?: string;
  delegation_contact_phone?: string;
};

/**
 * Expected CSV columns: full_name, email, phone, company, function,
 * profile_type, delegation_name, delegation_contact_email, delegation_contact_phone.
 * Rows sharing the same delegation_name are grouped under one delegations row.
 */
export function DelegationCsvImport({ eventId }: { eventId?: string | undefined }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const { data: profiles } = useQuery(profileTypesQuery(eventId));
  const { data: delegations } = useQuery(delegationsQuery(eventId));

  function resolveProfileTypeId(label?: string) {
    const cleaned = (label ?? "").trim().toLowerCase();
    const match = (profiles ?? []).find((p) => p.label.toLowerCase() === cleaned);
    if (match) return match.id;
    return (profiles ?? []).find((p) => p.label.toLowerCase() === "standard")?.id ?? null;
  }

  async function handleFile(file: File) {
    if (!eventId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
      const rows = (parsed.data ?? []).filter((r) => r.full_name?.trim() && r.email?.trim());
      if (rows.length === 0) {
        toast.error("Aucune ligne valide dans le fichier (colonnes full_name/email requises).");
        return;
      }

      const delegationCache = new Map<string, string>(
        (delegations ?? []).map((d) => [d.primary_contact_name.trim().toLowerCase(), d.id]),
      );

      for (const row of rows) {
        const name = row.delegation_name?.trim();
        if (!name || delegationCache.has(name.toLowerCase())) continue;
        const { data, error } = await supabase
          .from("delegations")
          .insert({
            event_id: eventId,
            primary_contact_name: name,
            email: row.delegation_contact_email?.trim() || null,
            phone: row.delegation_contact_phone?.trim() || null,
            source: "csv_import",
          })
          .select("id")
          .single();
        if (error) throw error;
        delegationCache.set(name.toLowerCase(), data.id);
      }

      const toInsert = rows.map((row) => ({
        event_id: eventId,
        delegation_id: row.delegation_name?.trim()
          ? (delegationCache.get(row.delegation_name.trim().toLowerCase()) ?? null)
          : null,
        profile_type_id: resolveProfileTypeId(row.profile_type),
        full_name: row.full_name!.trim(),
        email: row.email!.trim(),
        phone: row.phone?.trim() || null,
        company: row.company?.trim() || null,
        function: row.function?.trim() || null,
        status: "confirmed",
      }));

      const { error: insertError } = await supabase.from("participants").insert(toInsert);
      if (insertError) throw insertError;

      toast.success(
        `${toInsert.length} participant(s) importé(s) via ${delegationCache.size} délégation(s).`,
      );
      queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
      queryClient.invalidateQueries({ queryKey: ["delegations", eventId] });
    } catch (e) {
      console.error(e);
      toast.error("L'import CSV a échoué. Vérifiez le format du fichier.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="outline"
        disabled={importing || !eventId}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Importer délégation (CSV)
      </Button>
    </>
  );
}
