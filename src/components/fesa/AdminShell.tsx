import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Gauge,
  Users,
  CreditCard,
  QrCode,
  Upload,
  Target,
  Search,
  Radio,
  LogOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStaffSession, signOutStaff } from "@/lib/auth";
import type { EventRow } from "@/lib/event";

export type AdminNavKey = "overview" | "participants" | "payments" | "checkin" | "import" | "segments";

const NAV_ITEMS: {
  key: AdminNavKey;
  label: string;
  to: "/dashboard" | "/checkin";
  hash?: string;
  icon: typeof Gauge;
}[] = [
  { key: "overview", label: "Vue d'ensemble", to: "/dashboard", icon: Gauge },
  { key: "participants", label: "Participants", to: "/dashboard", hash: "participants", icon: Users },
  { key: "payments", label: "Paiements", to: "/dashboard", hash: "paiements", icon: CreditCard },
  { key: "checkin", label: "Check-in sur site", to: "/checkin", icon: QrCode },
  { key: "import", label: "Import CSV", to: "/dashboard", hash: "import", icon: Upload },
  { key: "segments", label: "Segmentation", to: "/dashboard", hash: "segmentation", icon: Target },
];

export function AdminShell({
  active,
  event,
  search,
  children,
}: {
  active: AdminNavKey;
  event?: EventRow | null | undefined;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string } | undefined;
  children: ReactNode;
}) {
  const { email } = useStaffSession();

  return (
    <div className="admin-shell flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            F
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold text-sidebar-foreground">
              FESA 2026
            </span>
            <span className="block text-[11px] text-muted-foreground">Espace organisateur</span>
          </span>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                to={item.to}
                {...(item.hash ? { hash: item.hash } : {})}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {event && (
          <div className="mt-6 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Radio className="size-3" /> {event.status === "live" ? "En direct" : event.status}
            </p>
            <p className="mt-2 text-sm font-semibold text-sidebar-foreground">{event.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{event.location}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-sidebar-border px-1 pt-4">
          <span className="truncate text-xs text-muted-foreground">{email}</span>
          <button
            type="button"
            onClick={() => void signOutStaff()}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Se déconnecter"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border px-4 py-4 sm:px-8">
          {search ? (
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Rechercher…"}
                className="border-input bg-secondary pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground sm:block">
            {event?.name ?? "Événement"}
          </span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
