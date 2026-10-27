import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

/**
 * Number input that keeps what you type ("1.", "") while focused and reports
 * a parsed number (or null when empty). Out-of-range values show an error and
 * are not reported.
 */
export function NumField({ value, onValue, min = 0, max, label, ...rest }: {
  value: number | null | undefined;
  onValue: (n: number | null) => void;
  min?: number;
  max: number;
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  const [text, setText] = useState(value == null || value === 0 ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null || value === 0 ? '' : String(value));
  }, [value]);
  const n = Number(text);
  const invalid = text.trim() !== '' && (!Number.isFinite(n) || n < min || n > max);
  return (
    <>
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        aria-label={label}
        aria-invalid={invalid}
        className={(rest.className ?? '') + (invalid ? ' input-invalid' : '')}
        value={text}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; if (!invalid) setText(value == null || value === 0 ? '' : String(value)); }}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const x = Number(t);
          if (t.trim() === '') onValue(null);
          else if (Number.isFinite(x) && x >= min && x <= max) onValue(x);
        }}
      />
      {invalid && <small className="input-error">{label} must be {min}–{max.toLocaleString('en-IN')}</small>}
    </>
  );
}
