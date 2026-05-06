from qiskit.quantum_info import Statevector

from .schemas import Amplitude, SimulateRequest, SimulateResponse
from .translate import to_circuit


def run_simulation(req: SimulateRequest) -> SimulateResponse:
    qc = to_circuit(req)
    sv = Statevector.from_instruction(qc)
    amps = sv.data
    probs = sv.probabilities()
    return SimulateResponse(
        num_wires=req.num_wires,
        probabilities=probs.tolist(),
        amplitudes=[Amplitude(re=float(a.real), im=float(a.imag)) for a in amps],
    )
