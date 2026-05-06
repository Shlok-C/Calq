## Project Overview

Calq is a quantum circuit drag-and-drop builder and visualizer with the functionality of live circuit analysis. Meant for learning basics of quantum circuits, and working toward a goal of tailoring it to ansatz analysis for variational quantum circuits.

## Project Architecture

**Stack (v1):**
- **Backend:** Python 3.12, FastAPI, Qiskit ≥1.0 (state-vector simulation via `qiskit.quantum_info.Statevector`). All circuit construction and linear algebra live on the server.
- **Frontend:** Vanilla HTML + CSS + ES modules. No build tooling, no framework. The browser is a thin drag-and-drop UI that POSTs the column-major circuit JSON to `/simulate` on every edit and renders returned probabilities.
- **Process model:** single `uvicorn` worker. FastAPI mounts both the `/simulate` route and the static `frontend/` directory.

**Layout:**
```
calq/
├── pyproject.toml          # uv-managed deps
├── uv.lock
├── backend/
│   ├── main.py             # FastAPI app + StaticFiles mount
│   ├── schemas.py          # Pydantic request/response models
│   ├── translate.py        # cells → QuantumCircuit
│   └── simulate.py         # QuantumCircuit → response
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── src/{main,gates,circuit,api,render,dragdrop,display}.js
└── tests/                  # pytest, uses FastAPI TestClient
```

**Dev workflow:**
- `uv sync` — install/update from lockfile.
- `uv run uvicorn backend.main:app --reload` — dev server on `:8000`, serves UI + API.
- `uv run pytest` — backend tests.

**`/simulate` contract:** POST a column-major grid (`num_wires`, `num_cols`, `columns: list[list[{wire, gate}]]`) where `gate ∈ {I,H,X,Y,Z,S,T,CTRL}`; receive `probabilities` and `amplitudes` (length `2^num_wires`, little-endian Qiskit basis ordering).

**v1 ceiling:** 6 wires × 12 columns. Gate set is `{I, H, X, Y, Z, S, T, CTRL}` (CTRL is a per-column control marker). No SWAP, measurement, parametrized rotations, or persistence in v1 — see `PLAN.md` for scope and `PLAN_archive_20260505.md` for the prior pure-JS plan.

**Numpy:** not pinned directly — comes in transitively with Qiskit.
