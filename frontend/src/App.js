import { useState } from "react";
import "@/App.css";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/store";
import Identification from "@/pages/Identification";
import PIDControl from "@/pages/PIDControl";
import Charts from "@/pages/Charts";
import { Circuitry, Cpu, ChartLineUp } from "@phosphor-icons/react";

function AppInner() {
  const [tab, setTab] = useState("identificacao");
  return (
    <div className="App min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center rounded-sm">
              <Circuitry size={20} weight="regular" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Controle Automático · C213
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Dashboard PID — Grupo 9
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
            <span className="hidden md:inline">Identificação de Smith</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">Ziegler-Nichols + ITAE</span>
            <span className="hidden md:inline">·</span>
            <span className="px-2 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-sm">
              ● Online
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full" data-testid="main-tabs">
          <TabsList className="w-full justify-start bg-transparent p-0 border-b border-slate-200 rounded-none h-auto gap-0">
            <TabTrigger value="identificacao" icon={<Circuitry size={16} weight="regular" />} testId="tab-identificacao">
              1. Identificação
            </TabTrigger>
            <TabTrigger value="pid" icon={<Cpu size={16} weight="regular" />} testId="tab-pid">
              2. Controle PID
            </TabTrigger>
            <TabTrigger value="graficos" icon={<ChartLineUp size={16} weight="regular" />} testId="tab-graficos">
              3. Gráficos
            </TabTrigger>
          </TabsList>

          <TabsContent value="identificacao" className="mt-6 focus-visible:outline-none">
            <Identification />
          </TabsContent>
          <TabsContent value="pid" className="mt-6 focus-visible:outline-none">
            <PIDControl />
          </TabsContent>
          <TabsContent value="graficos" className="mt-6 focus-visible:outline-none">
            <Charts />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="max-w-7xl mx-auto px-4 md:px-8 py-6 text-xs text-slate-400 font-mono">
        C213 — Sistemas de Controle Automático · Dataset Grupo 9
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}

function TabTrigger({ value, children, icon, testId }) {
  return (
    <TabsTrigger
      value={value}
      data-testid={testId}
      className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 text-sm px-4 py-3 hover:text-slate-800 transition-colors"
    >
      {icon}
      {children}
    </TabsTrigger>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
