import { z } from "zod";

const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/;

const objectIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().regex(/^[a-f0-9]{24}$/i, "Invalid project id"),
);

export const createGithubProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Project name is required").max(120),
    repoUrl: z
      .string()
      .trim()
      .regex(
        GITHUB_URL_PATTERN,
        "Expected a URL like https://github.com/user/repo",
      ),
  }),
});

export const projectIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// Applied after multer (uploadZip) has parsed the multipart form, since that's
// what populates req.body for a multipart request.
export const uploadZipProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Project name is required").max(120),
  }),
});
