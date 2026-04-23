"""Backend regression tests for C213 PID Dashboard (Grupo 9)."""
import io
import os
import math
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to reading frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

assert BASE_URL, "REACT_APP_BACKEND_URL is required"

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def dataset():
    r = requests.get(f"{API}/dataset/default", timeout=30)
    assert r.status_code == 200
    return r.json()


# Health check
def test_healthcheck():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("group") == 9


# Default dataset
def test_default_dataset(dataset):
    assert "time" in dataset and "input" in dataset and "output" in dataset
    assert len(dataset["time"]) == len(dataset["input"]) == len(dataset["output"])
    assert len(dataset["time"]) > 100
    # PRD says 421 samples
    assert len(dataset["time"]) == 421
    assert dataset["reference_params"] is not None
    rp = dataset["reference_params"]
    assert abs(rp["k"] - 0.75) < 1e-6
    assert abs(rp["tau"] - 34.0) < 1e-6
    assert abs(rp["theta"] - 9.0) < 1e-6


# Upload .mat
def test_upload_mat():
    path = "/app/backend/datasets/Dataset_Grupo9_c213.mat"
    with open(path, "rb") as f:
        content = f.read()
    files = {"file": ("Dataset_Grupo9_c213.mat", io.BytesIO(content), "application/octet-stream")}
    r = requests.post(f"{API}/dataset/upload", files=files, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["time"]) == 421


def test_upload_invalid_extension():
    files = {"file": ("foo.txt", io.BytesIO(b"not a mat"), "text/plain")}
    r = requests.post(f"{API}/dataset/upload", files=files, timeout=15)
    assert r.status_code == 400


# Smith identification
@pytest.fixture(scope="module")
def identification(dataset):
    body = {"time": dataset["time"], "input": dataset["input"], "output": dataset["output"]}
    r = requests.post(f"{API}/identify", json=body, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def test_identify_smith_values(identification):
    # Expected from PRD: k≈0.747, tau≈33.6, theta≈9.06, mse≈0.022
    assert abs(identification["k"] - 0.747) < 0.02, identification
    assert abs(identification["tau"] - 33.6) < 1.0, identification
    assert abs(identification["theta"] - 9.06) < 1.0, identification
    assert identification["mse"] < 0.05, identification
    assert isinstance(identification["y_model"], list)
    assert len(identification["y_model"]) == 421


# Tuning - Ziegler Nichols
def test_tune_ziegler_nichols():
    body = {"k": 0.747, "tau": 33.63, "theta": 9.06, "method": "ziegler-nichols"}
    r = requests.post(f"{API}/tune", json=body, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    # Expected Kp≈5.96, Ti≈18.13, Td≈4.53
    assert abs(d["Kp"] - 5.96) < 0.1, d
    assert abs(d["Ti"] - 18.12) < 0.1, d
    assert abs(d["Td"] - 4.53) < 0.1, d
    assert d["method"] == "ziegler-nichols"


# Tuning - ITAE
def test_tune_itae():
    body = {"k": 0.747, "tau": 33.63, "theta": 9.06, "method": "itae"}
    r = requests.post(f"{API}/tune", json=body, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    # Expected Kp≈3.94, Ti≈44.45, Td≈3.06
    assert abs(d["Kp"] - 3.94) < 0.2, d
    assert abs(d["Ti"] - 44.45) < 1.0, d
    assert abs(d["Td"] - 3.06) < 0.2, d


def test_tune_invalid_method():
    body = {"k": 0.747, "tau": 33.63, "theta": 9.06, "method": "something"}
    r = requests.post(f"{API}/tune", json=body, timeout=15)
    assert r.status_code in (400, 422)


# Simulation
def _simulate(Kp, Ti, Td):
    body = {
        "k": 0.747,
        "tau": 33.63,
        "theta": 9.06,
        "Kp": Kp,
        "Ti": Ti,
        "Td": Td,
        "sp": 1.0,
        "y0": 0.0,
        "t_sim": 300.0,
        "dt": 0.1,
    }
    r = requests.post(f"{API}/simulate", json=body, timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def test_simulate_zn_high_overshoot():
    d = _simulate(5.96, 18.13, 4.53)
    assert "time" in d and "y_open" in d and "y_closed" in d
    assert len(d["time"]) == len(d["y_closed"]) == len(d["y_open"])
    mo = d["metrics_open"]
    mc = d["metrics_closed"]
    # Open-loop should not overshoot
    assert (mo.get("overshoot") or 0) < 1.0
    # ZN tuning: expect significant overshoot (~50%) — allow broad range
    assert mc["overshoot"] is not None
    assert mc["overshoot"] > 20.0, mc
    # settling and rise time are positive
    assert mc["rise_time"] is None or mc["rise_time"] > 0
    assert mc["settling_time"] is None or mc["settling_time"] > 0


def test_simulate_itae_low_overshoot():
    d = _simulate(3.94, 44.45, 3.06)
    mc = d["metrics_closed"]
    assert mc["overshoot"] is not None
    # ITAE: minimal overshoot (~2%)
    assert mc["overshoot"] < 15.0, mc
    # ess should be small (steady-state error)
    assert abs(mc["ess"]) < 0.05, mc
