# Dashboard PID - Grupo 9 (C213)

## Original Problem Statement
Carregamento de dataset .mat, identificação por Smith da curva em malha aberta, projeto de controladores PID com Ziegler-Nichols e ITAE, visualização em tempo real comparando malha aberta e fechada. Painel de métricas (tr, ts, Mp, ess). Interface gráfica com 3 abas: Identificação, Controle PID, Gráficos. Grupo 9 do projeto C213 (PROJETO_C213_PID.pdf).

## User Personas
- Estudantes de engenharia (C213 — Sistemas de Controle Automático) executando o projeto final em grupo.

## Core Requirements (static)
- Carregar dataset .mat (suporte ao padrão do Grupo 9 e upload customizado)
- Identificar FOPDT via Método de Smith e exibir K, τ, θ, EQM
- Sintonia PID Ziegler-Nichols e ITAE (automática e manual)
- Simulação em malha aberta e fechada com atraso puro (delay buffer + Euler)
- Painel com tr, ts, Mp, ess
- Marcadores visuais (28.3%, 63.2%, θ, Peak, ts, 90%) e legendas
- Exportação de gráficos em PNG
- 3 abas: Identificação · Controle PID · Gráficos

## Architecture
- Backend FastAPI (Python) + scipy + python-control
  - `control_engine.py`: parse_mat_file, smith_identification, tune_ziegler_nichols, tune_itae, simulate_open_loop, simulate_closed_loop, compute_metrics
  - `server.py`: /api/dataset/default, /api/dataset/upload, /api/identify, /api/tune, /api/simulate
- Frontend React 19 + Recharts 3 + Shadcn UI + Tailwind
  - `App.js` + `AppProvider` state context
  - `pages/Identification.jsx`, `pages/PIDControl.jsx`, `pages/Charts.jsx`
  - `components/ResponseChart.jsx`, `components/MetricCard.jsx`
  - html2canvas para exportação PNG

## What's Been Implemented (2026-04-23)
- Backend completo (Smith, ZN, ITAE, simulação malha aberta/fechada, métricas)
- Frontend com 3 abas e auto-load do dataset Grupo 9
- Identificação Smith validada contra parâmetros de referência (k=0.747 vs 0.75, τ=33.63 vs 34, θ=9.06 vs 9, EQM=0.022)
- Sintonia ZN (Kp=5.96, Ti=18.13, Td=4.53) e ITAE (Kp=3.94, Ti=44.45, Td=3.06)
- Métricas: tr, ts, Mp, ess corretamente calculadas
- Exportação PNG funcional via html2canvas
- Marcadores visuais em pontos chave (28.3%, 63.2%, θ, Peak, ts, 90%)

## Prioritized Backlog (P1/P2 - opcional)
- P2: Histórico de simulações (MongoDB) para comparar sintonias
- P2: Overlay de múltiplos métodos no mesmo gráfico
- P2: Impressão de relatório PDF do projeto
- P2: Botão "Limpar parâmetros manuais" (conforme PDF seção 1b)

## Next Tasks
- Feedback do usuário / ajustes de polimento
