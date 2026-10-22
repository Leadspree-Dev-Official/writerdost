import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APPWRITE_ENDPOINT: z.string().url(),
    APPWRITE_PROJECT_ID: z.string().min(1),
    APPWRITE_API_KEY: z.string().min(1),
    APPWRITE_DATABASE_ID: z.string().min(1),
    WRITERDOST_ENCRYPTION_KEY: z.string().min(1),
    WRITERDOST_CRON_SECRET: z.string().min(32),
    REDIS_URL: z.string().url().optional(),
    WRITERDOST_ALLOWED_AI_HOSTS: z.string().default(""),
    WRITERDOST_ALLOW_LOCAL_AI: z.enum(["true", "false"]).default("false"),
    WRITERDOST_SELF_HOSTED: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REDIS_URL"],
        message: "REDIS_URL is required so rate limits are shared across instances.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.WRITERDOST_ALLOW_LOCAL_AI === "true" &&
      value.WRITERDOST_SELF_HOSTED !== "true"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WRITERDOST_ALLOW_LOCAL_AI"],
        message: "Local AI endpoints in production require WRITERDOST_SELF_HOSTED=true.",
      });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${details}`);
  }
  return parsed.data;
}

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv(process.env);
  return cached;
}
