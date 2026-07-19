/**
 * Conversión entre unidad mayor (lo que el negocio escribe: "12000", "12.50") y
 * unidad menor (lo que guarda la DB: integer). El número de decimales lo decide
 * la moneda vía Intl: CLP tiene 0 (12000 = $12.000), USD tiene 2 (12.50 = 1250).
 */

export function currencyDecimals(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 0
    );
  } catch {
    return 0;
  }
}

/** "12.50" (mayor) → 1250 (menor) para USD; "12000" → 12000 para CLP. */
export function toMinorUnits(major: string, currency: string): number {
  const n = Number(major.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10 ** currencyDecimals(currency));
}

/** 1250 (menor) → "12.5" (mayor) para el input; 12000 → "12000" para CLP. */
export function fromMinorUnits(minor: number, currency: string): string {
  const d = currencyDecimals(currency);
  if (d === 0) return String(minor);
  return String(minor / 10 ** d);
}
