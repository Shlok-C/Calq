from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .schemas import SimulateRequest, SimulateResponse
from .simulate import run_simulation

app = FastAPI(title="Calq")


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    return run_simulation(req)


_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend")
