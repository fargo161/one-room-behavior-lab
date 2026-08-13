import type { BehaviorDefinition, CharacterState, FacePose, InterpretationRecord, PerformancePlan, TextParalanguagePlan } from "../core/types";
import { getVibe } from "./based";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const neutralFace: FacePose = {
  browInnerHeight: 0.5, browOuterHeight: 0.5, browAngle: 0.5,
  eyeOpennessLeft: 0.62, eyeOpennessRight: 0.62, gazeX: 0.5, gazeY: 0.5,
  mouthCornerLeft: 0.48, mouthCornerRight: 0.48, mouthOpenness: 0.08, mouthWidth: 0.52,
  jawTension: 0.28, headTurn: 0.5, headTilt: 0.5, asymmetry: 0.08, overallTension: 0.32,
};

const textPlan = (behaviorId: BehaviorDefinition["id"], doubtful: boolean): TextParalanguagePlan => {
  const feigned = behaviorId === "FEIGN_COMPLIANCE";
  const forceful = behaviorId === "LOCK_DOWN_ROOM" || behaviorId === "CONFRONT_MARA";
  const careful = behaviorId === "OFFER_TRANSFER" || behaviorId === "COMPLETE_TRANSFER" || behaviorId === "ACCEPT_TRANSFER";
  return {
    lineTemplateId: `LINE_${behaviorId}`, initialDelayMs: feigned ? 850 : doubtful ? 430 : careful ? 520 : forceful ? 90 : 180,
    tempo: forceful ? "ABRUPT" : feigned || careful ? "MEASURED" : doubtful ? "SLOW" : "NORMAL",
    volume: forceful ? "RAISED" : feigned ? "LOW" : "NORMAL", pausePositions: feigned ? [2] : careful ? [2, 5] : doubtful ? [3] : [],
    emphasisRanges: forceful ? [{ start: 0, end: 1 }] : careful ? [{ start: 2, end: 4 }] : [], hesitation: feigned ? 0.66 : doubtful ? 0.38 : careful ? 0.22 : 0.06,
    completion: forceful ? "CLIPPED" : feigned ? "TRAILED" : "FULL", punctuationPattern: forceful ? "period-clipped" : feigned ? "ellipsis-pause" : "natural",
    repetition: 0, correction: false, revealIntervalMs: forceful ? 28 : feigned ? 92 : careful ? 62 : 42,
  };
};

export function buildPerformance(actor: CharacterState, behavior: BehaviorDefinition, interpretation: InterpretationRecord | undefined, beat: number, jointTransferMatched = false): PerformancePlan {
  const vibe = getVibe(behavior.defaultExecutionVibe);
  const feigned = behavior.id === "FEIGN_COMPLIANCE";
  const forceful = behavior.id === "LOCK_DOWN_ROOM" || behavior.id === "CONFRONT_MARA";
  const cooperative = ["OFFER_TRANSFER", "COMPLETE_TRANSFER", "ACCEPT_TRANSFER"].includes(behavior.id);
  const doubtful = Boolean(interpretation && interpretation.perceivedCredibility < 0.55);
  const tension = clamp(actor.metrics.alert * 0.52 + (vibe.prototypeModifiers?.tension ?? 0) + (feigned ? 0.28 : 0));
  const leakage = clamp((vibe.prototypeModifiers?.leakage ?? 0.05) + (feigned ? 0.42 : 0.04));
  const gazeTarget = feigned ? "ENVELOPE" : actor.attention.primaryTarget;
  const resolvedLine = behavior.id === "COMPLETE_TRANSFER" && jointTransferMatched ? "Then we are agreed." : behavior.line;
  return {
    id: `PERF_B${beat}_${actor.id}_${behavior.id}`, version: "0.2-provisional", actorId: actor.id, behaviorId: behavior.id,
    executionVibe: behavior.defaultExecutionVibe,
    internalStanceTags: feigned ? ["resistant", "testing the player", "protecting the envelope"] : forceful ? ["control", "open confrontation"] : cooperative ? ["conditional cooperation"] : doubtful ? ["guarded uncertainty"] : ["situational focus"],
    presentedStanceTags: feigned ? ["surface acknowledgement", "restraint"] : forceful ? ["overt boundary"] : cooperative ? ["careful agreement"] : ["measured attention"],
    concealmentIntent: feigned ? 0.82 : behavior.id === "CONCEAL_ENVELOPE" ? 0.88 : 0.14, leakage, gazeTarget,
    facePose: {
      ...neutralFace, browInnerHeight: clamp(0.52 - tension * 0.2), browOuterHeight: clamp(0.5 + (doubtful ? 0.08 : 0) - tension * 0.1),
      browAngle: clamp(0.5 + tension * 0.28), eyeOpennessLeft: clamp(0.65 - tension * 0.18), eyeOpennessRight: clamp(0.63 - tension * 0.2 - leakage * 0.05),
      gazeX: gazeTarget === "ENVELOPE" ? 0.7 : gazeTarget === "PLAYER_CHANNEL" ? 0.32 : actor.id === "MARA" ? 0.58 : 0.42,
      gazeY: gazeTarget === "ENVELOPE" ? 0.66 : 0.46, mouthCornerLeft: clamp(0.48 + (cooperative ? 0.06 : 0) - tension * 0.12),
      mouthCornerRight: clamp(0.48 + (cooperative ? 0.03 : 0) - tension * 0.14 - leakage * 0.05), mouthOpenness: forceful ? 0.34 : cooperative ? 0.18 : 0.1,
      mouthWidth: clamp(0.54 + tension * 0.12), jawTension: clamp(0.25 + tension * 0.65), headTurn: gazeTarget === "PLAYER_CHANNEL" ? 0.36 : gazeTarget === "ENVELOPE" ? 0.7 : 0.5,
      headTilt: clamp(0.5 + (doubtful ? 0.08 : 0)), asymmetry: clamp(0.08 + leakage * 0.46), overallTension: tension,
    },
    textPlan: textPlan(behavior.id, doubtful), actionPresentationId: behavior.id === "COMPLETE_TRANSFER" ? jointTransferMatched ? "ACTION_COMPLETE_TRANSFER_MATCHED" : "ACTION_COMPLETE_TRANSFER_UNMATCHED" : `ACTION_${behavior.id}`, line: resolvedLine,
    sourceRefs: [behavior.id, vibe.code, ...(interpretation ? [interpretation.id] : [])],
  };
}
