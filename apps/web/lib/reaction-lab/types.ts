export type ReagentId =
  | "hcl"
  | "naoh"
  | "agno3"
  | "nacl"
  | "na2co3"
  | "cacl2"
  | "kmno4"
  | "h2o2"
  | "phenolphthalein"
  | "vinegar"
  | "baking-soda"
  | "conc-h2so4";

export type Reagent = { id: ReagentId; name: string; formula: string; color: string };

export type ReactionEffect = "color-change" | "gas" | "precipitate" | "explosive";

export type ReactionResult = {
  reactants: [ReagentId, ReagentId];
  equation: string;
  product: string;
  effect: ReactionEffect;
  /** Resulting solution color for color-change / default display. */
  resultColor: string;
  note: string;
};
