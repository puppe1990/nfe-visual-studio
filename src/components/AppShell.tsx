import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { getCurrentUserFn, logoutFn } from "../fns/auth-functions";
import {
  Bell,
  FileCheck,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/emitir-nfse", label: "Emitir NFS-e", icon: Plus },
  { to: "/nfse", label: "NFS-e emitidas", icon: FileCheck },
  { to: "/emitir", label: "Emitir NF-e", icon: FileText },
  { to: "/notas", label: "NF-e emitidas", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  children,
  companyName,
}: {
  children: ReactNode;
  companyName?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentUserFn().then((result) => {
      if (result.ok) setUserEmail(result.data.user.email);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <FileCheck className="size-5" />
              </div>
              <div>
                <div className="leading-tight font-semibold">NFeFácil</div>
                <div className="text-xs text-muted-foreground">Emissão de NF-e</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active =
                to === "/"
                  ? pathname === "/"
                  : pathname === to || pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                  }
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <div className="rounded-lg bg-secondary p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ background: "var(--success)" }}
                />
                SEFAZ adapter
              </div>
              <div className="mt-1 text-muted-foreground">
                NFS-e Pref. SP · oficial
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/60 px-8 backdrop-blur">
            <div className="relative w-96 max-w-full">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border border-transparent bg-secondary pr-3 pl-9 text-sm outline-none focus:border-ring focus:bg-background"
                placeholder="Buscar notas, clientes, produtos..."
                disabled
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <Bell className="size-4" />
              </button>
              <div className="flex items-center gap-3 border-l border-border pl-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium">
                    {companyName ?? "Empresa"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userEmail ?? "…"}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    void logoutFn().then(() => navigate({ to: "/login" }));
                  }}
                >
                  Sair
                </button>
                <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.14_200)] text-sm font-medium text-primary-foreground">
                  NF
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
