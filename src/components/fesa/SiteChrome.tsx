import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Le forum", href: "/#forum" },
  { label: "À propos", to: "/a-propos" as const },
  { label: "Programme", href: "/#programme" },
  { label: "Tarifs & stands", href: "/#tarifs" },
  { label: "Partenaires", href: "/#partenaires" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dcd2bd] bg-[#fbf5eb]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#0d3d21] font-display text-sm font-black text-[#fdf8ef]">
            F
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold text-[#0d3d21]">FESA 2026</span>
            <span className="block text-[11px] text-[#5f6f5f]">Organisé par la PAAF</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-[#27482f] md:flex">
          {navItems.map((item) =>
            "to" in item ? (
              <Link key={item.label} to={item.to} className="transition hover:text-[#a8481a]">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className="transition hover:text-[#a8481a]">
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="institutional" size="sm" className="hidden sm:inline-flex">
            <Link to="/inscription">S'inscrire</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6">
              <nav className="mt-8 flex flex-col gap-1 text-base font-medium text-[#27482f]">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.label}>
                    {"to" in item ? (
                      <Link
                        to={item.to}
                        className="rounded-lg px-3 py-3 transition hover:bg-[#f8f4eb] hover:text-[#a8481a]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="rounded-lg px-3 py-3 transition hover:bg-[#f8f4eb] hover:text-[#a8481a]"
                      >
                        {item.label}
                      </a>
                    )}
                  </SheetClose>
                ))}
              </nav>
              <SheetClose asChild>
                <Button asChild variant="institutional" size="lg">
                  <Link to="/inscription">S'inscrire</Link>
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#dcd2bd] bg-[#f8f4eb]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-[#4f5f51] lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div>
          <p className="font-display text-xl font-black text-[#0d3d21]">FESA 2026</p>
          <p className="mt-2 max-w-xl text-sm leading-6">
            Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire — une plateforme de
            dialogue, d'innovation et de mise en réseau pour les acteurs économiques et
            institutionnels de la sous-région.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-[#0d3d21]">Participer</p>
            <ul className="mt-2 space-y-2">
              <li>
                <Link to="/inscription" className="hover:text-[#a8481a]">
                  S'inscrire
                </Link>
              </li>
              <li>
                <a href="/#tarifs" className="hover:text-[#a8481a]">
                  Réserver un stand
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-[#0d3d21]">Contact</p>
            <ul className="mt-2 space-y-2">
              <li>+221 77 477 83 60</li>
              <li>presidence@paafs.org</li>
              <li>www.paafs.org</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
