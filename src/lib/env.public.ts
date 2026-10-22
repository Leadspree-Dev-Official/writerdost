import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
});

export type PublicEnv = z.infer<typeof schema>;

export function publicEnv(): PublicEnv {
  const parsed = schema.safeParse({
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  });
  if (!parsed.success) {
    throw new Error(
      "Invalid public environment. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and " +
        "NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
    );
  }
  return parsed.data;
}
