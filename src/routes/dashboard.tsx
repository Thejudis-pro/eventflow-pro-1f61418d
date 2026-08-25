import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import { CreateBadgeCategoryForm } from "@/components/fesa/CreateBadgeCategoryForm";
import { AdminShell } from "@/components/fesa/AdminShell";
import { BulkBadgePrint } from "@/components/fesa/BulkBadgePrint";
import { CreateFreeBadgeForm } from "@/components/fesa/CreateFreeBadgeForm";
import { DelegationCsvImport } from "@/components/fesa/DelegationCsvImport";
import { ParticipantDetailSheet } from "@/components/fesa/ParticipantDetailSheet";
import { SendSegmentEmailDialog } from "@/components/fesa/SendSegmentEmailDialog";
import { StaffAccessManager } from "@/components/fesa/StaffAccessManager";
import { StaffGate } from "@/components/fesa/StaffGate";
import { ProfileBarChart, TrendSparkline } from "@/components/fesa/admin-charts";
import { supabase } from "@/integrations/supabase/client";
import {
  eventQuery,
  offerAvailabilityQuery,
  offersQuery,
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
  // "confirmed" is only ever reached without a payment ever happening (paid
  // tiers go pending -> paid via confirm_payment_secure; this is the
  // free-tier/staff-comp-badge path) -- labeling it plainly as "free" is
  // what actually distinguishes it from "paid" at a glance.
  confirmed: "Gratuit",
  checked_in: "Enregistré",
};

