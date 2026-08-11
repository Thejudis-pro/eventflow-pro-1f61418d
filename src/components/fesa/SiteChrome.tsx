import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-hero-gradient font-display text-sm font-bold text-primary-foreground">
            F
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold">FESA 2026</span>
            <span className="block text-[11px] text-muted-foreground">Organisé par la PAAF</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Button asChild variant="institutional" size="sm">
            <Link to="/inscription">S'inscrire</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-foreground">FESA 2026</span> — Forum de
          l'Entrepreneuriat et de la Souveraineté Alimentaire
        </p>
        <p>Plateforme Africaine pour l'Autonomisation des Femmes et des Filles (PAAF)</p>
      </div>
    </footer>
  );
}
