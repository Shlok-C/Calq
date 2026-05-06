from typing import Literal

from pydantic import BaseModel, Field, model_validator

GateId = Literal["I", "H", "X", "Y", "Z", "S", "T", "CTRL"]

MAX_WIRES = 6
MAX_COLS = 12


class Placement(BaseModel):
    wire: int = Field(ge=0)
    gate: GateId


class SimulateRequest(BaseModel):
    num_wires: int = Field(ge=1, le=MAX_WIRES)
    num_cols: int = Field(ge=1, le=MAX_COLS)
    columns: list[list[Placement]]

    @model_validator(mode="after")
    def _validate_columns(self) -> "SimulateRequest":
        if len(self.columns) > self.num_cols:
            raise ValueError(
                f"columns has {len(self.columns)} entries; num_cols is {self.num_cols}"
            )
        for col_idx, col in enumerate(self.columns):
            seen_wires: set[int] = set()
            target_count = 0
            controls: set[int] = set()
            for p in col:
                if p.wire >= self.num_wires:
                    raise ValueError(
                        f"column {col_idx}: wire {p.wire} out of range (num_wires={self.num_wires})"
                    )
                if p.wire in seen_wires:
                    raise ValueError(f"column {col_idx}: wire {p.wire} placed twice")
                seen_wires.add(p.wire)
                if p.gate == "CTRL":
                    controls.add(p.wire)
                elif p.gate != "I":
                    target_count += 1
                    if p.wire in controls:
                        raise ValueError(
                            f"column {col_idx}: wire {p.wire} is both control and target"
                        )
            if target_count > 1:
                raise ValueError(
                    f"column {col_idx}: more than one non-control target gate"
                )
            for ctrl_wire in controls:
                if any(p.wire == ctrl_wire and p.gate != "CTRL" for p in col):
                    raise ValueError(
                        f"column {col_idx}: wire {ctrl_wire} is both control and target"
                    )
        return self


class Amplitude(BaseModel):
    re: float
    im: float


class SimulateResponse(BaseModel):
    num_wires: int
    probabilities: list[float]
    amplitudes: list[Amplitude]
