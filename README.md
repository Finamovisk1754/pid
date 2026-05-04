# PID Dashboard — Grupo 9

Dashboard web para **identificação de sistemas** e **simulação de controle PID**, desenvolvido para a disciplina **C213 — Sistemas de Controle Automático**.

---

## 📌 Funcionalidades

### 🔹 Identificação do Sistema
- Upload de arquivos `.csv` ou `.mat`
- Estimativa de parâmetros:
  - Ganho (K)
  - Atraso (θ)
  - Constante de tempo (τ)
- Baseado no modelo FOPDT (First Order Plus Dead Time)

### 🔹 Controle PID
- Configuração manual de:
  - Kp
  - Ki
  - Kd
- Ajuste automático utilizando:
  - Ziegler-Nichols (ZN)
  - ITAE

### 🔹 Visualização
- Exibição gráfica da resposta do sistema
- Comparação entre:
  - Dados reais
  - Modelo identificado
  - Respostas com PID (ZN e ITAE)

---

## 🛠️ Tecnologias

### Front-end
- React
- TailwindCSS
- shadcn/ui
- Phosphor Icons

### Back-end
- FastAPI
- NumPy
- SciPy

---

## 🧩 Arquitetura do Sistema

O sistema é dividido em duas camadas principais:

### 🔹 Frontend (React)
Responsável por:
- Upload do dataset
- Entrada de parâmetros
- Visualização dos gráficos

### 🔹 Backend (FastAPI)
Responsável por:
- Processamento dos dados
- Identificação do sistema (FOPDT)
- Cálculo dos parâmetros PID
- Simulação da resposta do sistema
- Retorno dos dados para o frontend

---

## 🔬 Algoritmos Implementados

### 📌 Modelo FOPDT (First Order Plus Dead Time)

O sistema é aproximado por um modelo de primeira ordem com atraso:

G(s) = K * e^(-θs) / (τs + 1)

Onde:
- K: ganho do sistema  
- τ: constante de tempo  
- θ: atraso (dead time)  

---

### 📌 Método de Ziegler-Nichols

Método clássico de sintonia de controladores PID baseado nos parâmetros do sistema.

Características:
- Resposta rápida  
- Pode gerar overshoot  
- Fácil implementação  

---

### 📌 Método ITAE (Integral of Time-weighted Absolute Error)

Minimiza o erro ponderado no tempo.

Características:
- Reduz overshoot  
- Produz resposta mais suave  
- Melhor comportamento em regime permanente  

---

## 📊 Métricas de Avaliação

O desempenho dos modelos e controladores é avaliado por:

- **IAE** — Integral do Erro Absoluto  
- **ISE** — Integral do Erro Quadrático  
- **MSE** — Erro Quadrático Médio  

---

## ▶️ Como executar

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
Frontend
cd frontend
npm install
npm start
📁 Estrutura do Projeto
PID/
├── backend/
│   ├── datasets/
│   ├── control_engine.py
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
```
📊 Análise dos Resultados

A identificação do sistema apresentou comportamento consistente com um modelo de primeira ordem com atraso.

Os parâmetros estimados (K, τ, θ) permitiram uma boa aproximação da dinâmica real do sistema.

Observações:

O modelo acompanha a tendência da resposta real
Existe pequeno erro inicial devido ao atraso (θ)
O tempo de subida e acomodação são coerentes com o sistema físico
Controle PID
O controlador reduz significativamente o erro do sistema
O método Ziegler-Nichols gera resposta rápida, com possível overshoot
O método ITAE apresenta resposta mais suave e menor oscilação

De forma geral, o modelo identificado é adequado para análise e controle do sistema.

🎯 Objetivo

Aplicar conceitos de:

Identificação de sistemas
Controle PID
Métodos clássicos (Smith, Ziegler-Nichols, ITAE)
Visualização de dados experimentais
👨‍💻 Autores

Matheus Finamor

📜 Licença

Uso acadêmico.
