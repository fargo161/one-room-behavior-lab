import type { Dpa, DpaDefinition } from "../core/types";

export const dpaDefinitions: Record<Dpa, DpaDefinition> = {
  ASK: {
    id: "ASK", version: "0.2-provisional", label: "Ask",
    conciseDefinition: "Request voluntary cooperation while preserving a meaningful possibility of refusal.",
    boundary: "An Ask is not weak Pressure and creates neither debt nor threatened cost by itself.",
    baseline: { value: 0.16, threat: 0.02, burden: 0.24, voluntariness: 0.82, urgency: 0.16, credibility: 0.05, resistance: -0.08 },
  },
  DEAL: {
    id: "DEAL", version: "0.2-provisional", label: "Deal",
    conciseDefinition: "Propose an explicit exchange between a requested result and offered value.",
    boundary: "Sending a Deal creates proposed terms, not obligation. Only accepted terms create commitment.",
    baseline: { value: 0.56, threat: 0.08, burden: 0.42, voluntariness: 0.56, urgency: 0.32, credibility: -0.01, resistance: 0.03 },
  },
  PRESSURE: {
    id: "PRESSURE", version: "0.2-provisional", label: "Pressure",
    conciseDefinition: "Raise the believed cost of refusal through an explicit consequence.",
    boundary: "Pressure can be doubted, resisted, exposed, or acknowledged without actual compliance.",
    baseline: { value: 0.05, threat: 0.67, burden: 0.58, voluntariness: 0.1, urgency: 0.72, credibility: -0.1, resistance: 0.22 },
  },
};

export const getDpa = (id: Dpa): DpaDefinition => dpaDefinitions[id];
