import type { AntigravitySettings } from "@t3tools/contracts";
import { TextGenerationError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import type { TextGenerationShape } from "./TextGeneration.ts";

export function makeAntigravityTextGeneration(
  settings: AntigravitySettings,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return Effect.gen(function* () {
    const textGeneration: TextGenerationShape = {
      generateCommitMessage: () => Effect.fail(new TextGenerationError({ operation: "generateCommitMessage", detail: "Not implemented" })),
      generatePrContent: () => Effect.fail(new TextGenerationError({ operation: "generatePrContent", detail: "Not implemented" })),
      generateBranchName: () => Effect.fail(new TextGenerationError({ operation: "generateBranchName", detail: "Not implemented" })),
      generateThreadTitle: () => Effect.fail(new TextGenerationError({ operation: "generateThreadTitle", detail: "Not implemented" })),
    };
    return textGeneration;
  });
}
