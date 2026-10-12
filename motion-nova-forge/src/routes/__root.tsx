import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CustomCursor } from "@/components/fx/CustomCursor";
import { AmbientBackdrop } from "@/components/fx/AmbientBackdrop";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/hooks/useAuth";
import { A11yProvider } from "@/hooks/useA11y";
import { AccessibilityPanel } from "@/components/a11y/AccessibilityPanel";
import { PublicAssistantWidget } from "@/components/assistant/PublicAssistantWidget";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative z-10 max-w-md text-center">
        <p className="font-display text-[9rem] leading-none text-gradient">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Signal perdu</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette coordonnée ne fait pas partie de la grille de l'académie. Reprenez votre chemin vers un terrain solide.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="electric">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
          <Button asChild variant="glass">
            <Link to="/trainings">Explorer les formations</Link>
          </Button>
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Cette page n'a pas pu se charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur s'est produite côté plateforme. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="electric"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Réessayer
          </Button>
          <Button asChild variant="glass">
            <a href="/">Accueil</a>
          </Button>
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
      { title: "i-Motion Academy — Formations professionnelles" },
      {
        name: "description",
        content:
          "i-Motion Academy propose des formations professionnelles en EMS, coaching, bien-être, langues, intelligence artificielle et parcours diplômants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter+Tight:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isApp = pathname.startsWith("/dashboard");
  const isAuth = pathname === "/login" || pathname === "/register";

  return (
    <QueryClientProvider client={queryClient}>
      <A11yProvider>
      <AuthProvider>
      <AmbientBackdrop />
      <CustomCursor />
      <Navbar />
      <main id="content" className="relative">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </main>
      {!isApp && !isAuth && <Footer />}
      <AccessibilityPanel />
      {!isApp && !isAuth && <PublicAssistantWidget />}
      <Toaster position="top-right" />
      </AuthProvider>
      </A11yProvider>
    </QueryClientProvider>
  );
}
