export const exchangeValueWeights: Record<string, number> = {
  PLAYER_PROTECTS_DREW: 0.72,
  MARA_PROVIDES_INFORMATION: 0.58,
  PLAYER_ACCEPTS_RESPONSIBILITY: 0.82,
  FUTURE_RECIPROCITY: 0.5,
};

export const consequenceWeights: Record<string, { severity: number; enforceability: number }> = {
  REFUSAL_REPORTED: { severity: 0.58, enforceability: 0.66 },
  RESPONSIBILITY_ASSIGNED: { severity: 0.64, enforceability: 0.58 },
  ACCESS_WITHDRAWN: { severity: 0.48, enforceability: 0.42 },
  SECRET_REVEALED: { severity: 0.74, enforceability: 0.34 },
  RELATIONSHIP_DAMAGED: { severity: 0.52, enforceability: 0.78 },
};
