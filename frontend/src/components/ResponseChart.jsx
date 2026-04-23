import { useRef } from "react";
import html2canvas from "html2canvas";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts";
import { Button } from "../components/ui/button";
import { DownloadSimple } from "@phosphor-icons/react";

const palette = {
  processo: "#2563EB",
  modelo: "#EF4444",
  entrada: "#0F172A",
  malhaAberta: "#64748B",
  malhaFechada: "#2563EB",
  setpoint: "#111827",
  marker: "#EF4444",
  grid: "#E2E8F0",
};

/**
 * series: Array<{ key:string, name:string, color?:string, dashed?:boolean, yAxisId?:'left'|'right' }>
 * data: Array<object> linha única com time + valores
 * markers: Array<{ x:number, y:number, label:string, color?:string }>
 * refLines: Array<{ y?:number, x?:number, label:string, color?:string, yAxisId?:string }>
 */
export default function ResponseChart({
  title,
  data,
  series,
  markers = [],
  refLines = [],
  xKey = "time",
  xLabel = "Tempo (s)",
  yLabel = "Saída",
  yRightLabel = null,
  height = 380,
  exportName = "grafico",
  testId = "response-chart",
  showRightAxis = false,
}) {
  const wrapRef = useRef(null);

  const onExport = async () => {
    if (!wrapRef.current) return;
    const canvas = await html2canvas(wrapRef.current, { backgroundColor: "#ffffff", scale: 2 });
    const link = document.createElement("a");
    link.download = `${exportName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="border border-slate-200 bg-white rounded-sm" data-testid={testId}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-700">
          {title}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm border-slate-300 hover:bg-slate-900 hover:text-white"
          onClick={onExport}
          data-testid={`${testId}-export-btn`}
        >
          <DownloadSimple size={14} className="mr-1.5" weight="regular" />
          Exportar PNG
        </Button>
      </div>
      <div ref={wrapRef} className="p-4 bg-white">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 12, right: showRightAxis ? 40 : 24, bottom: 32, left: 12 }}>
            <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              type="number"
              domain={[(dataMin) => Math.floor(dataMin), (dataMax) => Math.ceil(dataMax)]}
              tickFormatter={(v) => typeof v === "number" ? (v >= 100 ? v.toFixed(0) : v.toFixed(1)) : v}
            >
              <Label value={xLabel} offset={-20} position="insideBottom" fill="#475569" fontSize={12} />
            </XAxis>
            <YAxis
              yAxisId="left"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            >
              <Label angle={-90} value={yLabel} position="insideLeft" offset={-2} fill="#475569" fontSize={12} />
            </YAxis>
            {showRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              >
                <Label angle={90} value={yRightLabel || ""} position="insideRight" offset={-4} fill="#475569" fontSize={12} />
              </YAxis>
            )}
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "none",
                borderRadius: 2,
                color: "#fff",
                fontSize: 12,
              }}
              labelStyle={{ color: "#94a3b8", fontSize: 11 }}
              formatter={(v, n) => [typeof v === "number" ? v.toFixed(3) : v, n]}
              labelFormatter={(v) => `t = ${typeof v === "number" ? v.toFixed(2) : v} s`}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ paddingBottom: 6, fontSize: 12 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                yAxisId={s.yAxisId || "left"}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color || palette.processo}
                strokeWidth={s.strokeWidth || 2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
            {refLines.map((r, i) => (
              <ReferenceLine
                key={`rl-${i}`}
                y={r.y}
                x={r.x}
                yAxisId={r.yAxisId || "left"}
                stroke={r.color || "#94a3b8"}
                strokeDasharray="4 4"
                label={{ value: r.label, position: r.position || "right", fill: r.color || "#475569", fontSize: 11 }}
              />
            ))}
            {markers.map((m, i) => (
              <ReferenceDot
                key={`md-${i}`}
                x={m.x}
                y={m.y}
                yAxisId={m.yAxisId || "left"}
                r={5}
                fill={m.color || palette.marker}
                stroke="#fff"
                strokeWidth={2}
                label={{ value: m.label, position: "top", fill: m.color || "#b91c1c", fontSize: 11, fontFamily: "IBM Plex Mono" }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
