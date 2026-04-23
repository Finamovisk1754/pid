import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadSimple, Flask, CheckCircle, Pulse } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useApp } from "../lib/store";
import { fetchDefaultDataset, identifySystem, uploadDataset } from "../lib/api";
import { fmt } from "../lib/format";
import ResponseChart from "../components/ResponseChart";

export default function Identification() {
  const { dataset, setDataset, identification, setIdentification, setSetpoint } = useApp();
  const [loading, setLoading] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const fileRef = useRef(null);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDefaultDataset();
      setDataset(data);
      setIdentification(null);
      toast.success("Dataset do Grupo 9 carregado");
    } catch (e) {
      toast.error(`Falha ao carregar dataset: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [setDataset, setIdentification]);

  // Auto-load default dataset on mount
  useEffect(() => {
    if (!dataset) {
      loadDefault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await uploadDataset(file);
      setDataset(data);
      setIdentification(null);
      toast.success(`Dataset "${file.name}" carregado`);
    } catch (err) {
      toast.error(`Erro no upload: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runSmith = async () => {
    if (!dataset) {
      toast.error("Carregue um dataset antes.");
      return;
    }
    setIdentifying(true);
    try {
      const res = await identifySystem({
        time: dataset.time,
        input: dataset.input,
        output: dataset.output,
      });
      setIdentification(res);
      // Atualiza setpoint default = valor final teórico
      setSetpoint(Number((res.y_inf).toFixed(3)));
      toast.success("Identificação de Smith concluída");
    } catch (e) {
      toast.error(`Erro na identificação: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setIdentifying(false);
    }
  };

  const chartData = useMemo(() => {
    if (!dataset) return [];
    const { time, input, output } = dataset;
    const model = identification?.y_model || [];
    return time.map((t, i) => ({
      time: t,
      entrada: input[i],
      saida: output[i],
      modelo: model[i] ?? null,
    }));
  }, [dataset, identification]);

  const series = useMemo(() => {
    const base = [
      { key: "saida", name: "Saída medida (PV)", color: "#2563EB", strokeWidth: 2 },
      { key: "entrada", name: "Entrada (u)", color: "#0F172A", strokeWidth: 1.5, yAxisId: "right" },
    ];
    if (identification) {
      base.push({ key: "modelo", name: "Modelo FOPDT (Smith)", color: "#EF4444", strokeWidth: 2, dashed: true });
    }
    return base;
  }, [identification]);

  const markers = useMemo(() => {
    if (!identification) return [];
    const { t_step, theta, t1, t2, y0, y_inf } = identification;
    const y_t1 = y0 + 0.283 * (y_inf - y0);
    const y_t2 = y0 + 0.632 * (y_inf - y0);
    return [
      { x: t_step + t1, y: y_t1, label: "28.3%", color: "#EF4444" },
      { x: t_step + t2, y: y_t2, label: "63.2%", color: "#EF4444" },
      { x: t_step + theta, y: y0, label: "θ", color: "#F59E0B" },
    ];
  }, [identification]);

  const refParams = dataset?.reference_params;

  return (
    <div className="tab-fade space-y-6">
      {/* Controles */}
      <div className="border border-slate-200 bg-white rounded-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-slate-900">Carregamento de dados experimentais</h2>
            <p className="text-sm text-slate-500 mt-1">
              Dataset padrão do Grupo 9 carregado automaticamente. Você também pode enviar um arquivo <code className="font-mono">.mat</code> próprio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".mat"
              onChange={onUpload}
              className="hidden"
              data-testid="dataset-file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="rounded-sm border-slate-300 hover:bg-slate-50"
              data-testid="upload-dataset-btn"
            >
              <UploadSimple size={16} className="mr-2" weight="regular" />
              Upload .mat
            </Button>
            <Button
              onClick={loadDefault}
              disabled={loading}
              variant="outline"
              className="rounded-sm border-slate-300"
              data-testid="load-default-dataset-btn"
            >
              <Pulse size={16} className="mr-2" weight="regular" />
              Dataset Grupo 9
            </Button>
            <Button
              onClick={runSmith}
              disabled={!dataset || identifying}
              className="rounded-sm bg-slate-900 hover:bg-slate-800 text-white"
              data-testid="run-smith-btn"
            >
              <Flask size={16} className="mr-2" weight="regular" />
              {identifying ? "Identificando..." : "Executar Smith"}
            </Button>
          </div>
        </div>

        {dataset && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 border-t border-slate-100 pt-4">
            <Badge variant="outline" className="rounded-sm font-mono border-slate-300" data-testid="dataset-name-badge">
              {dataset.name}
            </Badge>
            <span>N = {dataset.time.length} amostras</span>
            <span>·</span>
            <span>t ∈ [{fmt(dataset.time[0], 2)}; {fmt(dataset.time[dataset.time.length - 1], 2)}] s</span>
            <span>·</span>
            <span>Δt ≈ {fmt(dataset.time[1] - dataset.time[0], 3)} s</span>
            {refParams && (
              <>
                <span className="ml-4 text-slate-400">|</span>
                <span className="text-slate-500">Referência do dataset:</span>
                <span>K={fmt(refParams.k, 3)}</span>
                <span>τ={fmt(refParams.tau, 3)}</span>
                <span>θ={fmt(refParams.theta, 3)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Parâmetros identificados */}
      {identification && (
        <div className="border border-slate-200 bg-white rounded-sm p-5" data-testid="identified-params-panel">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle size={18} weight="regular" className="text-emerald-600" />
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-700">
              Parâmetros identificados (FOPDT - método de Smith)
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-slate-100">
            <ParamCell label="Ganho estático K" value={fmt(identification.k, 4)} unit="" testId="param-k" />
            <ParamCell label="Constante τ" value={fmt(identification.tau, 3)} unit="s" testId="param-tau" />
            <ParamCell label="Atraso θ" value={fmt(identification.theta, 3)} unit="s" testId="param-theta" />
            <ParamCell label="EQM (MSE)" value={fmt(identification.mse, 5)} unit="" testId="param-mse" />
          </div>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-500">
            <div>t₁ (28.3%) = <span className="text-slate-900">{fmt(identification.t1, 3)} s</span></div>
            <div>t₂ (63.2%) = <span className="text-slate-900">{fmt(identification.t2, 3)} s</span></div>
            <div>y₀ = <span className="text-slate-900">{fmt(identification.y0, 3)}</span></div>
            <div>y∞ = <span className="text-slate-900">{fmt(identification.y_inf, 3)}</span></div>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-mono">
            G(s) = <span className="text-slate-900">{fmt(identification.k, 3)} · e<sup>-{fmt(identification.theta, 2)} s</sup></span>
            <span className="mx-2">/</span>
            <span className="text-slate-900">({fmt(identification.tau, 2)} s + 1)</span>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <ResponseChart
        title="Resposta ao Degrau — Malha Aberta"
        data={chartData}
        series={series}
        markers={markers}
        showRightAxis={true}
        yLabel="Saída y(t)"
        yRightLabel="Entrada u(t)"
        height={420}
        exportName="malha_aberta_smith"
        testId="open-loop-chart"
      />
    </div>
  );
}

function ParamCell({ label, value, unit, testId }) {
  return (
    <div className="px-5 py-5 border-r last:border-r-0 border-slate-100" data-testid={testId}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-medium text-slate-900 tracking-tight">{value}</span>
        {unit && <span className="font-mono text-xs text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}
