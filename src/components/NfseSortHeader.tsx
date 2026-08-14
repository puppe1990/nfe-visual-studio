import { ArrowDown, ArrowUp } from "lucide-react";

import type { NfseListDir, NfseListSort } from "../domain/types";

export function NfseSortHeader({
  label,
  column,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  column: NfseListSort;
  active: NfseListSort;
  dir: NfseListDir;
  onSort: (column: NfseListSort) => void;
  align?: "left" | "right";
}) {
  const isActive = active === column;
  return (
    <th
      className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${
          isActive ? "text-foreground" : "hover:text-foreground"
        }`}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <span className="size-3.5" aria-hidden />
        )}
      </button>
    </th>
  );
}
