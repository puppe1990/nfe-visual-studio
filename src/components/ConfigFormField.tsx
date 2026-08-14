import { PasswordInput } from "./PasswordInput";

export type ConfigFormFeedback = {
  saving: boolean;
  setSaving: (next: boolean) => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
};

export function ConfigFormField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      {type === "password" ? (
        <PasswordInput value={value} onChange={onChange} required={required} />
      ) : (
        <input
          type={type}
          className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </label>
  );
}