function Dashboard() {
  return (
    <StaffGate requireAdmin>
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
  const { data: offers } = useQuery(offersQuery(event?.id));
  const { data: offerAvailability } = useQuery(offerAvailabilityQuery(event?.id));

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
  const confirmedOnly = (participants ?? []).filter((p) => p.status === "confirmed").length;
  const absent = Math.max(total - checkedIn, 0);
  const senegaleseCount = (participants ?? []).filter((p) => p.country === "Sénégal").length;
  const nonSenegaleseCount = Math.max(total - senegaleseCount, 0);
  // "confirmed" is only ever reached without a payment (paid tiers go
  // pending -> paid via confirm_payment_secure; confirmed is the free-tier/
  // staff-comp-badge path) -- checked_in can come from either, so those are
  // only counted as free if they genuinely never had a payment row.
  const paidParticipantIds = new Set((payments ?? []).map((p) => p.participant_id));
  const freeBadges = (participants ?? []).filter(
    (p) => (p.status === "confirmed" || p.status === "checked_in") && !paidParticipantIds.has(p.id),
  ).length;
  const revenue = (payments ?? [])
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  // "Stand" offers (exposant/institutionnel) are physical inventory, not
  // badge categories -- worth tracking separately since a sold-out stand
  // type needs action (raise the cap or turn off sales), unlike a badge tier.
  const standOffers = (offers ?? []).filter((o) => o.name.toLowerCase().startsWith("stand"));
  const participantOfferById = new Map((participants ?? []).map((p) => [p.id, p.offer_id]));
  const standStats = standOffers.map((offer) => {
    const sold = offerAvailability?.[offer.id] ?? 0;
    const remaining =
      offer.total_quantity != null ? Math.max(offer.total_quantity - sold, 0) : null;
    const standRevenue = (payments ?? [])
      .filter(
        (p) => p.status === "success" && participantOfferById.get(p.participant_id) === offer.id,
      )
      .reduce((sum, p) => sum + p.amount, 0);
    return { offer, sold, remaining, revenue: standRevenue };
  });
  const standsSoldTotal = standStats.reduce((sum, s) => sum + s.sold, 0);
  const standsRevenueTotal = standStats.reduce((sum, s) => sum + s.revenue, 0);

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

  // A real .xlsx (not CSV) -- staff who aren't technical kept struggling
  // with CSVs opened in Excel: comma vs. locale-semicolon confusion mashing
  // everything into one column, and accented characters (é, è...) garbling
  // without a UTF-8 BOM. An actual workbook has neither problem and opens
  // straight into a normal-looking table. Loaded lazily since it's only
  // needed on this one click.
  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      Identifiant: r.registration_id,
      "Nom complet": r.full_name,
      Email: r.email,
      Téléphone: r.phone ?? "",
      Société: r.company ?? "",
      Fonction: r.function ?? "",
      Secteur: r.sector ?? "",
      Profil: profileLabel(r.profile_type_id),
      Statut: STATUS_LABEL[r.status] ?? r.status,
      "Date d'inscription": new Date(r.created_at).toLocaleDateString("fr-FR"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    XLSX.writeFile(workbook, `participants-${event?.slug ?? "event"}.xlsx`);
  }

  return (
    <AdminShell
      active="overview"
      event={event}
      search={{ value: search, onChange: setSearch, placeholder: "Rechercher un participant…" }}
    >
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
            <Button variant="institutional" onClick={() => void exportExcel()}>
              <Download className="size-4" /> Exporter (Excel)
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
          <Tile label="Chiffre d'affaires" value={`${revenue.toLocaleString("fr-FR")} FCFA`} />
          <Tile label="Participants confirmés" value={String(confirmedOnly)} />
          <Tile label="Taux de conversion" value={`${conversion}%`} />
          <Tile label="Enregistrés sur site" value={`${checkedIn} (${attendanceRate}%)`} />
          <Tile label="Participants absents" value={String(absent)} />
          <Tile label="Badges gratuits" value={String(freeBadges)} />
          <Tile label="Inscriptions sénégalaises" value={String(senegaleseCount)} />
          <Tile label="Inscriptions non sénégalaises" value={String(nonSenegaleseCount)} />
        </div>

        {/* Stands */}
        {standStats.length > 0 && (
          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Stands</h2>
              <span className="text-xs text-muted-foreground">
                {standsSoldTotal} vendu{standsSoldTotal > 1 ? "s" : ""} ·{" "}
                {standsRevenueTotal.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {standStats.map(({ offer, sold, remaining, revenue: standRevenue }) => {
                const pct =
                  offer.total_quantity != null
                    ? Math.min(Math.round((sold / offer.total_quantity) * 100), 100)
                    : 0;
                return (
                  <div key={offer.id} className="min-w-0 rounded-xl border border-border p-4">
                    <p className="truncate text-sm font-medium text-foreground">{offer.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sold} vendu{sold > 1 ? "s" : ""}
                      {offer.total_quantity != null ? ` / ${offer.total_quantity}` : ""}
                      {remaining != null
                        ? ` · ${remaining} restant${remaining > 1 ? "s" : ""}`
                        : ""}
                    </p>
                    {offer.total_quantity != null && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: "var(--chart-1)" }}
                        />
                      </div>
                    )}
                    <p className="mt-2 text-xs font-semibold tabular-nums text-primary-deep">
                      {standRevenue.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
            Téléchargez le modèle, remplissez-le, puis importez-le pour créer une délégation et ses
            participants en un lot.
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
            Sélectionnez un profil et envoyez un email à tous les participants du segment (WhatsApp
            reste manuel pour l'instant).
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
            <SendSegmentEmailDialog
              eventId={event?.id}
              profileTypeId={segmentProfile === "all" ? null : segmentProfile}
              segmentLabel={
                segmentProfile === "all" ? "Tous les profils" : profileLabel(segmentProfile)
              }
              segmentCount={segmentCount}
            />
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
          <div className="mt-4 border-t border-border pt-4">
            <CreateBadgeCategoryForm eventId={event?.id} />
          </div>
        </section>
      </div>

      <ParticipantDetailSheet
        participant={selectedParticipant}
        profile={profiles?.find((p) => p.id === selectedParticipant?.profile_type_id)}
        profileLabel={profileLabel(selectedParticipant?.profile_type_id ?? null)}
        profileColor={profileColor(selectedParticipant?.profile_type_id ?? null)}
        event={event}
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
