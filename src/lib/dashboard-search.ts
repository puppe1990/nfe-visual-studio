import type {
  DashboardKindFilter,
  DashboardStatusFilter,
} from "../domain/types";

export type DashboardSearch = {
  kind?: DashboardKindFilter;
  status?: DashboardStatusFilter;
  customerId?: number;
  from?: string;
  to?: string;
  page?: number;
};

const STATUS_VALUES = [
  "all",
  "draft",
  "pending",
  "authorized",
  "rejected",
  "canceled",
] as const;

export function parseDashboardSearch(
  search: Record<string, unknown>,
): DashboardSearch {
  const kind =
    search.kind === "nfe" || search.kind === "nfse" ? search.kind : "all";
  const status = STATUS_VALUES.includes(
    search.status as (typeof STATUS_VALUES)[number],
  )
    ? (search.status as DashboardStatusFilter)
    : "all";
  const customerRaw = search.customerId;
  const customerId =
    typeof customerRaw === "number"
      ? customerRaw
      : typeof customerRaw === "string" && customerRaw
        ? Number(customerRaw)
        : undefined;
  const pageRaw = search.page;
  const page =
    typeof pageRaw === "number"
      ? pageRaw
      : typeof pageRaw === "string" && pageRaw
        ? Number(pageRaw)
        : undefined;
  return {
    kind: kind === "all" ? undefined : kind,
    status: status === "all" ? undefined : status,
    customerId: Number.isFinite(customerId) ? customerId : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    page:
      Number.isFinite(page) && page && page > 1 ? Math.floor(page) : undefined,
  };
}
