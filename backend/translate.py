from qiskit import QuantumCircuit
from qiskit.circuit.library import HGate, SGate, TGate, XGate, YGate, ZGate

from .schemas import SimulateRequest

_GATE_CLASSES = {
    "H": HGate,
    "X": XGate,
    "Y": YGate,
    "Z": ZGate,
    "S": SGate,
    "T": TGate,
}


def to_circuit(req: SimulateRequest) -> QuantumCircuit:
    qc = QuantumCircuit(req.num_wires)
    for col in req.columns:
        controls: list[int] = []
        target_wire: int | None = None
        target_gate_id: str | None = None
        for p in col:
            if p.gate == "I":
                continue
            if p.gate == "CTRL":
                controls.append(p.wire)
            else:
                target_wire = p.wire
                target_gate_id = p.gate

        if target_gate_id is None:
            continue

        gate = _GATE_CLASSES[target_gate_id]()
        if controls:
            gate = gate.control(num_ctrl_qubits=len(controls))
            qc.append(gate, [*controls, target_wire])
        else:
            qc.append(gate, [target_wire])
    return qc
