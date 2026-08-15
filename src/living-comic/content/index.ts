import characters from "../../../content/characters/characters.json";
import goals from "../../../content/goals/goals.json";
import secondaryGoals from "../../../content/secondary-goals/secondary-goals.json";
import reasons from "../../../content/reasons/reasons.json";
import conflictSkeletons from "../../../content/conflict-skeletons/conflict-skeletons.json";
import objectCategories from "../../../content/object-categories/object-categories.json";
import objects from "../../../content/object-instances/object-instances.json";
import roomCategories from "../../../content/room-categories/room-categories.json";
import roomPresets from "../../../content/room-presets/room-presets.json";
import relationshipTypes from "../../../content/relationships/relationships.json";
import historyActions from "../../../content/history-actions/history-actions.json";
import scenePressures from "../../../content/scene-pressures/scene-pressures.json";
import basedVibes from "../../../content/based/vibes.json";
import presentation from "../../../content/presentation/cues.json";
import directActions from "../../../content/direct-actions/direct-actions.json";
import messageFragments from "../../../content/message-fragments/fragments.json";
import { contentManifestSchema, type ContentManifest } from "../schemas";

export interface ContentReferenceIssue {
  path: string;
  message: string;
  ref: string;
}

export const rawDefaultContent = {
  version: "living_comic_content_v0_1",
  characters,
  goals,
  secondaryGoals,
  reasons,
  conflictSkeletons,
  objectCategories,
  objects,
  roomCategories,
  roomPresets,
  relationshipTypes,
  historyActions,
  scenePressures,
  basedVibes,
  presentation,
  directActions,
  messageFragments,
};

const has = (values: readonly { id: string }[], id: string): boolean => values.some((value) => value.id === id);

