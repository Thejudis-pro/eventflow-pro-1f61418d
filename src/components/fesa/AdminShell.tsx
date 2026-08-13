import { useEffect, useState, type ReactNode } from "react";
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
  Sun,
  Moon,
  Menu,
  BadgePlus,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useStaffSession, signOutStaff } from "@/lib/auth";
import type { EventRow } from "@/lib/event";

const THEME_KEY = "fesa-admin-theme";

function useAdminTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function set(next: "dark" | "light") {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  }

  return { theme, set };
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: "dark" | "light";
  onChange: (t: "dark" | "light") => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary p-1">
      <button
        type="button"
        onClick={() => onChange("light")}
        aria-pressed={theme === "light"}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-2.5 ${
          theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
        }`}
      >
        <Sun className="size-3.5" /> <span className="hidden sm:inline">Clair</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("dark")}
        aria-pressed={theme === "dark"}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-2.5 ${
          theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
        }`}
      >
        <Moon className="size-3.5" /> <span className="hidden sm:inline">Sombre</span>
      </button>
    </div>
  );
}

export type AdminNavKey =
  | "overview"
  | "participants"
  | "create"
  | "payments"
  | "checkin"
  | "import"
  | "segments"
  | "access";

const NAV_ITEMS: {
  key: AdminNavKey;
  label: string;
  to: "/dashboard" | "/checkin";
  hash?: string;
  icon: typeof Gauge;
}[] = [
  { key: "overview", label: "Vue d'ensemble", to: "/dashboard", icon: Gauge },
  {
    key: "participants",
    label: "Participants",
    to: "/dashboard",
    hash: "participants",
    icon: Users,
  },
  { key: "create", label: "Créer un badge", to: "/dashboard", hash: "creer", icon: BadgePlus },
  { key: "payments", label: "Paiements", to: "/dashboard", hash: "paiements", icon: CreditCard },
  { key: "checkin", label: "Check-in sur site", to: "/checkin", icon: QrCode },
  { key: "import", label: "Import CSV", to: "/dashboard", hash: "import", icon: Upload },
  { key: "segments", label: "Segmentation", to: "/dashboard", hash: "segmentation", icon: Target },
  { key: "access", label: "Accès organisateurs", to: "/dashboard", hash: "acces", icon: ShieldCheck },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
        F
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-sm font-bold text-sidebar-foreground">
          FESA 2026
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          Espace organisateur
        </span>
      </span>
    </div>
  );
}

function NavLinks({ active, onNavigate }: { active: AdminNavKey; onNavigate?: () => void }) {
  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={item.to}
            {...(item.hash ? { hash: item.hash } : {})}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({ email }: { email: string | null | undefined }) {
  return (
    <div className="mt-4 flex min-w-0 items-center justify-between gap-2 border-t border-sidebar-border px-1 pt-4">
      <span className="min-w-0 truncate text-xs text-muted-foreground">{email}</span>
      <button
        type="button"
        onClick={() => void signOutStaff()}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        aria-label="Se déconnecter"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function EventBadge({ event }: { event?: EventRow | null | undefined }) {
  if (!event) return null;
  return (
    <div className="mt-6 min-w-0 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <Radio className="size-3 shrink-0" /> {event.status === "live" ? "En direct" : event.status}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-sidebar-foreground">{event.name}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.location}</p>
    </div>
  );
}

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
  const { theme, set: setTheme } = useAdminTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className={`admin-shell flex min-h-screen ${theme === "light" ? "light" : ""}`}>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex xl:w-64 xl:px-4">
        <BrandMark />
        <NavLinks active={active} />
        <EventBadge event={event} />
        <AccountFooter email={email} />
      </aside>

      {/* Mobile nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="flex w-72 max-w-[85vw] flex-col bg-sidebar px-3 py-6 text-sidebar-foreground"
        >
          <BrandMark />
          <NavLinks active={active} onNavigate={() => setMobileNavOpen(false)} />
          <EventBadge event={event} />
          <AccountFooter email={email} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-4" />
          </button>

          {search ? (
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Rechercher…"}
                className="border-input bg-secondary pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <span className="hidden max-w-[220px] truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground md:block">
            {event?.name ?? "Événement"}
          </span>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </header>

        <main className="min-w-0 flex-1 px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
