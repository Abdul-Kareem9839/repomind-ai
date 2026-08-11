import { z } from "zod";

const objectIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().regex(/^[a-f0-9]{24}$/i, "Invalid project id"),
);

export const askQuestionSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
  body: z.object({
    question: z.string().trim().min(1, "Question is required").max(2000),
  }),
});

export const chatHistoryParamSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
});
