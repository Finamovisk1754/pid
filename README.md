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

**Back-end**
- FastAPI
- Numpy
- Scipy

---
## ▶️ Como executar
- Na pasta backend rodar:
- pip install -r requirements.txt
- uvicorn server:app --reload
- Na pasta frontend rodar:
- npm install
- npm start

---
## 🎯 Objetivo

Aplicar conceitos de:

Identificação de sistemas
Controle PID
Métodos clássicos (Smith, Ziegler-Nichols, ITAE)
Visualização de dados experimentais

---

## Análise dos Resultados

A identificação do sistema apresentou comportamento consistente com um modelo de primeira ordem com atraso.

Os parâmetros estimados (K, τ, θ) permitiram uma boa aproximação da dinâmica real do sistema.

Observou-se que:
- O modelo acompanha a tendência da resposta real
- Existe pequeno erro inicial devido ao atraso
- O tempo de subida e acomodação são coerentes com o sistema físico

Na aplicação do controle PID:
- O sistema apresentou redução significativa do erro
- O overshoot depende dos ganhos escolhidos
- Ajustes via Ziegler-Nichols forneceram resposta rápida, porém com leve oscilação

De forma geral, o modelo é adequado para análise e controle do sistema.

---
## 👨‍💻 Autores
Matheus Finamor

## 📜 Licença

Uso acadêmico.


