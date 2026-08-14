import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardStatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneColor: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
        <div
          className="grid size-10 place-items-center rounded-lg"
          style={{
            background: `color-mix(in oklch, ${toneColor[tone]} 12%, transparent)`,
            color: toneColor[tone],
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DashboardBarChart({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const max = Math.max(...data, 1);
  const compact = data.length > 14;
  return (
    <div className="flex h-52 items-end justify-between gap-1 overflow-x-auto">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex h-full min-w-4 flex-1 flex-col items-center gap-2"
        >
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-primary to-[oklch(0.6_0.14_215)] transition-all hover:opacity-80"
              style={{
                height: `${(v / max) * 100}%`,
                minHeight: v > 0 ? 4 : 0,
              }}
              title={`${labels[i] ?? ""}: ${v} notas`}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {compact && i % 4 !== 0 ? "" : (labels[i] ?? "")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardQuickLink({
  to,
  icon,
  label,
  desc,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary"
    >
      <div className="grid size-9 place-items-center rounded-md bg-secondary text-primary group-hover:bg-background">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
