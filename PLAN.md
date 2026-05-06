# Plan: Pivot Calq stack to a Python (FastAPI + Qiskit) backend

**Goal:** Move all circuit construction and linear algebra to a Python backend (Qiskit + NumPy) served by FastAPI; the browser becomes a thin drag-and-drop UI that POSTs the circuit to `/simulate` on every edit and renders the returned probabilities live.
**Constraint source:** CLAUDE.md reviewed ✓ (mission: drag-and-drop builder + live circuit analysis, future-targeted at VQC ansatz)
**Prior plan:** replaced (v1 vanilla-JS plan archived to `PLAN_archive_20260505.md`)
**Created:** 2026-05-05

---

## Context

Calq is a not-yet-built quantum-circuit visualizer. The repo currently contains only `CLAUDE.md`, `README.md`, a `.gitignore` already prepped for both Python and Node, and the v1 plan (now archived). No source code exists yet, so this is a pre-build pivot rather than a retrofit.

**Why the change:** Re-implementing matrix math and gate semantics in JS duplicates work Qiskit already does correctly and at scale; pinning Python from day one aligns with the longer-term VQC-ansatz goal in CLAUDE.md (parametrized circuits, primitives, and gradients are directly reusable later). The frontend stays small and replaceable.

**Outcome:** a single `uvicorn` process serves both the static `frontend/` and a `POST /simulate` JSON endpoint. The frontend posts the column-major grid as JSON on every drag-drop; the backend builds a `QuantumCircuit`, runs `Statevector.from_instruction`, and returns probabilities + raw amplitudes. The v1 JS simulator (`complex.js`, `matrix.js`, `simulator.js`) is dropped before being written.

**Confirmed user choices:** FastAPI + uvicorn; REST POST per edit; single monorepo, FastAPI mounts both `/simulate` and `frontend/` via `StaticFiles`.

**Scope held from v1:** 6 wires × 12 columns; gate set `{I, H, X, Y, Z, S, T, CTRL}`; one probability bar-chart display widget; no SWAP / measurement / parametrized rotations / persistence / build tooling for v1.

## Critical files to be created

- `pyproject.toml` — project metadata + deps (`fastapi`, `uvicorn[standard]`, `qiskit>=1.0,<2.0`; dev: `pytest`, `httpx`)
- `uv.lock` — committed (`.gitignore` permits this)
- `backend/main.py` — FastAPI app, `/simulate` route, `StaticFiles` mount at `/`
- `backend/schemas.py` — Pydantic v2 models (`Placement`, `SimulateRequest`, `SimulateResponse`, `Amplitude`)
- `backend/translate.py` — `columns → QuantumCircuit` translator
- `backend/simulate.py` — `QuantumCircuit → SimulateResponse` via `Statevector`
- `tests/test_translate.py`, `tests/test_simulate.py` — pytest coverage
- `frontend/index.html`, `frontend/styles.css`
- `frontend/src/{main,gates,circuit,api,render,dragdrop,display}.js`

`numpy` is **not** pinned directly — it comes in transitively with Qiskit. Adding our own pin only invites version conflicts.

---

## Step 1: Update CLAUDE.md with the new stack

**What:** Append a "Project Architecture" section to `CLAUDE.md` describing the FastAPI + Qiskit backend, the static `frontend/` UI, the `POST /simulate` contract, and the `uv` dev workflow. Note that `PLAN_archive_20260505.md` holds the prior vanilla-JS plan for historical reference.
**Files:** `CLAUDE.md`
**Verify:** `CLAUDE.md` documents tech stack (Python 3.12, FastAPI, Qiskit 1.x, uv), entry point (`uv run uvicorn backend.main:app`), and dir layout.

## Step 2: Initialize the Python project with uv

**What:** Run `uv init` (no `--package`) at repo root, then `uv add fastapi 'uvicorn[standard]' 'qiskit>=1.0,<2.0'` and `uv add --dev pytest httpx`. Edit `pyproject.toml` so `[project]` declares the package name `calq` and `[tool.pytest.ini_options]` sets `testpaths = ["tests"]`.
**Files:** `pyproject.toml`, `uv.lock`, `.python-version`
**Verify:** `uv sync` runs clean and `uv run python -c "import qiskit, fastapi; print(qiskit.__version__)"` prints a 1.x version.

## Step 3: Define Pydantic v2 request/response models

**What:** In `backend/schemas.py`, define:
- `GateId = Literal["I","H","X","Y","Z","S","T","CTRL"]`
- `Placement(BaseModel)` with `wire: int`, `gate: GateId`
- `SimulateRequest(BaseModel)` with `num_wires: int` (1–6), `num_cols: int` (1–12), `columns: list[list[Placement]]`
- `Amplitude(BaseModel)` with `re: float`, `im: float`
- `SimulateResponse(BaseModel)` with `num_wires: int`, `probabilities: list[float]`, `amplitudes: list[Amplitude]`

Add a model-validator on `SimulateRequest` that rejects: `len(columns) > num_cols`, any wire `< 0` or `>= num_wires`, any column with two non-`CTRL` non-`I` placements, any column where a wire appears in both `CTRL` and a target gate.
**Files:** `backend/schemas.py`, `backend/__init__.py`
**Verify:** `SimulateRequest(num_wires=7, num_cols=1, columns=[])` raises `ValidationError`; a valid Bell payload constructs without error.

## Step 4: Implement `columns → QuantumCircuit` translator

**What:** In `backend/translate.py`, write `to_circuit(req: SimulateRequest) -> QuantumCircuit`. For each column: collect `controls = [p.wire for p in col if p.gate == "CTRL"]` and the single target placement. If no target, skip. Otherwise look up the gate class from `{"H":HGate, "X":XGate, "Y":YGate, "Z":ZGate, "S":SGate, "T":TGate}` (imported from `qiskit.circuit.library`) and use the uniform path:

