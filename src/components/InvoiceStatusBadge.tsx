import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import type { InvoiceStatus } from "../domain/types";
import { invoiceStatusLabels } from "../lib/invoice-labels";

const STATUS_TONE: Record<
  InvoiceStatus,
  { color: string; icon: "ok" | "clock" | "alert" }
> = {
  authorized: { color: "var(--success)", icon: "ok" },
  pending: { color: "var(--warning)", icon: "clock" },
  draft: { color: "var(--muted-foreground)", icon: "clock" },
  rejected: { color: "var(--destructive)", icon: "alert" },
  canceled: { color: "var(--muted-foreground)", icon: "alert" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
      style={{
        background: `color-mix(in oklch, ${tone.color} 14%, transparent)`,
        color: tone.color,
      }}
    >
      {tone.icon === "ok" ? (
        <CheckCircle2 className="size-3" />
      ) : tone.icon === "clock" ? (
        <Clock className="size-3" />
      ) : (
        <AlertCircle className="size-3" />
      )}
      {invoiceStatusLabels[status]}
    </span>
  );
}
