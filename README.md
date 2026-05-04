# PID Dashboard — Grupo 9

Dashboard web para **identificação de sistemas** e **simulação de controle PID**, desenvolvido para a disciplina **C213 — Sistemas de Controle Automático**.

---

## 📌 Funcionalidades

### 🔹 Identificação do Sistema
- Upload de arquivos `.csv`
- Estimativa de parâmetros:
  - Ganho (K)
  - Atraso (θ)
  - Constante de tempo (τ)
- Baseado no método de Smith

### 🔹 Controle PID
- Configuração manual de:
  - Kp
  - Ki
  - Kd
- Simulação da resposta do sistema

### 🔹 Visualização
- Exibição gráfica da resposta
- Comparação entre dados reais e modelo

---

## 🛠️ Tecnologias

**Front-end**
- React
- TailwindCSS
- shadcn/ui
- Phosphor Icons

**Back-end (esperado)**
- FastAPI

---
## ▶️ Como executar
- Na pasta backend rodar:
- pip install -r requirements.txt
- uvicorn server:app --reload
- Na pasta frontend rodar:
- npm install
- npm start

## 🎯 Objetivo

Aplicar conceitos de:

Identificação de sistemas
Controle PID
Métodos clássicos (Smith, Ziegler-Nichols, ITAE)
Visualização de dados experimentais
