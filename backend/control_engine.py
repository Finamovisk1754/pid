"""
Motor de processamento para identificação de sistemas (Smith) e sintonia PID
(Ziegler-Nichols e ITAE). Simulação de malha aberta e fechada via Euler discreto
com buffer de atraso puro.

Modelo: FOPDT  G(s) = K * exp(-theta*s) / (tau*s + 1)
"""
from __future__ import annotations

import io
from typing import List, Tuple, Dict, Any, Optional

import numpy as np
from scipy.io import loadmat


# ---------------------------------------------------------------------------
# Carregamento de datasets .mat
# ---------------------------------------------------------------------------
def parse_mat_file(file_bytes: bytes) -> Dict[str, Any]:
    """Extrai vetores de tempo, entrada e saída de um arquivo .mat."""
    buf = io.BytesIO(file_bytes)
    raw = loadmat(buf)

    # Tenta descobrir as chaves comuns (PT/ES/EN)
    time_keys = ["tiempo", "tempo", "time", "t"]
    in_keys = ["entrada", "input", "u", "dados_entrada"]
    out_keys = ["salida", "saida", "output", "y", "dados_saida"]

    def pick(keys: List[str]):
        for k in keys:
            if k in raw:
                return np.asarray(raw[k]).squeeze()
        return None

    t = pick(time_keys)
    u = pick(in_keys)
    y = pick(out_keys)

    # Caso o arquivo traga apenas dados_entrada/dados_saida como (N,2) => [t,val]
    if t is None and "dados_entrada" in raw:
        arr = np.asarray(raw["dados_entrada"])
        if arr.ndim == 2 and arr.shape[1] == 2:
            t = arr[:, 0]
            u = arr[:, 1]
    if (u is None or u.ndim == 2) and "dados_entrada" in raw:
        arr = np.asarray(raw["dados_entrada"])
        if arr.ndim == 2 and arr.shape[1] == 2:
            u = arr[:, 1]
    if (y is None or y.ndim == 2) and "dados_saida" in raw:
        arr = np.asarray(raw["dados_saida"])
        if arr.ndim == 2 and arr.shape[1] == 2:
            if t is None:
                t = arr[:, 0]
            y = arr[:, 1]

    if t is None or u is None or y is None:
        raise ValueError(
            "Arquivo .mat inválido. Esperadas as chaves 'tiempo/tempo', 'entrada' e 'salida/saida'."
        )

    t = np.asarray(t, dtype=float).flatten()
    u = np.asarray(u, dtype=float).flatten()
    y = np.asarray(y, dtype=float).flatten()

    # Parâmetros de referência (opcionais) registrados no próprio dataset
    ref_params: Optional[Dict[str, float]] = None
    if "parametros_sistema" in raw:
        try:
            p = raw["parametros_sistema"]
            rec = p[0, 0]
            ref_params = {
                "k": float(np.asarray(rec["k"]).flatten()[0]),
                "tau": float(np.asarray(rec["tau"]).flatten()[0]),
                "theta": float(np.asarray(rec["theta"]).flatten()[0]),
            }
        except Exception:
            ref_params = None

    return {
        "time": t.tolist(),
        "input": u.tolist(),
        "output": y.tolist(),
        "reference_params": ref_params,
    }


# ---------------------------------------------------------------------------
# FOPDT step response (exato, analítico)
# ---------------------------------------------------------------------------
def fopdt_step_response(
    t: np.ndarray,
    k: float,
    tau: float,
    theta: float,
    u0: float,
    u_step: float,
    t_step: float,
    y0: float,
) -> np.ndarray:
    """y(t) = y0 + K*(u_step - u0) * (1 - exp(-(t - t_step - theta)/tau))  para t >= t_step+theta."""
    du = u_step - u0
    y = np.full_like(t, y0, dtype=float)
    mask = t >= (t_step + theta)
    y[mask] = y0 + k * du * (1.0 - np.exp(-(t[mask] - t_step - theta) / max(tau, 1e-9)))
    return y


