import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { eventQuery, participantsQuery, profileTypesQuery } from "@/lib/event";

const TITLE = "Tableau de bord organisateur — FESA 2026";
const DESCRIPTION =
  "Suivi des inscriptions, paiements et taux de conversion pour le FESA 2026, avec export CSV des participants.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  confirmed: "Confirmé",
  checked_in: "Enregistré",
};

function Dashboard() {
  const { data: event } = useQuery(eventQuery);
  const { data: profiles } = useQuery(profileTypesQuery(event?.id));
  const { data: participants } = useQuery(participantsQuery(event?.id));

  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => {
    return (participants ?? []).filter(
      (p) =>
        (profileFilter === "all" || p.profile_type_id === profileFilter) &&
        (statusFilter === "all" || p.status === statusFilter),
    );
  }, [participants, profileFilter, statusFilter]);

  const total = participants?.length ?? 0;
  const paid = (participants ?? []).filter((p) => p.status === "paid").length;
  const conversion = total ? Math.round((paid / total) * 100) : 0;

  const profileLabel = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.label ?? "—";
  const profileColor = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.color_code ?? "#2E7D32";

  function exportCsv() {
    const header = [
      "registration_id",
      "full_name",
      "email",
      "phone",
      "company",
      "function",
      "sector",
      "profile",
      "status",
      "created_at",
    ];
    const lines = rows.map((r) =>
      [
        r.registration_id,
        r.full_name,
        r.email,
        r.phone ?? "",
        r.company ?? "",
        r.function ?? "",
        r.sector ?? "",
        profileLabel(r.profile_type_id),
        r.status,
        r.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${event?.slug ?? "event"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Tableau de bord</h1>
            <p className="mt-2 text-muted-foreground">
              {event?.name ?? "Événement"} · {event?.location ?? ""}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => toast.info("Création d'un nouvel événement — bientôt disponible.")}
          >
            <Plus className="size-4" /> Créer un nouvel événement
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Inscriptions totales" value={String(total)} />
          <Tile label="Paiements confirmés" value={String(paid)} />
          <Tile label="Taux de conversion" value={`${conversion}%`} />
          <Tile
            label="Recettes (mock)"
            value={`${(paid * 10000).toLocaleString("fr-FR")} F`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Profil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les profils</SelectItem>
                  {(profiles ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="institutional" className="ml-auto" onClick={exportCsv}>
                <Download className="size-4" /> Export CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Identifiant</th>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Profil</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{r.registration_id}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{r.full_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.company || r.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: profileColor(r.profile_type_id) }}
                          />
                          {profileLabel(r.profile_type_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                        Aucune inscription pour ces filtres.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-accent" /> Flux transactions (live)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Emplacement réservé au flux temps réel PayTech / PayDunya.
            </p>
            <ul className="mt-4 space-y-3">
              {(participants ?? []).slice(0, 6).map((p) => (
                <li key={p.id} className="rounded-lg border border-dashed border-border p-3 text-sm">
                  <span className="font-medium">{p.full_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {STATUS_LABEL[p.status] ?? p.status} ·{" "}
                    {new Date(p.created_at).toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
              {(participants ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Aucune transaction pour le moment.</li>
              )}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-primary-deep">{value}</p>
    </div>
  );
}
