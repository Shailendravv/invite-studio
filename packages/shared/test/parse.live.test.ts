// Runs the fixtures against the real LLM configured in .env.
//   npm run test:live
// Costs a few cents per run with claude-haiku-4-5.
import { describe, expect, it } from "vitest";
import { parseOrder } from "../src/agent/parse";
import { createLLM } from "../src/llm";
import { compareOutcome, loadFixtures } from "./fixture-helpers";

const fixtures = loadFixtures().filter((f) => !f.mockOnly);

describe.skipIf(!process.env.LIVE_LLM)("live LLM parse", () => {
  const llm = createLLM();
  for (const fx of fixtures) {
    it(`${fx.name}: ${fx.description}`, { timeout: 120_000 }, async () => {
      const outcome = await parseOrder(llm, { rawText: fx.raw, today: fx.today });
      const problems = compareOutcome(outcome, fx.expect);
      if (problems.length) console.log(fx.name, JSON.stringify(outcome, null, 2));
      expect(problems).toEqual([]);
    });
  }
});
