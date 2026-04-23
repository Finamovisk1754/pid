import { useMemo } from "react";
import { ChartLineUp, Info, ArrowsOut } from "@phosphor-icons/react";
import { useApp } from "../lib/store";
import { fmt, fmtPct, fmtTime } from "../lib/format";
import MetricCard from "../components/MetricCard";
import ResponseChart from "../components/ResponseChart";

export default function Charts() {
  const { identification, simulation, setpoint, pid } = useApp();

  const data = useMemo(() => {
    if (!simulation) return [];
    return simulation.time.map((t, i) => ({
      time: t,
      malhaAberta: simulation.y_open[i],
      malhaFechada: simulation.y_closed[i],
      controle: simulation.u_closed[i],
    }));
  }, [simulation]);

  if (!simulation || !identification) {
    return (
      <div className="tab-fade border border-slate-200 bg-white rounded-sm p-10 text-center">
        <ChartLineUp size={28} weight="regular" className="mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-medium text-slate-900">Sem simulação para visualizar</h3>
        <p className="text-sm text-slate-500 mt-1">
          Na aba <strong>Controle PID</strong>, execute a sintonia para gerar os gráficos comparativos.
        </p>
      </div>
    );
  }

  const mClosed = simulation.metrics_closed || {};
  const mOpen = simulation.metrics_open || {};

  const comparativeSeries = [
    { key: "malhaAberta", name: "Malha aberta", color: "#64748B", strokeWidth: 1.8, dashed: true },
    { key: "malhaFechada", name: "Malha fechada (PID)", color: "#2563EB", strokeWidth: 2.2 },
  ];

  const controlSeries = [
    { key: "controle", name: "Sinal de controle u(t)", color: "#10B981", strokeWidth: 1.8 },
  ];

  const markersClosed = [
    mClosed.peak_time != null && {
      x: mClosed.peak_time,
      y: mClosed.peak,
      label: `Peak ${fmt(mClosed.peak, 2)}`,
      color: "#EF4444",
    },
    mClosed.settling_time != null && {
      x: mClosed.settling_time,
      y: setpoint,
      label: `ts ${fmt(mClosed.settling_time, 1)}s`,
      color: "#10B981",
    },
    mClosed.t_90 != null && {
      x: mClosed.t_90,
      y: identification.y0 + 0.9 * (setpoint - identification.y0),
      label: "90%",
      color: "#F59E0B",
    },
  ].filter(Boolean);

  const refLines = [{ y: setpoint, label: `SP = ${fmt(setpoint, 2)}`, color: "#111827", yAxisId: "left", position: "insideTopRight" }];

  return (
    <div className="tab-fade space-y-6">
      {/* Resumo */}
      <div className="border border-slate-200 bg-white rounded-sm p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Visualização de resultados
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Comparação entre a resposta em malha aberta e a malha fechada com o controlador PID sintonizado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 border border-slate-200 rounded-sm text-slate-600">
            K={fmt(identification.k, 3)} · τ={fmt(identification.tau, 2)}s · θ={fmt(identification.theta, 2)}s
          </span>
          <span className="px-2 py-1 border border-blue-200 text-blue-700 rounded-sm bg-blue-50">
            {pid.method === "itae" ? "ITAE" : "Ziegler-Nichols"} · Kp={fmt(pid.Kp, 2)} Ti={fmt(pid.Ti, 2)} Td={fmt(pid.Td, 2)}
          </span>
          <span className="px-2 py-1 border border-slate-900 text-white bg-slate-900 rounded-sm">SP = {fmt(setpoint, 2)}</span>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="metrics-grid">
        <MetricCard label="Tempo de subida (tr)" value={fmtTime(mClosed.rise_time)} hint="10% → 90%" accent="blue" testId="charts-metric-tr" />
        <MetricCard label="Tempo de acomodação (ts)" value={fmtTime(mClosed.settling_time)} hint="Banda ±2%" accent="slate" testId="charts-metric-ts" />
        <MetricCard label="Overshoot (Mp)" value={fmtPct(mClosed.overshoot)} hint={`Pico: ${fmt(mClosed.peak, 2)}`} accent="red" testId="charts-metric-mp" />
        <MetricCard label="Erro regime (MA)" value={fmt(mOpen.ess, 3)} unit="u.e." hint="Referente à malha aberta" accent="amber" testId="charts-metric-ess" />
      </div>

      {/* Gráfico principal - comparativo */}
      <ResponseChart
        title="Comparativo — Malha Aberta × Malha Fechada"
        data={data}
        series={comparativeSeries}
        refLines={refLines}
        markers={markersClosed}
        yLabel="y(t)"
        height={440}
        exportName="comparativo_ma_mf"
        testId="comparative-chart"
      />

      {/* Gráfico secundário - sinal de controle */}
      <ResponseChart
        title="Esforço de controle"
        data={data}
        series={controlSeries}
        yLabel="u(t)"
        height={260}
        exportName="sinal_controle"
        testId="control-signal-chart"
      />

      {/* Nota informativa */}
      <div className="border border-slate-200 bg-slate-50 rounded-sm p-4 flex gap-3 text-sm text-slate-600">
        <Info size={18} weight="regular" className="text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Como interpretar:</strong>{" "}
          a linha tracejada cinza representa a resposta natural do sistema (malha aberta), enquanto a linha azul mostra a
          planta controlada pelo PID. Os marcadores vermelhos/verdes indicam os pontos característicos (pico, tempo de
          acomodação, 90% da variação). Use o botão <ArrowsOut size={12} weight="regular" className="inline mx-0.5" />
          <span className="font-semibold">Exportar PNG</span> em cada gráfico para salvar a figura.
        </div>
      </div>
    </div>
  );
}
