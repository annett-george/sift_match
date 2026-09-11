import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Braces,
  Columns3,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Settings as SettingsIcon,
  Sparkles,
  Upload,
  EyeOff,
} from "lucide-react";
import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/resumes", label: "Resume Upload", icon: Upload },
  { to: "/jobs", label: "Job Descriptions", icon: FileText },
  { to: "/rankings", label: "Candidate Rankings", icon: ListOrdered },
  { to: "/comparison", label: "Comparison", icon: Columns3 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { blindMode, setBlindMode, aiMode } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar px-3 py-5 text-sidebar-foreground md:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Braces className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-bold leading-none">SiftMatch</p>
            <p className="mt-1 text-[11px] text-sidebar-foreground/60">AI Resume Screening</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="px-3 text-[11px] leading-relaxed text-sidebar-foreground/50">
          AI-assisted recommendation — final decision remains with recruiter.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:px-8">
          <Link to="/" className="font-display text-sm font-bold md:hidden">
            SiftMatch
          </Link>
          <div className="hidden text-sm text-muted-foreground md:block">
            Recruiter workspace · deterministic scoring · multi-agent pipeline
          </div>
          <div className="ml-auto flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Blind Screening</span>
              <Switch checked={blindMode} onCheckedChange={setBlindMode} aria-label="Toggle blind screening" />
            </label>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                aiMode
                  ? "border-strong/30 bg-strong/10 text-strong"
                  : "border-primary/25 bg-primary/10 text-primary",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiMode ? "AI Mode" : "Demo Mode"}
            </span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
