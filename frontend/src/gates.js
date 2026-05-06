export const GATES = {
  I:    { id: "I",    label: "·", kind: "empty",   name: "Identity"        },
  H:    { id: "H",    label: "H", kind: "single",  name: "Hadamard"        },
  X:    { id: "X",    label: "X", kind: "single",  name: "Pauli-X (NOT)"   },
  Y:    { id: "Y",    label: "Y", kind: "single",  name: "Pauli-Y"         },
  Z:    { id: "Z",    label: "Z", kind: "single",  name: "Pauli-Z"         },
  S:    { id: "S",    label: "S", kind: "single",  name: "S (phase, π/2)"  },
  T:    { id: "T",    label: "T", kind: "single",  name: "T (π/4)"         },
  CTRL: { id: "CTRL", label: "●", kind: "control", name: "Control"         },
};

export const GATE_ORDER = ["H", "X", "Y", "Z", "S", "T", "CTRL"];
