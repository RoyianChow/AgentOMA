import {
  assertNoExistingTestDbContainer,
  assertRunningTestDbEnvironment,
  TestDbEnvironmentError,
} from "../src/lib/db/test/docker-environment";

const phase = process.argv[2];

try {
  if (phase === "pre-start") {
    assertNoExistingTestDbContainer();
  } else if (phase === "running") {
    assertRunningTestDbEnvironment();
  } else {
    throw new TestDbEnvironmentError("COMPOSE_CONFIG_DENIED");
  }
  process.stdout.write(
    `${JSON.stringify({ control: "T02-04", phase, result: "PASS" })}\n`,
  );
} catch (error: unknown) {
  const safeMessage =
    error instanceof TestDbEnvironmentError
      ? error.message
      : "TEST_DB_ENVIRONMENT_DENIED:INSPECTION_DENIED";
  process.stderr.write(`${safeMessage}\n`);
  process.exitCode = 1;
}
