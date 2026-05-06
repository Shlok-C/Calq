import pytest
from pydantic import ValidationError
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator

from backend.schemas import SimulateRequest
from backend.translate import to_circuit


def _bell_request() -> SimulateRequest:
    return SimulateRequest.model_validate(
        {
            "num_wires": 2,
            "num_cols": 2,
            "columns": [
                [{"wire": 0, "gate": "H"}],
                [{"wire": 0, "gate": "CTRL"}, {"wire": 1, "gate": "X"}],
            ],
        }
    )


def test_bell_circuit_matches_reference():
    qc = to_circuit(_bell_request())
    expected = QuantumCircuit(2)
    expected.h(0)
    expected.cx(0, 1)
    assert Operator(qc).equiv(Operator(expected))


def test_empty_circuit_is_identity():
    req = SimulateRequest.model_validate(
        {"num_wires": 2, "num_cols": 2, "columns": []}
    )
    qc = to_circuit(req)
    assert qc.num_qubits == 2
    assert len(qc.data) == 0


def test_rejects_too_many_wires():
    with pytest.raises(ValidationError):
        SimulateRequest.model_validate(
            {"num_wires": 7, "num_cols": 1, "columns": []}
        )


def test_rejects_wire_out_of_range():
    with pytest.raises(ValidationError):
        SimulateRequest.model_validate(
            {
                "num_wires": 2,
                "num_cols": 1,
                "columns": [[{"wire": 5, "gate": "H"}]],
            }
        )


def test_rejects_two_target_gates_in_one_column():
    with pytest.raises(ValidationError):
        SimulateRequest.model_validate(
            {
                "num_wires": 2,
                "num_cols": 1,
                "columns": [
                    [{"wire": 0, "gate": "H"}, {"wire": 1, "gate": "X"}],
                ],
            }
        )


def test_rejects_columns_exceeding_num_cols():
    with pytest.raises(ValidationError):
        SimulateRequest.model_validate(
            {
                "num_wires": 2,
                "num_cols": 1,
                "columns": [
                    [{"wire": 0, "gate": "H"}],
                    [{"wire": 1, "gate": "X"}],
                ],
            }
        )
