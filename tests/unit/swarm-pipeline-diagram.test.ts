import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill 4-Agent Swarm Pipeline Architecture Diagram", () => {
  const diagramPath = path.resolve(__dirname, "../../src/components/website/SwarmPipelineDiagram.tsx");
  const exists = fs.existsSync(diagramPath);

  it("SwarmPipelineDiagram.tsx exists and renders the 4-stage pipeline", () => {
    expect(exists).toBe(true);
    if (!exists) return;
    const code = fs.readFileSync(diagramPath, "utf-8");
    expect(code).toContain('id: "memory-supervisor"');
    expect(code).toContain('id: "quota-pacing"');
    expect(code).toContain('id: "sub-swarm"');
    expect(code).toContain('id: "qa-critic"');
    expect(code).toContain("data-stage={stg.id}");
    expect(code).toContain("Dynamic Quota & Pacing Manager");
    expect(code).toContain("Writing Sub-Swarm");
    expect(code).toContain("Strict QA Critic");
  });
});
