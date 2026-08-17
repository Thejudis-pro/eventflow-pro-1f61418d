import { Link } from "@tanstack/react-router";
import fesaLogo from "@/assets/logo-fesa.png";
import { REG } from "@/lib/fesa-registration-theme";

const navItems = [
  { label: "Le forum", href: "/#forum" },
  { label: "Programme", href: "/#programme" },
  { label: "Tarifs & stands", href: "/#tarifs" },
];

/**
 * Header/footer used only by the registration flow (/inscription,
 * /confirmation/$registrationId, /retrouver-mon-badge) — matches the
 * "Inscription FESA 2026" mockup's utility-bar chrome. The rest of the site
 * keeps SiteHeader/SiteFooter from SiteChrome.tsx untouched.
 */
export function RegistrationHeader() {
  return (
    <header style={{ background: REG.dark }}>
      <div
        className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4 lg:px-16"
        style={{ color: "rgba(251,247,240,0.8)", font: "500 12px/1 Manrope, sans-serif" }}
      >
        <div className="hidden items-center gap-[22px] sm:flex">
          <span>Inscription officielle — FESA 2026 · 21 &amp; 22 septembre · Dakar, CICES</span>
          <span style={{ color: "#f0913f" }}>Paiement sécurisé · badge émis immédiatement</span>
        </div>
        <div className="ml-auto flex items-center gap-[18px]">
          <a href="mailto:contact@fesaforum.com" className="hidden md:inline hover:text-white">
            contact@fesaforum.com
          </a>
          <a href="tel:+221774778360" className="hidden md:inline hover:text-white">
            +221 77 477 83 60
          </a>
        </div>
      </div>

      <div
        className="mx-auto flex h-[86px] max-w-7xl items-center justify-between gap-6 px-4 lg:gap-10 lg:px-16"
        style={{ borderTop: `1px solid ${REG.line}`, background: REG.cream }}
      >
        <Link to="/" className="flex items-center gap-4">
          <img src={fesaLogo} alt="FESA 2026" style={{ height: 34, width: "auto" }} />
          <div className="hidden h-8 w-px lg:block" style={{ background: REG.lineDark }} />
          <div
            className="hidden max-w-[215px] lg:block"
            style={{ font: "700 11.5px/1.35 Manrope, sans-serif", color: REG.muted }}
          >
            Forum de l&rsquo;Entrepreneuriat et de la Souveraineté Alimentaire
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{ font: "600 14px/1 Manrope, sans-serif", color: REG.dark }}
              className="hover:opacity-70"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/retrouver-mon-badge"
            className="flex h-[46px] items-center gap-2 rounded-[14px] px-[22px]"
            style={{ background: REG.creamLight, color: REG.dark, font: "800 14px/1 Manrope, sans-serif" }}
          >
            Retrouver mon badge
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function RegistrationFooter() {
  return (
    <footer
      className="flex flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-16"
      style={{ background: REG.dark, color: "rgba(251,247,240,0.5)", font: "500 12px/1 Manrope, sans-serif" }}
    >
      <span>© 2026 PAAF — www.paafs.org</span>
      <span className="flex flex-wrap gap-[22px]">
        <Link to="/mentions-legales" className="hover:text-white" style={{ color: "rgba(251,247,240,0.5)" }}>
          Mentions légales
        </Link>
        <Link to="/confidentialite" className="hover:text-white" style={{ color: "rgba(251,247,240,0.5)" }}>
          Confidentialité
        </Link>
        <Link to="/conditions-inscription" className="hover:text-white" style={{ color: "rgba(251,247,240,0.5)" }}>
          Conditions d&rsquo;inscription
        </Link>
      </span>
    </footer>
  );
}