```python
gate = GATE_CLASSES[target.gate]()
if controls:
    gate = gate.control(num_ctrl_qubits=len(controls))
qc.append(gate, [*controls, target.wire])
```

This single code path handles 0, 1, and 2+ controls — including cases Qiskit doesn't expose as instance methods (notably controlled-T).
**Files:** `backend/translate.py`
**Verify:** `test_translate.py::test_bell_circuit` builds a `QuantumCircuit` whose `Operator` matches `qc.h(0); qc.cx(0,1)` to within 1e-9.

## Step 5: Implement simulator wrapper

**What:** In `backend/simulate.py`, write:

```python
def run_simulation(req: SimulateRequest) -> SimulateResponse:
    qc = to_circuit(req)
    sv = Statevector.from_instruction(qc)
    amps = sv.data
    probs = sv.probabilities()
    return SimulateResponse(
        num_wires=req.num_wires,
        probabilities=probs.tolist(),
        amplitudes=[Amplitude(re=a.real, im=a.imag) for a in amps],
    )
```

Empty-circuit edge case: returns `|0…0⟩` with `probabilities[0] == 1.0`.
**Files:** `backend/simulate.py`
**Verify:** Bell → `[0.5, 0, 0, 0.5]`; GHZ-3 → `[0.5, 0, 0, 0, 0, 0, 0, 0.5]`; empty circuit → `[1.0, 0, …]`.

## Step 6: Write pytest coverage for the backend

**What:** In `tests/test_translate.py`: validation tests (out-of-range wires, two targets in one column, wire as both control and target). In `tests/test_simulate.py`: end-to-end via FastAPI's `TestClient` — Bell, GHZ-3, Toffoli (two `CTRL` + one `X`), single-qubit controlled-T (multi-control path). Compare probabilities to within 1e-9.
**Files:** `tests/__init__.py`, `tests/test_translate.py`, `tests/test_simulate.py`
**Verify:** `uv run pytest` passes with 0 failures and ≥6 tests.

## Step 7: Wire the FastAPI app and static mount

**What:** In `backend/main.py`:

```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .schemas import SimulateRequest, SimulateResponse
from .simulate import run_simulation

app = FastAPI(title="Calq")

@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    return run_simulation(req)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
```

Static mount goes **after** route registration so `/simulate` resolves first. `html=True` makes `/` serve `index.html`.
**Files:** `backend/main.py`
**Verify:** `uv run uvicorn backend.main:app --reload` starts on `:8000`. `curl -s http://localhost:8000/simulate -H 'content-type: application/json' -d '{"num_wires":2,"num_cols":2,"columns":[[{"wire":0,"gate":"H"}],[{"wire":0,"gate":"CTRL"},{"wire":1,"gate":"X"}]]}'` returns probabilities `[0.5, 0, 0, 0.5]` (modulo float precision).

## Step 8: Build the frontend (grid, palette, drag-drop, display)

**What:** Create `frontend/index.html` (skeleton with `<div id="grid">`, `<div id="palette">`, `<div id="display">`, `<script type="module" src="src/main.js">`) and `frontend/styles.css`. In `frontend/src/`:
- `gates.js` — registry `{I, H, X, Y, Z, S, T, CTRL}` with `{id, label, kind}`. **No matrix data.**
- `circuit.js` — `cells[col][wire]`, `setCell`, `clearCell`, `clone`, `toJSON()` returning the `SimulateRequest` shape.
- `render.js` — `renderCircuit(circuit, rootEl)` builds a CSS grid with horizontal wire backgrounds.
- `dragdrop.js` — palette → cell, cell → cell, cell → outside (clear), via HTML5 native drag-drop.
- `display.js` — `renderProbabilities(probs, rootEl)` renders DOM bars labeled `|q_{n-1}…q_0⟩` (little-endian → display flip).
- `api.js` — `async function simulate(circuitJson, signal)` wrapping `fetch('/simulate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(circuitJson), signal })`.
- `main.js` — wires everything. Maintains an `AbortController`; on every drop event, debounces ~50 ms, aborts any in-flight request, calls `simulate(circuit.toJSON())`, awaits, and re-renders both grid and display.

**Files:** the whole `frontend/` tree.
**Verify:** Open `http://localhost:8000/`, drag `H` onto wire 0 col 0, `CTRL` onto wire 0 col 1, `X` onto wire 1 col 1; probability display updates live to two equal bars on `|00⟩` and `|11⟩`. Build a 3-qubit GHZ (H, CNOT q0→q1, CNOT q0→q2) and confirm `|000⟩` and `|111⟩` are 50/50.

## Step 9: End-to-end smoke check + close out

**What:** Run `uv run pytest` and `uv run uvicorn backend.main:app` together (test then dev). Manually exercise: empty circuit, Bell, GHZ-3, Toffoli (`CTRL` + `CTRL` + `X` in one column), and an invalid edit (two non-control gates in one column → frontend should keep last good display, not crash; `api.js` catches the 422 and logs it).
**Verify:** Tests green, server runs, browser flows behave as described, no console errors. `git status` shows the expected new tree.

---

## Open Questions
- None blocking.

## Out of Scope
- SWAP, measurement, parametrized rotations (Rx/Ry/Rz with sliders), arithmetic / FT / modular gates.
- Bloch sphere, amplitude display, density matrix, sample display widgets.
- URL-encoded / shareable circuits, save/load, undo/redo.
- WebSocket / SSE; CORS; auth; rate limiting.
- Build tooling for the frontend (no Vite, no TS, no React).
- Deployment beyond localhost.
- Variational / ansatz tooling — explicit v2+ goal per CLAUDE.md.
