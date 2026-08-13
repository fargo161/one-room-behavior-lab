import type { ScenarioDefinition, VibeCode } from "./types";
import { allBehaviors } from "../data/behaviors";
import { allBasedVibes, CUES } from "../data/based";
import { functionalDefinitions } from "../data/functions";
import { dpaDefinitions } from "../data/dpa";
import { propositions } from "../data/propositions";

export function isValidVibe(code: string): code is VibeCode {
  return code.length === 2 && CUES.includes(code[0] as (typeof CUES)[number]) && CUES.includes(code[1] as (typeof CUES)[number]) && code[0] !== code[1];
}
const duplicates = (ids: string[]) => ids.filter((id, index) => ids.indexOf(id) !== index);
export function validateScenario(definition: ScenarioDefinition): string[] {
  const errors: string[] = [];
  const propositionIds = propositions.map((entry) => entry.id), functionIds = functionalDefinitions.map((entry) => entry.id), behaviorIds = allBehaviors.map((entry) => entry.id);
  const enabledVibes = new Set(allBasedVibes.filter((entry) => entry.status === "PROTOTYPE_PROVISIONAL").map((entry) => entry.code));
  for (const duplicate of duplicates(propositionIds)) errors.push(`Duplicate proposition ${duplicate}.`);
  for (const duplicate of duplicates(functionIds)) errors.push(`Duplicate function ${duplicate}.`);
  for (const duplicate of duplicates(behaviorIds)) errors.push(`Duplicate behavior ${duplicate}.`);
  if (definition.maxBeats < 1) errors.push("Scenario must define a positive Beat limit.");
  for (const [key, value] of Object.entries(definition.thresholds)) if (value < 0 || value > 1) errors.push(`Threshold ${key} is outside 0..1.`);
  for (const proposition of propositions) {
    if (!proposition.allowedRecipients.length || !proposition.subjectIds.length || !proposition.allowedDpa.length || !proposition.compatibleFunctions.length) errors.push(`${proposition.id} has an empty relationship constraint.`);
    for (const dpa of proposition.allowedDpa) if (!proposition.renderFragments[dpa]) errors.push(`${proposition.id} lacks a ${dpa} surface fragment.`);
  }
  for (const behavior of allBehaviors) {
    if (!behavior.effectRuleIds.length) errors.push(`${behavior.id} has no reachable effect rule.`);
    if (!behavior.allowedExecutionVibes.includes(behavior.defaultExecutionVibe)) errors.push(`${behavior.id} defaults to a disallowed execution Vibe.`);
    if (!isValidVibe(behavior.defaultExecutionVibe) || !enabledVibes.has(behavior.defaultExecutionVibe)) errors.push(`${behavior.id} uses an unavailable execution Vibe.`);
    if (behavior.baseScore < -1 || behavior.baseScore > 1) errors.push(`${behavior.id} base score is outside -1..1.`);
  }
  for (const definitionItem of Object.values(dpaDefinitions)) for (const [field, value] of Object.entries(definitionItem.baseline)) if (value < -1 || value > 1) errors.push(`${definitionItem.id}.${field} is outside -1..1.`);
  if (definition.initialWorld.scenarioId !== definition.id || definition.initialWorld.maxBeats !== definition.maxBeats) errors.push("Initial world does not match scenario identity and Beat limit.");
  return errors;
}
export function assertValidScenario(definition: ScenarioDefinition): void {
  const errors = validateScenario(definition); if (errors.length) throw new Error(`Prototype data validation failed:\n${errors.join("\n")}`);
}
