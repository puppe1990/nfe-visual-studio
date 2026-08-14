import type {
  InvoiceStatus,
  NfseListDir,
  NfseListSort,
} from "../domain/types";

export type NfseSearch = {
  status?: InvoiceStatus | "all";
  customerId?: number;
  from?: string;
  to?: string;
  page?: number;
  sort?: NfseListSort;
  dir?: NfseListDir;
};

const STATUS_VALUES = [
  "all",
  "draft",
  "pending",
  "authorized",
  "rejected",
  "canceled",
] as const;

const SORT_VALUES: NfseListSort[] = [
  "issuedAt",
  "nfseNumber",
  "total",
  "customer",
  "status",
];

export function parseNfseSearch(
  search: Record<string, unknown>,
): NfseSearch {
  const status = STATUS_VALUES.includes(
    search.status as (typeof STATUS_VALUES)[number],
  )
    ? (search.status as InvoiceStatus | "all")
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
  const sort = SORT_VALUES.includes(search.sort as NfseListSort)
    ? (search.sort as NfseListSort)
    : undefined;
  const dir =
    search.dir === "asc" || search.dir === "desc" ? search.dir : undefined;
  return {
    status: status === "all" ? undefined : status,
    customerId: Number.isFinite(customerId) ? customerId : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    page:
      Number.isFinite(page) && page && page > 1 ? Math.floor(page) : undefined,
    sort,
    dir,
  };
}
