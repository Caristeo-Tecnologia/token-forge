import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  name?: string;
  defaultValue?: number | string;
  value?: number | string;
  onValueChange?: (value: number | null) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const formatDisplay = (raw: string): string => {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const intNum = intPart.replace(/^0+(?=\d)/, "") || "0";
  const withCommas = intNum.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
};

const sanitize = (input: string): string => {
  // keep digits and a single dot, max 2 decimals
  let s = input.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    const [i, d] = s.split(".");
    s = `${i}.${(d ?? "").slice(0, 2)}`;
  }
  return s;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ name, defaultValue, value, onValueChange, required, placeholder, className, id, disabled }, ref) => {
    const initial = defaultValue != null ? String(defaultValue) : value != null ? String(value) : "";
    const [raw, setRaw] = React.useState<string>(initial);

    React.useEffect(() => {
      if (value !== undefined) setRaw(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = sanitize(e.target.value);
      setRaw(next);
      const num = next === "" || next === "." ? null : Number(next);
      onValueChange?.(num);
    };

    const display = formatDisplay(raw);

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
          $
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          placeholder={placeholder ?? "0.00"}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm tabular-nums",
            className,
          )}
        />
        {name && (
          <input type="hidden" name={name} value={raw} required={required} />
        )}
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
