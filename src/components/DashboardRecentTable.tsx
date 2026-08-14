import type { DashboardRecentItem } from "../domain/types";
import { formatDateTime } from "../lib/invoice-labels";
import { formatCents } from "../lib/money";

import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export function DashboardRecentTable({
  rows,
}: {
  rows: DashboardRecentItem[];
}) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Nenhuma nota neste filtro.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="px-6 py-3 font-medium">Nº</th>
            <th className="px-6 py-3 font-medium">Tipo</th>
            <th className="px-6 py-3 font-medium">Cliente</th>
            <th className="px-6 py-3 font-medium">Data</th>
            <th className="px-6 py-3 font-medium">Valor</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr
              key={n.id}
              className="border-t border-border hover:bg-secondary/50"
            >
              <td className="px-6 py-3 font-mono text-xs">{n.numberLabel}</td>
              <td className="px-6 py-3 text-xs text-muted-foreground">
                {n.kind === "nfse" ? "NFS-e" : "NF-e"}
              </td>
              <td className="px-6 py-3">{n.customerName}</td>
              <td className="px-6 py-3 text-muted-foreground">
                {formatDateTime(n.issuedAt ?? n.createdAt)}
              </td>
              <td className="px-6 py-3 font-medium">
                {formatCents(n.totalCents)}
              </td>
              <td className="px-6 py-3">
                <InvoiceStatusBadge status={n.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
