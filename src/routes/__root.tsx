import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import logoUrl from "../assets/logo-rt.png";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme-context";
import { MusicProvider } from "../lib/music-context";
import { AuthProvider } from "../lib/auth-context";
import { SettingsProvider } from "../lib/settings-context";
import { AppShell } from "../components/app-shell";
import { FloatingMusicPlayer } from "../components/music-player";
import { FloatingEmergencyButton } from "../components/emergency-button";
import { Footer } from "../components/footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="max-w-md w-full glass-strong rounded-3xl p-6 text-center space-y-4">
        <div className="text-xs uppercase tracking-widest text-primary font-bold">SiRT 06</div>
        <h1 className="text-xl font-bold">Modul sedang dalam pengembangan</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini belum tersedia atau sedang disiapkan. Silakan kembali ke Dashboard.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-xl glass px-4 py-2 text-sm font-semibold"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-glow"
          >
            ← Kembali ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dashboard — SiRT 06 Digital" },
      { name: "description", content: "Dashboard komunitas RT 06 / RW 07 Bogeman Wetan." },
      { name: "author", content: "RT 06 / RW 07 Bogeman Wetan" },
      { property: "og:title", content: "Dashboard — SiRT 06 Digital" },
      { property: "og:description", content: "Dashboard komunitas RT 06 / RW 07 Bogeman Wetan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Dashboard — SiRT 06 Digital" },
      { name: "twitter:description", content: "Dashboard komunitas RT 06 / RW 07 Bogeman Wetan." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/54d6e7dc-4075-47f1-87c1-b138f72b35cf/id-preview-ee6c4b88--bd1d0ef8-ca08-4c16-ae0c-78538308f65f.lovable.app-1783590437447.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/54d6e7dc-4075-47f1-87c1-b138f72b35cf/id-preview-ee6c4b88--bd1d0ef8-ca08-4c16-ae0c-78538308f65f.lovable.app-1783590437447.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/png", href: logoUrl },
      { rel: "apple-touch-icon", href: logoUrl },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <MusicProvider>
              <AppShell>
                <Outlet />
                <Footer />
              </AppShell>
              <FloatingMusicPlayer />
              <FloatingEmergencyButton />
            </MusicProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
