"""FastAPI backend do projeto C213 - Controle Automático (Grupo 9).

Endpoints:
    GET  /api/                    -> healthcheck
    GET  /api/dataset/default     -> dataset padrão do Grupo 9
    POST /api/dataset/upload      -> upload de .mat arbitrário
    POST /api/identify            -> identificação por método de Smith (FOPDT)
    POST /api/tune                -> sintonia PID (Ziegler-Nichols ou ITAE)
    POST /api/simulate            -> simula malha aberta + malha fechada com PID
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from control_engine import (
    compute_metrics,
    parse_mat_file,
    simulate_closed_loop,
    simulate_open_loop,
    smith_identification,
    tune_itae,
    tune_ziegler_nichols,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB (mantido para futura persistência de sessões; não utilizado nos endpoints)
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="C213 PID Dashboard", version="1.0.0")
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class DatasetResponse(BaseModel):
    time: List[float]
    input: List[float]
    output: List[float]
    reference_params: Optional[dict] = None
    name: str = "Dataset_Grupo9_c213.mat"


class IdentifyRequest(BaseModel):
    time: List[float]
    input: List[float]
    output: List[float]


class IdentifyResponse(BaseModel):
    k: float
    tau: float
    theta: float
    mse: float
    t1: float
    t2: float
    y0: float
    y_inf: float
    u0: float
    u_step: float
    t_step: float
    y_model: List[float]


class TuneRequest(BaseModel):
    k: float
    tau: float
    theta: float
    method: Literal["ziegler-nichols", "itae"]


class TuneResponse(BaseModel):
    Kp: float
    Ti: float
    Td: float
    method: str


class SimulateRequest(BaseModel):
    k: float
    tau: float
    theta: float
    Kp: float
    Ti: float
    Td: float
    sp: float = Field(description="Setpoint em malha fechada (e valor final do degrau em malha aberta)")
    y0: float = 0.0
    u_bias: float = 0.0
    u_step_value: Optional[float] = Field(
        default=None,
        description="Amplitude da entrada (em MA). Default = sp/k + u_bias.",
    )
    t_sim: float = 300.0
    dt: float = 0.1


class MetricsModel(BaseModel):
    rise_time: Optional[float]
    settling_time: Optional[float]
    overshoot: Optional[float]
    ess: Optional[float]
    peak: Optional[float]
    peak_time: Optional[float]
    t_10: Optional[float] = None
    t_90: Optional[float] = None


class SimulateResponse(BaseModel):
    time: List[float]
    y_open: List[float]
    u_open: List[float]
    y_closed: List[float]
    u_closed: List[float]
    metrics_open: MetricsModel
    metrics_closed: MetricsModel


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "C213 PID Dashboard", "group": 9}


@api_router.get("/dataset/default", response_model=DatasetResponse)
async def get_default_dataset():
    path = ROOT_DIR / "datasets" / "Dataset_Grupo9_c213.mat"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dataset padrão não encontrado.")
    data = parse_mat_file(path.read_bytes())
    return DatasetResponse(**data, name="Dataset_Grupo9_c213.mat")


@api_router.post("/dataset/upload", response_model=DatasetResponse)
async def upload_dataset(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".mat"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .mat")
    content = await file.read()
    try:
        data = parse_mat_file(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha ao ler .mat: {e}")
    return DatasetResponse(**data, name=file.filename or "uploaded.mat")


@api_router.post("/identify", response_model=IdentifyResponse)
async def identify(req: IdentifyRequest):
    try:
        result = smith_identification(req.time, req.input, req.output)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha na identificação: {e}")
    return IdentifyResponse(**result)


@api_router.post("/tune", response_model=TuneResponse)
async def tune(req: TuneRequest):
    if req.method == "ziegler-nichols":
        params = tune_ziegler_nichols(req.k, req.tau, req.theta)
    elif req.method == "itae":
        params = tune_itae(req.k, req.tau, req.theta)
    else:
        raise HTTPException(status_code=400, detail="Método inválido.")
    return TuneResponse(**params, method=req.method)


@api_router.post("/simulate", response_model=SimulateResponse)
async def simulate(req: SimulateRequest):
    # Entrada padrão em malha aberta para atingir sp: u_step = (sp - y0)/k + u_bias
    if req.u_step_value is None:
        u_step_value = (req.sp - req.y0) / req.k + req.u_bias if abs(req.k) > 1e-9 else req.sp
    else:
        u_step_value = req.u_step_value

    # Malha aberta (degrau direto)
    ol = simulate_open_loop(
        k=req.k,
        tau=req.tau,
        theta=req.theta,
        u_step_value=u_step_value,
        y0=req.y0,
        u_bias=req.u_bias,
        t_sim=req.t_sim,
        dt=req.dt,
        t_step_time=0.0,
    )
    metrics_open = compute_metrics(ol["time"], ol["y"], sp=req.sp, y0=req.y0)

    # Malha fechada
    cl = simulate_closed_loop(
        k=req.k,
        tau=req.tau,
        theta=req.theta,
        Kp=req.Kp,
        Ti=req.Ti,
        Td=req.Td,
        sp=req.sp,
        y0=req.y0,
        u_bias=req.u_bias,
        t_sim=req.t_sim,
        dt=req.dt,
    )
    metrics_closed = compute_metrics(cl["time"], cl["y"], sp=req.sp, y0=req.y0)

    return SimulateResponse(
        time=ol["time"],
        y_open=ol["y"],
        u_open=ol["u"],
        y_closed=cl["y"],
        u_closed=cl["u"],
        metrics_open=MetricsModel(**metrics_open),
        metrics_closed=MetricsModel(**metrics_closed),
    )


# ---------------------------------------------------------------------------
# Registro
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
