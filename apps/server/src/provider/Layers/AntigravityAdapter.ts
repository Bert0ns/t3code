import {
  ProviderDriverKind,
  type ProviderInstanceId,
  type AntigravitySettings,
  type ProviderRuntimeEvent,
  EventId,
  TurnId,
  RuntimeItemId,
  type ProviderSession,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import { type ProviderAdapterError, ProviderAdapterRequestError, ProviderAdapterProcessError } from "../Errors.ts";

const PROVIDER = ProviderDriverKind.make("antigravity");

export interface AntigravityAdapterLiveOptions {
  readonly instanceId?: ProviderInstanceId;
  readonly environment?: NodeJS.ProcessEnv;
}

import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import * as Queue from "effect/Queue";

export function makeAntigravityAdapter(
  settings: AntigravitySettings,
  options?: AntigravityAdapterLiveOptions,
) {
  return Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const eventQueue = yield* Queue.unbounded<ProviderRuntimeEvent>();

    const adapter: ProviderAdapterShape<ProviderAdapterError> = {
      provider: PROVIDER,
      capabilities: { sessionModelSwitch: "unsupported" },
      startSession: (input) => Effect.succeed({ threadId: input.threadId } as ProviderSession),
      sendTurn: (input) =>
        Effect.scoped(
          Effect.gen(function* () {
            const command = ChildProcess.make(
              settings.binaryPath || "agy",
              ["--print", input.input ?? ""],
              {
                env: options?.environment ?? process.env,
                cwd: process.cwd(),
              }
            );
            
            const child = yield* spawner.spawn(command).pipe(
              Effect.mapError(
                (cause) =>
                  new ProviderAdapterProcessError({
                    provider: PROVIDER,
                    threadId: input.threadId,
                    detail: "Failed to spawn agy process",
                    cause,
                  })
              )
            );

            const stdoutStream = child.stdout.pipe(
              Stream.decodeText(),
              Stream.runFold(() => "", (acc, chunk) => acc + chunk)
            );

            const [stdoutRaw] = yield* Effect.all(
              [
                stdoutStream.pipe(Effect.catch(() => Effect.succeed(""))),
                child.exitCode.pipe(Effect.catch(() => Effect.succeed(1))),
              ],
              { concurrency: "unbounded" }
            );

            const stdout = typeof stdoutRaw === "string" ? stdoutRaw : "";

            const turnId = TurnId.make("dummy-turn-id");

            if (stdout.trim().length > 0) {
              const now = yield* DateTime.now;
              yield* Queue.offer(eventQueue, {
                eventId: EventId.make("evt-1"),
                provider: PROVIDER,
                threadId: input.threadId,
                turnId: turnId,
                itemId: RuntimeItemId.make("item-1"),
                type: "content.delta",
                payload: {
                  streamKind: "assistant_text",
                  delta: stdout,
                },
                createdAt: DateTime.formatIso(now),
              } as ProviderRuntimeEvent);
            }

            return {
              threadId: input.threadId,
              turnId,
            };
          })
        ),
      interruptTurn: () => Effect.void,
      respondToRequest: () => Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method: "respondToRequest", detail: "Not implemented" })),
      respondToUserInput: () => Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method: "respondToUserInput", detail: "Not implemented" })),
      stopSession: () => Effect.void,
      listSessions: () => Effect.succeed([]),
      hasSession: () => Effect.succeed(false),
      readThread: () => Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method: "readThread", detail: "Not implemented" })),
      rollbackThread: () => Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method: "rollbackThread", detail: "Not implemented" })),
      stopAll: () => Effect.void,
      streamEvents: Stream.fromQueue(eventQueue),
    };
    return adapter;
  });
}
