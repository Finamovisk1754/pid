import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lightning, PlayCircle, SlidersHorizontal, Gauge } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Switch } from "../components/ui/switch";
import { useApp } from "../lib/store";
import { simulateSystem, tuneController } from "../lib/api";
import { fmt, fmtPct, fmtTime } from "../lib/format";
import MetricCard from "../components/MetricCard";
import ResponseChart from "../components/ResponseChart";

export default function PIDControl() {
  const {
    identification,
    pid,
    setPid,
    setpoint,
    setSetpoint,
    simulation,
    setSimulation,
  } = useApp();

  const [mode, setMode] = useState("auto"); // 'auto' | 'manual'
  const [autoMethod, setAutoMethod] = useState("ziegler-nichols");
  const [simulating, setSimulating] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(true);

  const canRun = Boolean(identification);

  // Quando identificar um sistema ou mudar método, recalcula parâmetros automaticamente
  const refreshAutoTuning = useCallback(
    async (methodOverride) => {
      const method = methodOverride || autoMethod;
      if (!identification) return null;
      try {
        const res = await tuneController({
          k: identification.k,
          tau: identification.tau,
          theta: identification.theta,
          method,
        });
        setPid({ Kp: res.Kp, Ti: res.Ti, Td: res.Td, method });
        return res;
      } catch (e) {
        toast.error(`Erro na sintonia: ${e?.response?.data?.detail || e.message}`);
        return null;
      }
    },
    [identification, autoMethod, setPid]
  );

  // Ao entrar em modo auto ou mudar método, sintoniza
  useEffect(() => {
    if (mode === "auto" && identification) {
      refreshAutoTuning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMethod, mode, identification?.k, identification?.tau, identification?.theta]);

  const runSimulation = useCallback(async () => {
    if (!identification) {
      toast.error("Execute a identificação de Smith primeiro.");
      return;
    }
    setSimulating(true);
    try {
      // Tempo de simulação: ~8x tau + theta, mínimo 150s
      const t_sim = Math.max(150, 8 * identification.tau + 2 * identification.theta);
      const res = await simulateSystem({
        k: identification.k,
        tau: identification.tau,
        theta: identification.theta,
        Kp: pid.Kp,
        Ti: pid.Ti,
        Td: pid.Td,
        sp: setpoint,
        y0: identification.y0,
        u_bias: identification.u0,
        t_sim,
        dt: Math.max(0.05, t_sim / 3000),
      });
      setSimulation(res);
    } catch (e) {
      toast.error(`Falha ao simular: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setSimulating(false);
    }
  }, [identification, pid, setpoint, setSimulation]);

  // Auto-simulate quando pid muda e modo auto-simulate
  useEffect(() => {
    if (autoSimulate && identification && pid.Kp && pid.Ti >= 0) {
      const h = setTimeout(runSimulation, 250);
      return () => clearTimeout(h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid.Kp, pid.Ti, pid.Td, setpoint, autoSimulate, identification]);

  const simData = useMemo(() => {
    if (!simulation) return [];
    return simulation.time.map((t, i) => ({
      time: t,
      malhaAberta: simulation.y_open[i],
      malhaFechada: simulation.y_closed[i],
      sinalControle: simulation.u_closed[i],
    }));
  }, [simulation]);

  const series = [
    { key: "malhaAberta", name: "Malha aberta", color: "#64748B", strokeWidth: 1.8, dashed: true },
    { key: "malhaFechada", name: "Malha fechada (PID)", color: "#2563EB", strokeWidth: 2.2 },
  ];

  const closedMetrics = simulation?.metrics_closed;
  const markers = useMemo(() => {
    if (!closedMetrics) return [];
    const m = [];
    if (closedMetrics.peak_time != null && closedMetrics.peak != null) {
      m.push({ x: closedMetrics.peak_time, y: closedMetrics.peak, label: "Peak", color: "#EF4444" });
    }
    if (closedMetrics.t_90 != null) {
      m.push({ x: closedMetrics.t_90, y: identification?.y0 + 0.9 * (setpoint - (identification?.y0 || 0)), label: "90%", color: "#F59E0B" });
    }
    if (closedMetrics.settling_time != null) {
      m.push({ x: closedMetrics.settling_time, y: setpoint, label: "ts", color: "#10B981" });
    }
    return m;
  }, [closedMetrics, setpoint, identification]);

  const refLines = [{ y: setpoint, label: `SP = ${fmt(setpoint, 2)}`, color: "#111827", yAxisId: "left", position: "insideTopRight" }];

  if (!canRun) {
    return (
      <div className="tab-fade border border-slate-200 bg-white rounded-sm p-10 text-center">
        <Gauge size={28} className="mx-auto text-slate-400 mb-3" weight="regular" />
        <h3 className="text-base font-medium text-slate-900">Nenhum sistema identificado ainda</h3>
        <p className="text-sm text-slate-500 mt-1">
          Volte à aba <strong>Identificação</strong>, carregue o dataset e execute o método de Smith.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-fade space-y-6">
      {/* Plant summary */}
      <div className="border border-slate-200 bg-white rounded-sm p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat label="K" value={fmt(identification.k, 3)} />
        <MiniStat label="τ" value={fmt(identification.tau, 2)} unit="s" />
        <MiniStat label="θ" value={fmt(identification.theta, 2)} unit="s" />
        <MiniStat label="EQM" value={fmt(identification.mse, 4)} />
        <MiniStat label="θ/τ" value={fmt(identification.theta / identification.tau, 3)} hint="Razão de atraso" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sintonia */}
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-700">Sintonia PID</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Auto-sim</span>
              <Switch
                checked={autoSimulate}
                onCheckedChange={setAutoSimulate}
                data-testid="auto-simulate-toggle"
              />
            </div>
          </div>

          {/* Mode selector */}
          <RadioGroup
            value={mode}
            onValueChange={setMode}
            className="grid grid-cols-2 gap-2 mb-5"
          >
            <label
              className={`flex items-center justify-center gap-2 border rounded-sm px-3 py-2.5 cursor-pointer text-sm transition ${
                mode === "auto" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:border-slate-400"
              }`}
              data-testid="mode-auto-label"
            >
              <RadioGroupItem value="auto" className="sr-only" />
              <Lightning size={14} weight="regular" /> Automática
            </label>
            <label
              className={`flex items-center justify-center gap-2 border rounded-sm px-3 py-2.5 cursor-pointer text-sm transition ${
                mode === "manual" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:border-slate-400"
              }`}
              data-testid="mode-manual-label"
            >
              <RadioGroupItem value="manual" className="sr-only" />
              <SlidersHorizontal size={14} weight="regular" /> Manual
            </label>
          </RadioGroup>

          {mode === "auto" && (
            <div className="space-y-3 mb-5" data-testid="auto-tuning-section">
              <Label className="text-xs uppercase tracking-widest text-slate-500">Método</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAutoMethod("ziegler-nichols")}
                  className={`rounded-sm px-3 py-2.5 text-sm border transition ${
                    autoMethod === "ziegler-nichols"
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  data-testid="method-zn-btn"
                >
                  Ziegler-Nichols
                </button>
                <button
                  onClick={() => setAutoMethod("itae")}
                  className={`rounded-sm px-3 py-2.5 text-sm border transition ${
                    autoMethod === "itae"
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  data-testid="method-itae-btn"
                >
                  ITAE
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                {autoMethod === "ziegler-nichols"
                  ? "ZN (malha aberta): Kp=1.2·τ/(k·θ), Ti=2·θ, Td=0.5·θ"
                  : "ITAE servo (Rovira): Kp=(0.965/k)(θ/τ)^-0.85, Ti=τ/(0.796-0.1465·θ/τ), Td=τ·0.308·(θ/τ)^0.929"}
              </p>
            </div>
          )}

          {/* Parâmetros PID */}
          <div className="space-y-4" data-testid="pid-params-section">
            <PidSlider
              label="Kp"
              description="Ganho proporcional"
              value={pid.Kp}
              min={0}
              max={Math.max(10, pid.Kp * 3 || 10)}
              step={0.001}
              onChange={(v) => mode === "manual" && setPid({ ...pid, Kp: v })}
              disabled={mode !== "manual"}
              testId="kp-slider"
            />
            <PidSlider
              label="Ti"
              description="Tempo integrativo (s)"
              value={pid.Ti}
              min={0.1}
              max={Math.max(100, pid.Ti * 3 || 100)}
              step={0.01}
              onChange={(v) => mode === "manual" && setPid({ ...pid, Ti: v })}
              disabled={mode !== "manual"}
              testId="ti-slider"
            />
            <PidSlider
              label="Td"
              description="Tempo derivativo (s)"
              value={pid.Td}
              min={0}
              max={Math.max(20, pid.Td * 3 || 20)}
              step={0.01}
              onChange={(v) => mode === "manual" && setPid({ ...pid, Td: v })}
              disabled={mode !== "manual"}
              testId="td-slider"
            />
          </div>

          {/* Setpoint */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <Label htmlFor="sp-input" className="text-xs uppercase tracking-widest text-slate-500">
              Setpoint (SP)
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="sp-input"
                type="number"
                step="0.1"
                value={setpoint}
                onChange={(e) => setSetpoint(Number(e.target.value))}
                className="rounded-sm font-mono border-slate-300"
                data-testid="sp-input"
              />
              <Button
                onClick={runSimulation}
                disabled={simulating}
                className="rounded-sm bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap"
                data-testid="run-simulation-btn"
              >
                <PlayCircle size={16} weight="regular" className="mr-1" />
                {simulating ? "Simulando..." : "Sintonizar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Gráfico + métricas */}
        <div className="lg:col-span-2 space-y-6">
          <ResponseChart
            title="Resposta comparativa — Malha Aberta × Malha Fechada"
            data={simData}
            series={series}
            refLines={refLines}
            markers={markers}
            yLabel="y(t)"
            height={360}
            exportName="malha_fechada_pid"
            testId="pid-response-chart"
          />

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Tempo de subida (tr)"
              value={fmtTime(closedMetrics?.rise_time)}
              hint="10% → 90% de Δ"
              accent="blue"
              testId="metric-tr"
            />
            <MetricCard
              label="Tempo de acomodação (ts)"
              value={fmtTime(closedMetrics?.settling_time)}
              hint="Banda ±2% do SP"
              accent="slate"
              testId="metric-ts"
            />
            <MetricCard
              label="Overshoot (Mp)"
              value={fmtPct(closedMetrics?.overshoot)}
              hint="Pico acima do SP"
              accent="red"
              testId="metric-mp"
            />
            <MetricCard
              label="Erro regime (malha aberta)"
              value={fmt(simulation?.metrics_open?.ess, 3)}
              unit="u.e."
              hint={`SP − y∞ (MA)`}
              accent="amber"
              testId="metric-ess-open"
            />
          </div>

          {/* PID calculado display */}
          <div className="border border-slate-200 bg-white rounded-sm p-5" data-testid="pid-values-display">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Parâmetros do controlador PID — {pid.method === "itae" ? "ITAE" : "Ziegler-Nichols"}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <MiniStat label="Kp" value={fmt(pid.Kp, 3)} />
              <MiniStat label="Ti" value={fmt(pid.Ti, 2)} unit="s" />
              <MiniStat label="Td" value={fmt(pid.Td, 2)} unit="s" />
            </div>
            <div className="mt-4 text-xs font-mono text-slate-500">
              C(s) = Kp · (1 + 1/(Ti·s) + Td·s) = <span className="text-slate-900">
                {fmt(pid.Kp, 2)} · (1 + 1/({fmt(pid.Ti, 2)}·s) + {fmt(pid.Td, 2)}·s)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, hint }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-mono text-xl font-medium text-slate-900">{value}</span>
        {unit && <span className="font-mono text-xs text-slate-500">{unit}</span>}
      </div>
      {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function PidSlider({ label, description, value, min, max, step, onChange, disabled, testId }) {
  return (
    <div className={disabled ? "opacity-70" : ""}>
      <div className="flex items-baseline justify-between mb-1.5">
        <Label className="text-xs font-semibold text-slate-700">
          {label} <span className="font-normal text-slate-500">· {description}</span>
        </Label>
        <Input
          type="number"
          step={step}
          value={Number(value).toFixed(3)}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-24 h-7 rounded-sm font-mono text-xs border-slate-300"
          data-testid={`${testId}-input`}
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[Math.min(Math.max(value, min), max)]}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}
