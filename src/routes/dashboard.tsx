import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  BadgePlus,
  Download,
  KeyRound,
  Plus,
  QrCode,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessLevelManager } from "@/components/fesa/AccessLevelManager";
import { AdminShell } from "@/components/fesa/AdminShell";
import { BulkBadgePrint } from "@/components/fesa/BulkBadgePrint";
import { CreateFreeBadgeForm } from "@/components/fesa/CreateFreeBadgeForm";
import { DelegationCsvImport } from "@/components/fesa/DelegationCsvImport";
import { ParticipantDetailSheet } from "@/components/fesa/ParticipantDetailSheet";
import { ResetEventDataButton } from "@/components/fesa/ResetEventDataButton";
import { StaffAccessManager } from "@/components/fesa/StaffAccessManager";
import { StaffGate } from "@/components/fesa/StaffGate";
import {
  EventHealthRadar,
  PaymentsDonut,
  ProfileBarChart,
  TrendSparkline,
} from "@/components/fesa/admin-charts";
import { supabase } from "@/integrations/supabase/client";
import {
  eventQuery,
  participantsQuery,
  paymentsQuery,
  profileTypesQuery,
  type Participant,
} from "@/lib/event";

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

const PROVIDER_LABEL: Record<string, string> = {
  paytech: "PayTech",
  paydunya: "PayDunya",
};

function Dashboard() {
  return (
    <StaffGate>
      <DashboardContent />
    </StaffGate>
  );
}