# ---------------------------------------------------------------------------
# Identificação - Método de Smith (FOPDT)
# ---------------------------------------------------------------------------
def smith_identification(
    t: List[float], u: List[float], y: List[float]
) -> Dict[str, Any]:
    t = np.asarray(t, dtype=float)
    u = np.asarray(u, dtype=float)
    y = np.asarray(y, dtype=float)

    if len(t) < 5:
        raise ValueError("Série muito curta para identificação.")

    # Localiza o instante do degrau (maior variação em u)
    du = np.diff(u)
    if np.max(np.abs(du)) < 1e-9:
        raise ValueError("Entrada sem degrau detectável.")
    step_idx = int(np.argmax(np.abs(du)) + 1)
    t_step = float(t[step_idx])

    u0 = float(np.mean(u[:step_idx])) if step_idx > 0 else float(u[0])
    u_step = float(np.mean(u[step_idx:step_idx + 10])) if step_idx + 10 < len(u) else float(u[-1])

    # Valor inicial e final da saída (média de uma janela para robustez)
    window = min(20, max(3, len(y) // 20))
    y0 = float(np.mean(y[max(0, step_idx - window):step_idx])) if step_idx > 0 else float(y[0])
    y_inf = float(np.mean(y[-window:]))
    dy = y_inf - y0
    delta_u = u_step - u0

    if abs(delta_u) < 1e-9:
        raise ValueError("Variação de entrada muito pequena.")

    k = dy / delta_u

    # Procura t1 e t2 (pontos em 28.3% e 63.2% da variação)
    y_t1_target = y0 + 0.283 * dy
    y_t2_target = y0 + 0.632 * dy

    t_after = t[step_idx:]
    y_after = y[step_idx:]

    # Interpolação linear para encontrar o instante que cruza cada alvo
    def crossing(target: float) -> float:
        # Considera sentido crescente/decrescente
        increasing = dy >= 0
        for i in range(1, len(y_after)):
            cond = (y_after[i - 1] < target <= y_after[i]) if increasing else (
                y_after[i - 1] > target >= y_after[i]
            )
            if cond:
                y1, y2 = y_after[i - 1], y_after[i]
                t1, t2 = t_after[i - 1], t_after[i]
                if abs(y2 - y1) < 1e-12:
                    return float(t1)
                return float(t1 + (target - y1) * (t2 - t1) / (y2 - y1))
        return float(t_after[-1])

    t1 = crossing(y_t1_target)
    t2 = crossing(y_t2_target)

    tau = 1.5 * (t2 - t1)
    theta = t2 - tau
    if theta < 0:
        theta = max(0.0, t1 * 0.5)

    # Resposta do modelo (para MSE e exibição). A convenção aqui é: theta absorve
    # qualquer "tempo morto" antes do degrau, portanto o modelo parte de t_step=0
    # no eixo absoluto do experimento.
    y_model = fopdt_step_response(t, k, tau, theta, u0, u_step, 0.0, y0)
    mse = float(np.mean((y - y_model) ** 2))

    return {
        "k": float(k),
        "tau": float(tau),
        "theta": float(theta),
        "mse": mse,
        "t1": float(t1),
        "t2": float(t2),
        "y0": y0,
        "y_inf": y_inf,
        "u0": u0,
        "u_step": u_step,
        "t_step": t_step,
        "y_model": y_model.tolist(),
    }


# ---------------------------------------------------------------------------
# Sintonia PID
# ---------------------------------------------------------------------------
def tune_ziegler_nichols(k: float, tau: float, theta: float) -> Dict[str, float]:
    """Ziegler-Nichols malha aberta (reaction curve) - controlador PID clássico."""
    theta = max(theta, 1e-6)
    Kp = 1.2 * tau / (k * theta)
    Ti = 2.0 * theta
    Td = 0.5 * theta
    return {"Kp": float(Kp), "Ti": float(Ti), "Td": float(Td)}


def tune_itae(k: float, tau: float, theta: float) -> Dict[str, float]:
    """
    ITAE para servo (seguimento de setpoint) - tabela de Rovira et al.
        Kp = (a1 / K) * (theta/tau)^b1
        Ti = tau / (a2 + b2 * (theta/tau))
        Td = tau * a3 * (theta/tau)^b3
    Coeficientes PID-ITAE servo: a1=0.965, b1=-0.85, a2=0.796, b2=-0.1465, a3=0.308, b3=0.929
    """
    theta = max(theta, 1e-6)
    r = theta / tau
    Kp = (0.965 / k) * (r ** -0.85)
    Ti = tau / (0.796 - 0.1465 * r)
    Td = tau * 0.308 * (r ** 0.929)
    return {"Kp": float(Kp), "Ti": float(Ti), "Td": float(Td)}


# ---------------------------------------------------------------------------
# Simulação em malha fechada com PID e atraso puro
# ---------------------------------------------------------------------------
def simulate_closed_loop(
    k: float,
    tau: float,
    theta: float,
    Kp: float,
    Ti: float,
    Td: float,
    sp: float,
    y0: float = 0.0,
    u_bias: float = 0.0,
    t_sim: float = 300.0,
    dt: float = 0.05,
    u_min: float = -1e6,
    u_max: float = 1e6,
) -> Dict[str, Any]:
    """
    PID discreto (forma posicional) + planta FOPDT via Euler.
    u_bias: valor de entrada em regime permanente inicial.
    """
    n = int(round(t_sim / dt)) + 1
    t = np.arange(n) * dt
    y = np.zeros(n)
    u = np.zeros(n)
    err = np.zeros(n)
    y[0] = y0

    # Buffer para o atraso puro: a entrada aplicada na planta em t é u(t-theta)
    delay_steps = int(round(theta / dt))
    u_buffer = np.full(delay_steps + 1, u_bias, dtype=float)

    integral = 0.0
    # Inicialização textbook: e_prev=0 (gera "derivative kick" quando o SP salta,
    # comportamento clássico do PID posicional usado como referência).
    e_prev = 0.0
    Ti_safe = Ti if Ti > 1e-9 else 1e9  # evita divisão por zero (sem I se Ti==0)

    for i in range(1, n):
        e = sp - y[i - 1]
        err[i] = e
        # PID posicional
        de = (e - e_prev) / dt
        integral += e * dt
        u_ctrl = Kp * (e + integral / Ti_safe + Td * de) + u_bias
        # Anti-windup simples (clamp + back-calc)
        if u_ctrl > u_max:
            integral -= (u_ctrl - u_max) * dt / Ti_safe if Ti > 1e-9 else 0
            u_ctrl = u_max
        elif u_ctrl < u_min:
            integral -= (u_ctrl - u_min) * dt / Ti_safe if Ti > 1e-9 else 0
            u_ctrl = u_min
        e_prev = e

        # Atualiza buffer de atraso
        u_buffer = np.roll(u_buffer, -1)
        u_buffer[-1] = u_ctrl
        u_delayed = u_buffer[0]

        # Planta FOPDT: tau*dy/dt = -(y - y0) + k*(u_delayed - u_bias)
        dy = (-(y[i - 1] - y0) + k * (u_delayed - u_bias)) / tau
        y[i] = y[i - 1] + dy * dt
        u[i] = u_ctrl

    return {"time": t.tolist(), "y": y.tolist(), "u": u.tolist(), "err": err.tolist()}


def simulate_open_loop(
    k: float,
    tau: float,
    theta: float,
    u_step_value: float,
    y0: float = 0.0,
    u_bias: float = 0.0,
    t_sim: float = 300.0,
    dt: float = 0.05,
    t_step_time: float = 0.0,
) -> Dict[str, Any]:
    n = int(round(t_sim / dt)) + 1
    t = np.arange(n) * dt
    y = fopdt_step_response(t, k, tau, theta, u_bias, u_step_value, t_step_time, y0)
    u = np.where(t >= t_step_time, u_step_value, u_bias)
    return {"time": t.tolist(), "y": y.tolist(), "u": u.tolist()}


# ---------------------------------------------------------------------------
# Métricas de resposta temporal
# ---------------------------------------------------------------------------
def compute_metrics(
    time: List[float],
    y: List[float],
    sp: float,
    y0: float = 0.0,
    settling_band: float = 0.02,
) -> Dict[str, Optional[float]]:
    t = np.asarray(time, dtype=float)
    y = np.asarray(y, dtype=float)

    delta = sp - y0
    if abs(delta) < 1e-9:
        return {"rise_time": None, "settling_time": None, "overshoot": None, "ess": None, "peak": None, "peak_time": None}

    # Rise time: 10% -> 90% da variação
    y_10 = y0 + 0.10 * delta
    y_90 = y0 + 0.90 * delta
    t_10 = None
    t_90 = None
    increasing = delta > 0
    for i in range(1, len(y)):
        if t_10 is None and ((increasing and y[i] >= y_10) or (not increasing and y[i] <= y_10)):
            # interpolação linear
            if y[i] != y[i - 1]:
                t_10 = float(t[i - 1] + (y_10 - y[i - 1]) * (t[i] - t[i - 1]) / (y[i] - y[i - 1]))
            else:
                t_10 = float(t[i])
        if t_90 is None and ((increasing and y[i] >= y_90) or (not increasing and y[i] <= y_90)):
            if y[i] != y[i - 1]:
                t_90 = float(t[i - 1] + (y_90 - y[i - 1]) * (t[i] - t[i - 1]) / (y[i] - y[i - 1]))
            else:
                t_90 = float(t[i])
        if t_10 is not None and t_90 is not None:
            break
    rise_time = (t_90 - t_10) if (t_10 is not None and t_90 is not None) else None

    # Settling time: tempo em que |y - sp| fica abaixo de settling_band*|delta| e permanece
    tol = settling_band * abs(delta)
    ts = None
    for i in range(len(y) - 1, -1, -1):
        if abs(y[i] - sp) > tol:
            if i + 1 < len(y):
                ts = float(t[i + 1])
            else:
                ts = None
            break
    if ts is None and abs(y[0] - sp) <= tol:
        ts = float(t[0])

    # Overshoot
    if increasing:
        peak_idx = int(np.argmax(y))
    else:
        peak_idx = int(np.argmin(y))
    peak = float(y[peak_idx])
    peak_time = float(t[peak_idx])
    overshoot = None
    if (increasing and peak > sp) or (not increasing and peak < sp):
        overshoot = abs(peak - sp) / abs(delta) * 100.0
    else:
        overshoot = 0.0

    # Erro em regime permanente (média dos últimos 5% de pontos)
    last_window = max(3, int(len(y) * 0.05))
    ess = float(sp - np.mean(y[-last_window:]))

    return {
        "rise_time": rise_time,
        "settling_time": ts,
        "overshoot": overshoot,
        "ess": ess,
        "peak": peak,
        "peak_time": peak_time,
        "t_10": t_10,
        "t_90": t_90,
    }
