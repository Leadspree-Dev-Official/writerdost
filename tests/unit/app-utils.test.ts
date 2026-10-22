import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/app-utils";

describe("slugify", () => {
  it("creates a stable slug", () => {
    expect(slugify("  Hello, WriterDost!  ")).toBe("hello-writerdost");
  });
});
