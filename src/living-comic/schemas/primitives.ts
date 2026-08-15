import { z } from "zod";

export const stableIdSchema = z.string().regex(
  /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
  "Stable semantic IDs must be lowercase snake_case and independent of display wording.",
);

export const displayLabelSchema = z.string().trim().min(1);

export const propositionValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const propositionSchema = z.object({
  subjectId: stableIdSchema,
  predicate: z.string().regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/),
  objectId: stableIdSchema.optional(),
  value: propositionValueSchema.optional(),
}).superRefine((value, context) => {
  if (value.objectId === undefined && value.value === undefined) {
    context.addIssue({ code: "custom", message: "A proposition requires objectId or value." });
  }
  if (value.objectId !== undefined && value.value !== undefined) {
    context.addIssue({ code: "custom", message: "A proposition cannot contain both objectId and value." });
  }
});

export type Proposition = z.infer<typeof propositionSchema>;

export const certaintySchema = z.enum(["CERTAIN", "UNCERTAIN"]);
export const functionIdSchema = z.enum(["ESCAPE", "ATTENTION", "ACCESS", "SENSORY"]);
export const channelSchema = z.enum(["VISUAL", "AUDITORY", "COMMUNICATION_CONTENT"]);

export const templateRefSchema = z.enum([
  "SELF",
  "COUNTERPART",
  "THIRD_PARTY",
  "PRIMARY_OBJECT",
  "ROOM",
  "EXIT_ZONE",
]);

export const propositionTemplateSchema = z.object({
  subjectRef: templateRefSchema,
  predicate: z.string().regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/),
  objectRef: templateRefSchema.optional(),
  value: propositionValueSchema.optional(),
}).superRefine((value, context) => {
  if (value.objectRef === undefined && value.value === undefined) {
    context.addIssue({ code: "custom", message: "A proposition template requires objectRef or value." });
  }
  if (value.objectRef !== undefined && value.value !== undefined) {
    context.addIssue({ code: "custom", message: "A proposition template cannot contain both objectRef and value." });
  }
});

export type PropositionTemplate = z.infer<typeof propositionTemplateSchema>;
