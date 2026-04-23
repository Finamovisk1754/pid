export function fmt(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return Number(value).toExponential(digits);
  }
  return Number(value).toFixed(digits);
}

export function fmtTime(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(2)} s`;
}

export function fmtPct(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)} %`;
}
