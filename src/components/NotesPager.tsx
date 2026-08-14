import { ChevronLeft, ChevronRight } from "lucide-react";

export function NotesPager({
  page,
  pageSize,
  total,
  onPage,
  padClass = "px-6",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  padClass?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 ${padClass}`}
    >
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-3.5" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
