export default function MetricCard({
  label,
  value,
  unit = "",
  hint = null,
  accent = "slate",
  testId,
}) {
  const accentMap = {
    slate: "text-slate-900",
    blue: "text-blue-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };
  return (
    <div
      className="border border-slate-200 bg-white rounded-sm p-5 flex flex-col justify-between min-h-[120px]"
      data-testid={testId}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="flex items-end gap-1 mt-3">
        <span className={`font-mono text-3xl font-medium tracking-tight ${accentMap[accent] || accentMap.slate}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-500 mb-1.5">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-2">{hint}</div>}
    </div>
  );
}
