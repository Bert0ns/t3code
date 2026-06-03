import {
  ProviderDriverKind,
  type AntigravitySettings,
  type ServerProviderModel,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as DateTime from "effect/DateTime";
import {
  buildServerProvider,
  providerModelsFromSettings,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import { createModelCapabilities } from "@t3tools/shared/model";

const PROVIDER = ProviderDriverKind.make("antigravity");
const ANTIGRAVITY_PRESENTATION = {
  displayName: "Antigravity",
  showInteractionModeToggle: false,
} as const;

const DEFAULT_MODEL_CAPABILITIES = createModelCapabilities({
  optionDescriptors: [],
});

export const makePendingAntigravityProvider = (
  settings: AntigravitySettings,
): Effect.Effect<ServerProviderDraft> =>
  Effect.gen(function* () {
    const checkedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
    const models = providerModelsFromSettings(
      [
        {
          slug: "antigravity/default",
          name: "Default Model",
          isCustom: false,
          capabilities: DEFAULT_MODEL_CAPABILITIES,
        },
      ],
      PROVIDER,
      settings.customModels,
      DEFAULT_MODEL_CAPABILITIES,
    );

    if (!settings.enabled) {
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: false,
        checkedAt,
        models,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "Antigravity is disabled in T3 Code settings.",
        },
      });
    }

    return buildServerProvider({
      presentation: ANTIGRAVITY_PRESENTATION,
      enabled: true,
      checkedAt,
      models,
      probe: {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message: "Antigravity provider status has not been checked in this session yet.",
      },
    });
  });

export const checkAntigravityProviderStatus = Effect.fn("checkAntigravityProviderStatus")(function* (
  settings: AntigravitySettings,
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
): Effect.fn.Return<ServerProviderDraft, never, never> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  const models = providerModelsFromSettings(
    [
      {
        slug: "antigravity/default",
        name: "Default Model",
        isCustom: false,
        capabilities: DEFAULT_MODEL_CAPABILITIES,
      },
    ],
    PROVIDER,
    settings.customModels,
    DEFAULT_MODEL_CAPABILITIES,
  );

  if (!settings.enabled) {
    return buildServerProvider({
      presentation: ANTIGRAVITY_PRESENTATION,
      enabled: false,
      checkedAt,
      models,
      probe: {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message: "Antigravity is disabled in T3 Code settings.",
      },
    });
  }

  // Stub probe result
  return buildServerProvider({
    presentation: ANTIGRAVITY_PRESENTATION,
    enabled: true,
    checkedAt,
    models,
    probe: {
      installed: true,
      version: "0.0.1",
      status: "ready",
      auth: {
        status: "authenticated",
        type: "antigravity",
      },
      message: "Antigravity provider is ready.",
    },
  });
});