function DashboardContent() {
  const queryClient = useQueryClient();
  const { data: event } = useQuery(eventQuery);
  const { data: profiles } = useQuery(profileTypesQuery(event?.id));
  const { data: participants } = useQuery(participantsQuery(event?.id));
  const { data: payments } = useQuery(paymentsQuery(event?.id));

  async function assignCategory(participantId: string, profileTypeId: string) {
    const { error } = await supabase
      .from("participants")
      .update({ profile_type_id: profileTypeId })
      .eq("id", participantId);
    if (error) {
      console.error(error);
      toast.error("Impossible de changer la catégorie.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["participants", event?.id] });
  }

  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentProfile, setSegmentProfile] = useState("all");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (participants ?? []).filter(
      (p) =>
        (profileFilter === "all" || p.profile_type_id === profileFilter) &&
        (statusFilter === "all" || p.status === statusFilter) &&
        (!q ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.registration_id.toLowerCase().includes(q)),
    );
  }, [participants, profileFilter, statusFilter, search]);

  const total = participants?.length ?? 0;
  const paid = (participants ?? []).filter((p) => p.status === "paid").length;
  const conversion = total ? Math.round((paid / total) * 100) : 0;
  const checkedIn = (participants ?? []).filter((p) => p.status === "checked_in").length;
  const attendanceRate = total ? Math.round((checkedIn / total) * 100) : 0;

  const segmentCount = useMemo(() => {
    if (segmentProfile === "all") return total;
    return (participants ?? []).filter((p) => p.profile_type_id === segmentProfile).length;
  }, [participants, segmentProfile, total]);

  const profileLabel = (id: string | null) => profiles?.find((p) => p.id === id)?.label ?? "—";
  const profileColor = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.color_code ?? "#2E7D32";

  const trendData = useMemo(() => {
    const days = 7;
    const buckets: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      const count = (participants ?? []).filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      }).length;
      buckets.push({
        label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        value: count,
      });
    }
    return buckets;
  }, [participants]);

  const profileBarData = useMemo(
    () =>
      (profiles ?? []).map((p) => ({
        label: p.label,
        value: (participants ?? []).filter((x) => x.profile_type_id === p.id).length,
        color: p.color_code,
      })),
    [profiles, participants],
  );

  const paymentsDonutData = useMemo(() => {
    const groups = new Map<string, number>();
    for (const tx of payments ?? []) groups.set(tx.provider, (groups.get(tx.provider) ?? 0) + 1);
    const colors: Record<string, string> = { paytech: "var(--chart-1)", paydunya: "var(--accent)" };
    return Array.from(groups.entries()).map(([provider, value]) => ({
      label: PROVIDER_LABEL[provider] ?? provider,
      value,
      color: colors[provider] ?? "var(--muted-foreground)",
    }));
  }, [payments]);

  const healthData = useMemo(() => {
    const paymentsSuccessRate = payments?.length
      ? Math.round((payments.filter((p) => p.status === "success").length / payments.length) * 100)
      : 0;
    const profileCoverage = profiles?.length
      ? Math.round(
          (new Set((participants ?? []).map((p) => p.profile_type_id).filter(Boolean)).size /
            profiles.length) *
            100,
        )
      : 0;
    const last24h = (participants ?? []).filter(
      (p) => Date.now() - new Date(p.created_at).getTime() < 24 * 60 * 60 * 1000,
    ).length;
    const momentum = total ? Math.min(100, Math.round((last24h / total) * 100)) : 0;
    return [
      { metric: "Conversion", value: conversion },
      { metric: "Présence", value: attendanceRate },
      { metric: "Paiements", value: paymentsSuccessRate },
      { metric: "Profils", value: profileCoverage },
      { metric: "Dynamique", value: momentum },
    ];
  }, [payments, profiles, participants, total, conversion, attendanceRate]);

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
    <AdminShell
      active="overview"
      event={event}
      search={{ value: search, onChange: setSearch, placeholder: "Rechercher un participant…" }}
    >
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          {/* Hero */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Inscriptions totales
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                  {total}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {event?.name ?? "Événement"} · {event?.location ?? ""}
                </p>
              </div>
              <div className="min-w-40 flex-1 basis-40 sm:max-w-xs">
                <TrendSparkline data={trendData} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
              <Button variant="institutional" onClick={exportCsv}>
                <Download className="size-4" /> Export CSV
              </Button>
              <BulkBadgePrint participants={rows} profiles={profiles} event={event} />
              <Button asChild variant="outline">
                <Link to="/checkin">
                  <QrCode className="size-4" /> Check-in sur site
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info("Création d'un nouvel événement — bientôt disponible.")}
              >
                <Plus className="size-4" /> Nouvel événement
              </Button>
            </div>
          </section>

          {/* Secondary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Tile label="Paiements confirmés" value={String(paid)} />
            <Tile label="Taux de conversion" value={`${conversion}%`} />
            <Tile label="Enregistrés sur site" value={`${checkedIn} (${attendanceRate}%)`} />
            <Tile label="Recettes (mock)" value={`${(paid * 10000).toLocaleString("fr-FR")} F`} />
          </div>

          {/* Profile breakdown */}
          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="text-sm font-semibold text-foreground">Répartition par profil</h2>
            <ProfileBarChart data={profileBarData} />
          </section>

          {/* Participants table */}
          <section
            id="participants"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card shadow-card"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <h2 className="mr-auto text-sm font-semibold text-foreground">Participants</h2>
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
                <SelectTrigger className="w-full sm:w-44">
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Identifiant</th>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Profil</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedParticipant(r)}
                      className="cursor-pointer border-t border-border hover:bg-secondary/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{r.registration_id}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-foreground">{r.full_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.company || r.email}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          {...(r.profile_type_id ? { value: r.profile_type_id } : {})}
                          onValueChange={(v) => void assignCategory(r.id, v)}
                        >
                          <SelectTrigger className="h-8 w-44 border-none bg-transparent px-2 shadow-none">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: profileColor(r.profile_type_id) }}
                              />
                              <SelectValue placeholder="—" />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {(profiles ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: p.color_code }}
                                  />
                                  {p.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

          {/* Manual free badge creation */}
          <section
            id="creer"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BadgePlus className="size-4 text-accent" /> Créer un badge gratuit
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pour la presse, le staff, les VIP ou toute personne à accréditer sans passer par le
              formulaire d'inscription payant.
            </p>
            <div className="mt-4">
              <CreateFreeBadgeForm eventId={event?.id} />
            </div>
          </section>

          {/* CSV import */}
          <section
            id="import"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Upload className="size-4 text-accent" /> Import de délégations (CSV)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Téléchargez le modèle, remplissez-le, puis importez-le pour créer une délégation et
              ses participants en un lot.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <DelegationCsvImport eventId={event?.id} />
            </div>
          </section>

          {/* Segmentation */}
          <section
            id="segmentation"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Send className="size-4 text-accent" /> Segmentation pour communication ciblée
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sélectionnez un profil pour préparer un envoi ciblé (email/WhatsApp — intégration
              provider à venir).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Select value={segmentProfile} onValueChange={setSegmentProfile}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les profils ({total})</SelectItem>
                  {(profiles ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {segmentCount} participant{segmentCount > 1 ? "s" : ""} dans ce segment
              </span>
              <Button
                variant="institutional"
                onClick={() =>
                  toast.info(`Envoi ciblé à ${segmentCount} participant(s) — bientôt disponible.`)
                }
              >
                <Send className="size-4" /> Envoyer un message à ce segment
              </Button>
            </div>
          </section>

          {/* Staff access management */}
          <section
            id="acces"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-accent" /> Accès organisateurs
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Validez ou révoquez l'accès des comptes qui se sont inscrits à l'espace organisateur.
            </p>
            <div className="mt-2">
              <StaffAccessManager />
            </div>
          </section>

          {/* Badge access levels */}
          <section
            id="niveaux-acces"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <KeyRound className="size-4 text-accent" /> Niveaux d'accès badges
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Chaque catégorie de badge a un niveau d'accès affiché dans la zone du badge : Accès
              total ou Accès limité.
            </p>
            <div className="mt-2">
              <AccessLevelManager eventId={event?.id} />
            </div>
          </section>

          {/* Danger zone */}
          <section
            id="danger"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-card sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertOctagon className="size-4" /> Zone de danger
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Fin de la phase de test : supprime toutes les inscriptions, badges, paiements et
              statistiques pour repartir de zéro. Les formules, prix et catégories restent
              configurés.
            </p>
            <div className="mt-4">
              <ResetEventDataButton eventId={event?.id} />
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <section
            id="paiements"
            className="scroll-mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <h2 className="text-sm font-semibold text-foreground">Paiements</h2>
            <p className="mt-1 text-xs text-muted-foreground">Par prestataire, ce mois-ci</p>
            <div className="mt-4">
              <PaymentsDonut data={paymentsDonutData} />
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="text-sm font-semibold text-foreground">Santé de l'événement</h2>
            <EventHealthRadar data={healthData} />
          </section>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="text-sm font-semibold text-foreground">Segments</h2>
            <ul className="mt-4 space-y-2">
              {profileBarData.map((p) => (
                <li
                  key={p.label}
                  className="flex items-center justify-between gap-3 rounded-lg border-l-4 bg-secondary/40 py-2.5 pl-3 pr-4"
                  style={{ borderColor: p.color }}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {p.label}
                  </span>
                  <span className="shrink-0 font-display text-sm font-bold tabular-nums text-foreground">
                    {p.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <ParticipantDetailSheet
        participant={selectedParticipant}
        profileLabel={profileLabel(selectedParticipant?.profile_type_id ?? null)}
        profileColor={profileColor(selectedParticipant?.profile_type_id ?? null)}
        payments={(payments ?? []).filter((p) => p.participant_id === selectedParticipant?.id)}
        onOpenChange={(open) => {
          if (!open) setSelectedParticipant(null);
        }}
      />
    </AdminShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-display text-xl font-bold tabular-nums text-primary-deep sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
