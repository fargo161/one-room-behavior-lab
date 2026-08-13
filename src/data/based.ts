import type { BasedPrototypeModifiers, BasedReceptionProfile, BasedVibeDefinition, CharacterId, CueCode, VibeCode } from "../core/types";

export const CUES: CueCode[] = ["B", "A", "S", "E", "D"];

export const prototypeDefaultCueShare = { dominant: 0.62, secondary: 0.38 } as const;

const mapped = (code: VibeCode, canonicalName: string, scenarioAlias: string, modifiers: BasedPrototypeModifiers, tags: string[], notes: string): BasedVibeDefinition => ({
  code, version: "0.2-provisional", dominantCue: code[0] as CueCode, secondaryCue: code[1] as CueCode,
  prototypeDefaultCueShare, status: "PROTOTYPE_PROVISIONAL", canonicalName, scenarioAlias,
  prototypeModifiers: modifiers, performanceTags: tags,
  notes: `${notes} PROTOTYPE-PROVISIONAL; NOT CANONICAL, DIAGNOSTIC, OR MORAL IDENTITY.`,
});

export const basedPrototypeMappings: Record<string, BasedVibeDefinition> = {
  ES: mapped("ES", "Community-Minded", "steady warmth", { credibility: 0.12, value: 0.08, threat: -0.08, voluntariness: 0.12, urgency: -0.05, resistance: -0.08, tension: -0.08, leakage: 0.04 }, ["open", "steady"], "Empathy provisionally organizes sociability in this room."),
  SE: mapped("SE", "Compassionate", "inviting", { credibility: 0.08, value: 0.06, threat: -0.06, voluntariness: 0.16, urgency: -0.03, resistance: -0.06, tension: -0.1, leakage: 0.02 }, ["relational", "inviting"], "Sociability provisionally organizes empathy."),
  SD: mapped("SD", "Coaxing", "smoothly conditional", { credibility: -0.02, value: 0.14, threat: 0.02, voluntariness: 0.03, urgency: 0.02, resistance: 0.02, tension: 0.02, leakage: 0.08 }, ["measured", "conditional"], "Sociability provisionally organizes deception as a bargaining surface."),
  DS: mapped("DS", "Insinuating", "guardedly cordial", { credibility: -0.14, value: 0.06, threat: 0.04, voluntariness: -0.02, urgency: 0.04, resistance: 0.12, tension: 0.14, leakage: 0.18 }, ["controlled", "guarded"], "Deception provisionally organizes sociability; direction differs from SD."),
  AD: mapped("AD", "Hustled", "hard-edged", { credibility: -0.16, value: -0.04, threat: 0.2, voluntariness: -0.16, urgency: 0.18, resistance: 0.18, tension: 0.22, leakage: 0.2 }, ["concealed", "hard-edged"], "Aggression provisionally organizes deception."),
  AS: mapped("AS", "Commanding", "driving", { credibility: 0.01, value: -0.02, threat: 0.14, voluntariness: -0.1, urgency: 0.2, resistance: 0.08, tension: 0.16, leakage: 0.1 }, ["direct", "driving"], "Aggression provisionally organizes sociability."),
  BE: mapped("BE", "Condemning", "unyielding", { credibility: 0.02, value: -0.05, threat: 0.18, voluntariness: -0.12, urgency: 0.12, resistance: 0.14, tension: 0.2, leakage: 0.12 }, ["contained", "unyielding"], "Belligerence is not moralized; this is a refusal posture only."),
  EA: mapped("EA", "Firm/Unyielding", "protective force", { credibility: 0.08, value: 0.02, threat: 0.08, voluntariness: 0.01, urgency: 0.12, resistance: -0.01, tension: 0.08, leakage: 0.05 }, ["firm", "protective"], "Empathy provisionally organizes aggression as protective firmness."),
};

export const allBasedVibes: BasedVibeDefinition[] = CUES.flatMap((dominant) => CUES.filter((secondary) => secondary !== dominant).map((secondary) => {
  const code = `${dominant}${secondary}` as VibeCode;
  return basedPrototypeMappings[code] ?? {
    code, version: "0.2-provisional", dominantCue: dominant, secondaryCue: secondary,
    prototypeDefaultCueShare, status: "RESERVED_UNMAPPED" as const,
    notes: "Structurally valid but intentionally unmapped. It cannot be selected in v0.2.1.",
  };
}));

export const receptionProfiles: Record<CharacterId, BasedReceptionProfile> = {
  MARA: {
    characterId: "MARA", version: "0.2-provisional", cueSensitivities: { E: 0.07, S: 0.04, A: -0.05, D: -0.08 },
    vibeOverrides: { ES: { credibility: 0.05, voluntariness: 0.05 }, AD: { threat: 0.08, resistance: 0.05 }, DS: { credibility: -0.04 } },
    stateConditionRules: ["RULE_RECEPTION_MARA_HIGH_RISK"],
    boundaryNotes: ["Scenario-local reception tuning only; not a personality or diagnostic profile."],
  },
  DREW: {
    characterId: "DREW", version: "0.2-provisional", cueSensitivities: { E: 0.02, S: 0.01, A: 0.05, D: -0.11, B: 0.04 },
    vibeOverrides: { SD: { value: 0.06, credibility: -0.02 }, DS: { credibility: -0.08, resistance: 0.08 }, AD: { threat: 0.1, resistance: 0.12 }, EA: { credibility: 0.04 } },
    stateConditionRules: ["RULE_RECEPTION_DREW_HIGH_ALERT"],
    boundaryNotes: ["Scenario-local reception tuning only; not a personality or diagnostic profile."],
  },
};

export function getVibe(code: VibeCode): BasedVibeDefinition {
  const vibe = allBasedVibes.find((entry) => entry.code === code);
  if (!vibe) throw new Error(`Unknown Vibe ${code}`);
  return vibe;
}

export const enabledVibes = (): BasedVibeDefinition[] => allBasedVibes.filter((entry) => entry.status === "PROTOTYPE_PROVISIONAL");
