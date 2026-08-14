import { useState } from "react";

import type { Inutilization } from "../domain/types";
import { formatDateTime } from "../lib/invoice-labels";
import { inutilizeNumbersFn } from "../fns/nfe-functions";
import {
  ConfigFormField,
  type ConfigFormFeedback,
} from "./ConfigFormField";

export function ConfigInutilizationForm({
  inutilizations,
  feedback,
  onSaved,
}: {
  inutilizations: Inutilization[];
  feedback: ConfigFormFeedback;
  onSaved: () => Promise<void>;
}) {
  const { saving, setSaving, setError, setSuccess } = feedback;
  const [inutFrom, setInutFrom] = useState("");
  const [inutTo, setInutTo] = useState("");
  const [inutJust, setInutJust] = useState("");

  async function onInutilize(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await inutilizeNumbersFn({
      data: {
        numberFrom: Number(inutFrom),
        numberTo: Number(inutTo),
        justification: inutJust,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setInutFrom("");
    setInutTo("");
    setInutJust("");
    setSuccess(
      `Inutilização autorizada · prot ${result.data.inutilization.protocol}`,
    );
    await onSaved();
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="font-semibold">Inutilizar numeração</h2>
      <form onSubmit={onInutilize} className="grid gap-3 sm:grid-cols-2">
        <ConfigFormField
          label="Número inicial"
          value={inutFrom}
          onChange={setInutFrom}
          required
        />
        <ConfigFormField
          label="Número final"
          value={inutTo}
          onChange={setInutTo}
          required
        />
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted-foreground">
            Justificativa (mín. 15 caracteres)
          </span>
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-background p-3 text-sm"
            value={inutJust}
            onChange={(e) => setInutJust(e.target.value)}
            required
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
          >
            Inutilizar faixa
          </button>
        </div>
      </form>

      {inutilizations.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase">
              <th className="py-2">Faixa</th>
              <th className="py-2">Protocolo</th>
              <th className="py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {inutilizations.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-2 font-mono text-xs">
                  {row.series}/{row.numberFrom}–{row.numberTo}
                </td>
                <td className="py-2 font-mono text-xs">{row.protocol}</td>
                <td className="py-2 text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
