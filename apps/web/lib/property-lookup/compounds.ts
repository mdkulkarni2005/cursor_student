export type Compound = {
  id: string;
  name: string;
  formula: string;
  /** Normal boiling point at 1 atm, °C — standard reference values. */
  boilingPointC: number;
  /** Density at 25°C, g/mL — standard reference values. */
  density25: number;
  /** Molar mass, g/mol. */
  molarMass: number;
};

export const COMPOUNDS: Compound[] = [
  { id: "water", name: "Water", formula: "H₂O", boilingPointC: 100, density25: 0.997, molarMass: 18.015 },
  { id: "ethanol", name: "Ethanol", formula: "C₂H₅OH", boilingPointC: 78.37, density25: 0.789, molarMass: 46.07 },
  { id: "methanol", name: "Methanol", formula: "CH₃OH", boilingPointC: 64.7, density25: 0.792, molarMass: 32.04 },
  { id: "acetone", name: "Acetone", formula: "C₃H₆O", boilingPointC: 56.05, density25: 0.784, molarMass: 58.08 },
];

export const COMPOUND_BY_ID: Record<string, Compound> = Object.fromEntries(COMPOUNDS.map((c) => [c.id, c]));
