type Task04ServerEnvModule = typeof import("../../env/server");
type LoadOptions = Parameters<
  Task04ServerEnvModule["loadTask04SandboxEnv"]
>[0];

/**
 * Gives tests that expect a SUCCESSFUL environment load a controlled, minimal
 * environment instead of whatever the surrounding shell happens to carry.
 *
 * Such tests otherwise inherit the developer's real environment through
 * loadTask04SandboxEnv(), so an agent session, a CI runner, or any shell with
 * vendor credentials exported is correctly rejected by
 * assertEnvironmentIsAllowed() — turning a code-correctness test into a report
 * about the machine it ran on.
 *
 * The override redirects only the raw environment READ. It still calls the real
 * parseTask04SandboxEnv() with the real synthetic input record, so approval
 * window, expiry, and every other validation rule continue to be exercised for
 * real — including fail-closed behaviour, which callers drive by moving the
 * clock. Nothing is relaxed and no variable is mutated, so there is no
 * environment state to restore afterwards.
 *
 * Runtime contamination remains a separate concern, reported by
 * `npm run sandbox:verify-environment`.
 */
export function withControlledTask04Environment(
  actual: Task04ServerEnvModule,
): Task04ServerEnvModule {
  return {
    ...actual,
    loadTask04SandboxEnv: (options: LoadOptions = {}) =>
      actual.parseTask04SandboxEnv(
        actual.task04SyntheticEnvironmentInput(),
        options.now ?? new Date(),
        options,
      ),
  };
}
