import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

TOL = 1e-9


def _post(payload: dict) -> dict:
    r = client.post("/simulate", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _approx_equal(a: list[float], b: list[float], tol: float = TOL) -> bool:
    return len(a) == len(b) and all(abs(x - y) < tol for x, y in zip(a, b))


def test_bell_state():
    body = _post(
        {
            "num_wires": 2,
            "num_cols": 2,
            "columns": [
                [{"wire": 0, "gate": "H"}],
                [{"wire": 0, "gate": "CTRL"}, {"wire": 1, "gate": "X"}],
            ],
        }
    )
    assert _approx_equal(body["probabilities"], [0.5, 0.0, 0.0, 0.5])


def test_ghz_three_qubits():
    body = _post(
        {
            "num_wires": 3,
            "num_cols": 3,
            "columns": [
                [{"wire": 0, "gate": "H"}],
                [{"wire": 0, "gate": "CTRL"}, {"wire": 1, "gate": "X"}],
                [{"wire": 0, "gate": "CTRL"}, {"wire": 2, "gate": "X"}],
            ],
        }
    )
    assert _approx_equal(
        body["probabilities"], [0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5]
    )


def test_toffoli_via_two_controls():
    body = _post(
        {
            "num_wires": 3,
            "num_cols": 4,
            "columns": [
                [{"wire": 0, "gate": "X"}],
                [{"wire": 1, "gate": "X"}],
                [
                    {"wire": 0, "gate": "CTRL"},
                    {"wire": 1, "gate": "CTRL"},
                    {"wire": 2, "gate": "X"},
                ],
            ],
        }
    )
    expected = [0.0] * 8
    expected[0b111] = 1.0
    assert _approx_equal(body["probabilities"], expected)


def test_controlled_t_multi_control_path():
    body = _post(
        {
            "num_wires": 3,
            "num_cols": 4,
            "columns": [
                [{"wire": 0, "gate": "X"}],
                [{"wire": 1, "gate": "X"}],
                [
                    {"wire": 0, "gate": "CTRL"},
                    {"wire": 1, "gate": "CTRL"},
                    {"wire": 2, "gate": "T"},
                ],
            ],
        }
    )
    expected = [0.0] * 8
    expected[0b011] = 1.0
    assert _approx_equal(body["probabilities"], expected)


def test_empty_circuit_returns_zero_state():
    body = _post({"num_wires": 2, "num_cols": 1, "columns": []})
    expected = [1.0, 0.0, 0.0, 0.0]
    assert _approx_equal(body["probabilities"], expected)


def test_invalid_payload_returns_422():
    r = client.post(
        "/simulate",
        json={
            "num_wires": 2,
            "num_cols": 1,
            "columns": [
                [{"wire": 0, "gate": "H"}, {"wire": 1, "gate": "X"}],
            ],
        },
    )
    assert r.status_code == 422