export function validateContentReferences(content: ContentManifest): ContentReferenceIssue[] {
  const issues: ContentReferenceIssue[] = [];
  const requireRef = (condition: boolean, path: string, ref: string, kind: string) => {
    if (!condition) issues.push({ path, ref, message: `Unknown ${kind} reference: ${ref}` });
  };

  const allDefinitions: Array<{ id: string; path: string }> = [
    ...content.characters.map(({ id }) => ({ id, path: "characters" })),
    ...content.goals.map(({ id }) => ({ id, path: "goals" })),
    ...content.secondaryGoals.map(({ id }) => ({ id, path: "secondaryGoals" })),
    ...content.reasons.map(({ id }) => ({ id, path: "reasons" })),
    ...content.conflictSkeletons.map(({ id }) => ({ id, path: "conflictSkeletons" })),
    ...content.objectCategories.map(({ id }) => ({ id, path: "objectCategories" })),
    ...content.objects.map(({ id }) => ({ id, path: "objects" })),
    ...content.roomCategories.map(({ id }) => ({ id, path: "roomCategories" })),
    ...content.roomPresets.map(({ id }) => ({ id, path: "roomPresets" })),
    ...content.relationshipTypes.map(({ id }) => ({ id, path: "relationshipTypes" })),
    ...content.historyActions.map(({ id }) => ({ id, path: "historyActions" })),
    ...content.scenePressures.map(({ id }) => ({ id, path: "scenePressures" })),
    ...content.basedVibes.map(({ id }) => ({ id, path: "basedVibes" })),
    ...content.presentation.faces.map(({ id }) => ({ id, path: "presentation.faces" })),
    ...content.presentation.poses.map(({ id }) => ({ id, path: "presentation.poses" })),
    ...content.presentation.balloons.map(({ id }) => ({ id, path: "presentation.balloons" })),
    ...content.presentation.paralanguage.map(({ id }) => ({ id, path: "presentation.paralanguage" })),
    ...content.directActions.map(({ id }) => ({ id, path: "directActions" })),
    ...content.messageFragments.map(({ id }) => ({ id, path: "messageFragments" })),
  ];

  const seen = new Map<string, string>();
  for (const definition of allDefinitions) {
    const existing = seen.get(definition.id);
    if (existing) issues.push({ path: definition.path, ref: definition.id, message: `Duplicate stable ID also used in ${existing}` });
    seen.set(definition.id, definition.path);
  }

  content.characters.forEach((character) => {
    requireRef(has(content.basedVibes, character.baselineVibeId), `characters.${character.id}.baselineVibeId`, character.baselineVibeId, "BASED Vibe");
  });

  content.goals.forEach((goal) => {
    goal.compatibleSkeletonIds.forEach((id) => requireRef(has(content.conflictSkeletons, id), `goals.${goal.id}.compatibleSkeletonIds`, id, "conflict skeleton"));
    goal.compatibleObjectCategoryIds.forEach((id) => requireRef(has(content.objectCategories, id), `goals.${goal.id}.compatibleObjectCategoryIds`, id, "object category"));
  });

  content.reasons.forEach((reason) => {
    reason.compatibleGoalIds.forEach((id) => requireRef(has(content.goals, id), `reasons.${reason.id}.compatibleGoalIds`, id, "Goal"));
    reason.groundingHistoryActionIds.forEach((id) => requireRef(has(content.historyActions, id), `reasons.${reason.id}.groundingHistoryActionIds`, id, "history action"));
  });

  content.conflictSkeletons.forEach((skeleton) => {
    skeleton.compatibleGoalIds.forEach((id) => requireRef(has(content.goals, id), `conflictSkeletons.${skeleton.id}.compatibleGoalIds`, id, "Goal"));
    skeleton.requiredObjectCategoryIds.forEach((id) => requireRef(has(content.objectCategories, id), `conflictSkeletons.${skeleton.id}.requiredObjectCategoryIds`, id, "object category"));
    skeleton.compatibleRoomCategoryIds.forEach((id) => requireRef(has(content.roomCategories, id), `conflictSkeletons.${skeleton.id}.compatibleRoomCategoryIds`, id, "room category"));
  });

  content.objects.forEach((object) => {
    object.categoryIds.forEach((id) => requireRef(has(content.objectCategories, id), `objects.${object.id}.categoryIds`, id, "object category"));
  });

  content.roomPresets.forEach((room) => requireRef(has(content.roomCategories, room.categoryId), `roomPresets.${room.id}.categoryId`, room.categoryId, "room category"));

  content.relationshipTypes.forEach((relationship) => {
    relationship.compatibleHistoryActionIds.forEach((id) => requireRef(has(content.historyActions, id), `relationshipTypes.${relationship.id}.compatibleHistoryActionIds`, id, "history action"));
  });

  content.scenePressures.forEach((pressure) => {
    pressure.compatibleSkeletonIds.forEach((id) => requireRef(has(content.conflictSkeletons, id), `scenePressures.${pressure.id}.compatibleSkeletonIds`, id, "conflict skeleton"));
  });

  content.basedVibes.forEach((vibe) => {
    vibe.paralanguageCueIds.forEach((id) => requireRef(has(content.presentation.paralanguage, id), `basedVibes.${vibe.id}.paralanguageCueIds`, id, "paralanguage cue"));
    requireRef(has(content.presentation.poses, vibe.poseId), `basedVibes.${vibe.id}.poseId`, vibe.poseId, "pose");
    requireRef(has(content.presentation.faces, vibe.faceId), `basedVibes.${vibe.id}.faceId`, vibe.faceId, "face");
    requireRef(has(content.presentation.balloons, vibe.balloonId), `basedVibes.${vibe.id}.balloonId`, vibe.balloonId, "balloon");
  });

  const offer = content.directActions.find((action) => action.operation === "OFFER_OBJECT");
  if (!offer || offer.possessionTransferPolicy !== "REQUIRES_ACCEPTANCE" || offer.ownershipTransferPolicy !== "EXPLICIT_RULE_ONLY") {
    issues.push({ path: "directActions.action_offer_object", ref: "action_offer_object", message: "OFFER_OBJECT must require acceptance for possession and must never imply ownership transfer." });
  }

  return issues;
}

export function loadDefaultContent(): ContentManifest {
  const parsed = contentManifestSchema.parse(rawDefaultContent);
  const issues = validateContentReferences(parsed);
  if (issues.length > 0) {
    throw new Error(`Living Comic content references are invalid:\n${issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")}`);
  }
  return parsed;
}
