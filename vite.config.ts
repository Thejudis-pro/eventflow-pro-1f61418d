// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The browser bundle must never depend on build-time env injection being
// present: when VITE_SUPABASE_* is missing from a build environment, the
// generated Supabase client throws on first use and every public page hangs
// on "Chargement…". These two values are the public project URL and the
// publishable (anon) key — safe to ship to the client — so we inline them as
// a last-resort fallback into the `process.env[...]` branch of the generated
// client, client bundle only. `import.meta.env` still wins when injected.
const PUBLIC_SUPABASE_URL = "https://hszxrnonlxropnmywpgn.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VhOSxmnANo6JniU2TIOyxg_0ixmFJaK";

const supabasePublicEnvFallback = {
  name: "supabase-public-env-fallback",
  applyToEnvironment: (environment: { name: string }) => environment.name === "client",
  transform(code: string, id: string) {
    if (!id.includes("integrations/supabase/client")) return null;
    if (!code.includes('process.env["SUPABASE_URL"]')) return null;
    return code
      .replace('process.env["SUPABASE_URL"]', JSON.stringify(PUBLIC_SUPABASE_URL))
      .replace(
        'process.env["SUPABASE_PUBLISHABLE_KEY"]',
        JSON.stringify(PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      );
  },
};

export default defineConfig({
  vite: {
    plugins: [supabasePublicEnvFallback],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
